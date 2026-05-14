<template>

  <!--在進度條周圍監聽mouseup、mousedown事件，輔助進度條狀態切換-->
  <div class="q-px-md"
      @mousedown.capture="onPanSlider('start')"
      @mouseup.capture="onPanSlider('end')"
  >
    <q-slider v-model="changeCurrentTime"
      @change="onChangeSlider"
      @pan="onPanSlider"
      :min="0" :max="duration" :step="0.01"
      label
      :label-value="formatSeconds(displayCurrentTime)"
      />
    <vue-plyr 
      ref="plyr"
      :hideControls="false"
      class="vue-plyr"
      :emit="['canplay', 'timeupdate', 'ended', 'seeked', 'playing', 'waiting', 'pause']" @canplay="onCanplay()"
      @timeupdate="onTimeupdate()"
      @ended="onEnded()"
      @seeked="onSeeked()"
      @playing="onPlaying()"
      @waiting="onWaiting()"
      @pause="onPause()"
    >
      <!--使用video元件來播放音訊和影片檔案，同時隱藏原生的vue-plyr元件，這裡的元件只會留下一個進度條的功能
      之所以用video，是因為video可以設定mp3等音訊檔案，也可以播放mp4等影片檔案，在播放影片的時候，還能夠用該video元素作為canvas繪製來源，
      反之，audio雖然可以播放video的音訊，但是將其作為canvas的繪製源，因此傾向於使用video來播放所有媒體元素-->
      <!--注意，這裡video設定了一個id，因為需要被其他元件通過document.querySelector方式進行查詢引用-->
      <video v-if="enableVideoSource" class="hide-in-global-page-for-pip" id="mediaVideo" crossorigin="anonymous" playsinline controls="controls" style="display: inline;">
        <source v-if="source" :src="source" />
      </video>
      <audio v-else crossorigin="anonymous">
        <source v-if="source" :src="source" />
      </audio>
    </vue-plyr>
  </div>
</template>

<script>
import Lyric from 'lrc-file-parser'
import { mapState, mapGetters, mapMutations } from 'vuex'
import NotifyMixin from '../mixins/Notification.js'
import { formatSeconds, basenameWithoutExt, audioLyricNameMatch, ServerApi, AILyricTaskStatus } from '../utils'
import { debounce } from 'quasar';

function convert_srt_vtt_to_lrc(text) {
  let lines = text.split("\n").map(l => l.trim())
  let isVtt = lines[0] == 'WEBVTT';
  if (isVtt) {
    lines = lines.slice(1)
  }

  const timeParseRe = /(\d*):(\d*):(\d*)(\.|,)(\d*)\s*-->\s*[\d:.]*/

  const parsingUnit = []; // [([minute, seconds, millseconds], '文字\n文字'), (), ..., ()]
  let i = 0;
  while(i < lines.length) {

    // 注意 srt 和 vtt 字幕的毫秒區分符號一個是`,'另一個是`.
    // audio.srt be like
    // 1
    // 00:01:22,343 --> 00:03:22,344
    // 字幕，字幕
    // 
    // 2
    // ...

    // audio.vtt be like
    // WEBVTT
    // 
    // 1
    // 00:01:22.343 --> 00:03:22.344
    // 字幕，字幕
    // 
    // 2
    // ...

    if (/^\d*$/.test(lines[i++])) { /* parse 序號 */
      if (timeParseRe.test(lines[i])) { /* parse 時間戳 */
        const [_/* whole string */ , h, m, s, _mill_sep /* ignore */, ms] = timeParseRe.exec(lines[i]).map(x => parseInt(x));
        let texts = [];
        i++;
        while(i < lines.length && lines[i] != "") { /* parse 文字，直到空行 */
          texts.push(lines[i++]);
        }
        parsingUnit.push([
          [h, m, s, ms],
          texts.join(' '),
        ]);
      }
    }
  } // parse srt vtt 完成

  function padding(n, len) {
    n = Math.ceil(n);
    let s = `${n}`;
    let pad = len - s.length;
    if (pad > 0) {
      for (let i = 0; i < pad; ++i) {
        s = "0" + s;
      }
    }
    return s;
  }

  function formatLrcTime([h, m, s, ms]) {
    return padding(h * m, 2) + ":" + padding(m, 2) + ":" + padding(s, 2) + "." + padding(ms, 3);
  }

  const lrcContent = parsingUnit.map(([time, text]) => `[${formatLrcTime(time)}] ${text}`).join("\n");
  return lrcContent;
}

export default {
  name: 'AudioElement',

  mixins: [NotifyMixin],

  data() {
    return {
      lrcContent: "",
      lrcObj: null,
      lrcAvailable: false,

      // 音訊播放器進度條實現有些trick，普通的slider不能直接用，
      // 因為time的更新源有兩個【audio播放】【使用者輸入】，
      // 兩個更新源回導致進度條跳轉出錯，需要在【使用者輸入時】關閉【audio播放】發出的time更新（slider上）
      isChangingCurrentTime: false,
      changeCurrentTime: 0,
    }
  },

  computed: {
    player () {
      return this.$refs.plyr.player
    },

    source () {
      // 從 LocalStorage 中讀取 token
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      // New API
      if (this.currentPlayingFile.mediaStreamUrl) {
        return `${this.currentPlayingFile.mediaStreamUrl}?token=${token}`
      } else if (this.currentPlayingFile.hash) {
        // Fallback to be compatible with old backend
        return `/api/media/stream/${this.currentPlayingFile.hash}?token=${token}`
      } else {
        return ""
      }
    },

    ...mapState('AudioPlayer', [
      'playing',
      'queue',
      'queueIndex',
      'playMode',
      'muted',
      'volume',
      'sleepTime',
      'sleepMode',
      'rewindSeekTime',
      'forwardSeekTime',
      'rewindSeekMode',
      'forwardSeekMode',
      'enableVisualizer',
      'resumeHistroySeconds',
      'playWorkId',
      'visualPlayerCoverUrl',
      'duration',
      'currentTime',
      'newCurrentTime',
      'enableVideoSource',
      'lyricOffsetSeconds',
      'enablePIPLyrics',
    ]),

    ...mapGetters('AudioPlayer', [
      'currentPlayingFile',
      'resumeHistroyDone',
    ]),

    displayCurrentTime() {
      if (this.isChangingCurrentTime) return this.changeCurrentTime;
      else return this.currentTime;
    }
  },

  watch: {
    playing (flag) {
      if (this.player.duration) {
        // 緩衝至可播放狀態
        flag ? this.player.play() : this.player.pause()
      }
      // this.playLrc(flag);
    },

    // watch source -> media.load() -> canPlay -> player.play()
    source (url) {
      if (url) {
        // 載入新音訊/影片檔案
        this.player.media.load();
        this.loadLrcFile();
        this.updateMediaSessionMetadata();
      }
    },

    muted (flag) {
      // 切換靜音狀態
      this.player.muted = flag
    },

    volume (val) {
      // 遮蔽非法數值
      if (val < 0 || val > 1) {
        return
      }

      // 調節音量
      this.player.volume = val
    },
    rewindSeekMode(rewind) {
      if (rewind) {
        this.player.rewind(this.rewindSeekTime);
        this.SET_REWIND_SEEK_MODE(false);
      }
    },
    forwardSeekMode(forward) {
      if (forward) {
        this.player.forward(this.forwardSeekTime);
        this.SET_FORWARD_SEEK_MODE(false);
      }
    },
    currentTime(v) {
      if (this.isChangingCurrentTime) return;
      else this.changeCurrentTime = this.currentTime;
    },
    newCurrentTime(v) {
      if (v < 0) return;
      this.player.currentTime = v;
      this.SET_NEW_CURRENT_TIME(-1); // 標記時間已經更新到media上了
    },
    lyricOffsetSeconds() {
      this.playLrc(this.playing); // 強制更新一下歌詞時間
    },
    enablePIPLyrics(enablePIP) {
      if (enablePIP) {
        this.playLrc(false)
      } else {
        this.playLrc(this.playing)
      }
    }
  },

  created() {
    this.debouncedPlayLrc = debounce(this.playLrc, 100, true /* 首次更改應當立即生效，對後續更改防抖動 */); // 防抖動
  },

  methods: {
    formatSeconds,

    /**
     * 當 外部暫停（線控暫停、軟體切換）、使用者控制暫停、seek 時會觸發本事件
     */
    onPause() {
      // console.log('onPause')
      this.playLrc(false)
      this.PAUSE()
    },
    /**
     * 當播放器真正開始播放時會觸發本事件
     */
    onPlaying() {
      // console.log('playing')
      this.playLrc(true)
      this.PLAY()
    },
    /**
     * 當播放器緩衝區空，被迫暫停載入時會觸發本事件
     */
    onWaiting() {
      // console.log('waiting')
      this.playLrc(false)
      this.PLAY()
    },
    ...mapMutations('AudioPlayer', [
      'SET_DURATION',
      'SET_CURRENT_TIME',
      'PAUSE',
      'PLAY',
      'SET_TRACK',
      'NEXT_TRACK',
      'PREVIOUS_TRACK',
      'SET_CURRENT_LYRIC',
      'SET_VOLUME',
      'CLEAR_SLEEP_MODE',
      'SET_REWIND_SEEK_MODE',
      'SET_FORWARD_SEEK_MODE',
      'SET_AUDIO_ANALYSER',
      'RESUME_HISTROY_SECONDS_DONE',
      'SET_HAS_LYRIC',
      'SET_NEW_CURRENT_TIME',
    ]),

    onCanplay () {
      // 緩衝至可播放狀態時觸發 (只有緩衝至可播放狀態, 才能獲取媒體檔案的播放時長)
      this.SET_DURATION(this.player.duration)

      // 播放
      if (this.playing && this.player.currentTime !== this.player.duration) {
        this.player.play()
      }

      // 當音訊檔案在網頁中載入完畢，可以播放時
      // 檢查此前是否有需要恢復的歷史進度，如果尚未恢復
      // 則設定currentTime到指定的時間點，然後標記已經恢復歷史播放記錄
      if (!this.resumeHistroyDone) {
        this.player.currentTime = this.resumeHistroySeconds;
        this.RESUME_HISTROY_SECONDS_DONE()
        this.$q.notify({message: "已恢復播放歷史", timeout: 1000})
      }
    },

    onTimeupdate () {
      // 當目前的播放位置已更改時觸發
      this.SET_CURRENT_TIME(this.player.currentTime)
      if (this.enablePIPLyrics) this.debouncedPlayLrc(false) // 開啟桌面歌詞後，用影片的time更新事件驅動歌詞更新，false表示停用掉LrcObject本身的事件更新
      if (this.sleepMode && this.sleepTime) {
        const currentTime = new Date()
        const currentHourStr = currentTime.getHours().toString().padStart(2, '0')
        const currentMinuteStr = currentTime.getMinutes().toString().padStart(2, '0')
        const sleepHourStr = this.sleepTime.match(/\d+/g)[0]
        const sleepMinuteStr = this.sleepTime.match(/\d+/g)[1]
        if (currentHourStr === sleepHourStr && currentMinuteStr === sleepMinuteStr) {
          this.PAUSE()
          this.CLEAR_SLEEP_MODE()
          // Persist sleep mode settings
          this.$q.sessionStorage.set('sleepTime', null)
          this.$q.sessionStorage.set('sleepMode', false)
        }
      }
    },

    onEnded () {
      // 當前檔案播放結束時觸發
      switch (this.playMode.name) {
        case "all repeat":
          // 迴圈播放
          if (this.queueIndex === this.queue.length - 1) {
            this.SET_TRACK(0)
          } else {
            this.NEXT_TRACK()
          }
          break
        case "repeat once":
          // 單曲迴圈
          this.player.currentTime = 0
          this.player.play()
          this.PLAY()
          break
        case "shuffle": {
          // 隨機播放
          const index = Math.floor(Math.random()*this.queue.length)
          this.SET_TRACK(index)
          if (index === this.queueIndex) {
            this.player.currentTime = 0
          }
          break
        }
        default:
          // 順序播放
          if (this.queueIndex === this.queue.length - 1) {
            this.PAUSE()
          } else {
            this.NEXT_TRACK()
          }
      }
    },

    onSeeked() {
      // if (this.lrcAvailable) {
      //   this.lrcObj.play(this.player.currentTime * 1000);
      //   if (!this.playing) {
      //     this.lrcObj.pause();
      //   }
      // }
      this.playLrc(this.playing);
    },


    playLrc (playStatus) {
      if (this.lrcAvailable) {
        if (playStatus) {
          this.lrcObj.play((this.player.currentTime + this.lyricOffsetSeconds) * 1000);
        } else {
          this.lrcObj.play((this.player.currentTime + this.lyricOffsetSeconds) * 1000); // update and pause lyric
          this.lrcObj.pause();
        }
      }
    },

    createLrcObj () {
        this.lrcObj = new Lyric({
          onPlay: (line, text) => {
            this.SET_CURRENT_LYRIC(text);
          },
        })
    },

    async loadLrcFile () {
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      const fileHash = this.queue[this.queueIndex].hash;
      const url = `/api/media/check-lrc/${fileHash}?token=${token}`;

      try {
        // 首先向伺服器查詢是否有歌詞
        const check_response = await this.$axios.get(url)
        if (!check_response.data.result) {
          // 無lrc歌詞，嘗試去查詢ai歌詞
          await this.tryLoadRemoteAILyric()
          return;
        }

        // 有lrc歌詞檔案
        this.lrcAvailable = true;
        console.log('讀入歌詞');
        const lrcUrl = `/api/media/stream/${check_response.data.hash}?token=${token}`;
        const lyricExtension = check_response.data.lyricExtension.toLowerCase();

        // 開始下載具體的lrc內容
        const response = await this.$axios.get(lrcUrl)
        console.log('歌詞讀入成功');
        console.log('srt convert to lrc');
        if (lyricExtension == ".srt" || lyricExtension == ".vtt") {
          response.data = convert_srt_vtt_to_lrc(response.data);
        }
        this.lrcObj.setLyric(response.data);
        this.lrcContent = response.data;
        this.lrcObj.play(this.player.currentTime * 1000);
        if (!this.playing) this.lrcObj.pause() // 載入歌詞後，觀察當前是否在播放音訊，如果沒有，則暫停歌詞滾動
        this.SET_HAS_LYRIC(true);
      } catch(error) {
        if (error.response) {
          // 請求已發出，但伺服器響應的狀態碼不在 2xx 範圍內
          if (error.response.status !== 401) {
            console.error(error);
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`);
          }
        } else {
          console.error(error)
          this.showErrNotif(error.message || error);
        }
        this.SET_HAS_LYRIC(false);
      }
    },

    resetToNoLyricStatus() {
      // 無歌詞檔案
      this.lrcAvailable = false;
      this.lrcObj.setLyric('');
      this.lrcContent = '';
      this.SET_CURRENT_LYRIC('');
      this.SET_HAS_LYRIC(false);
    },

    async loadRemoteAILyricTaskId(aiTaskId) {
      const lrcContent = await ServerApi.downloadLrc(aiTaskId)
      this.lrcAvailable = true;
      this.lrcObj.setLyric(lrcContent);
      this.lrcContent = lrcContent;
      this.lrcObj.play(this.player.currentTime * 1000);
      if (!this.playing) this.lrcObj.pause() // 載入歌詞後，觀察當前是否在播放音訊，如果沒有，則暫停歌詞滾動
      this.SET_HAS_LYRIC(true);
    },

    async tryLoadRemoteAILyric() {
      const workId = parseInt(this.currentPlayingFile.hash.replace(/\/.*/, "")); // 通過hash獲取該檔案對應的workId，返回number型別
      const audioFileName = basenameWithoutExt(this.currentPlayingFile.title);

      let tasks = [];
      let useLooseLyric = false; // 寬鬆的歌詞匹配策略
      try {
        do {
          console.log("搜尋ai歌詞，第一階段，嚴格匹配workId和檔案title")
          tasks = await ServerApi.searchWorkTask(workId, audioFileName);
          tasks = tasks.filter(t => t.status == AILyricTaskStatus.SUCCESS)
          useLooseLyric = false;
          if (tasks.length >= 1) break;

          console.log("搜尋ai歌詞，第二階段，查詢workId作品內所有歌詞")
          tasks = await ServerApi.searchWorkTask(workId);
          tasks = tasks.filter((t) => t.status == AILyricTaskStatus.SUCCESS && audioLyricNameMatch(audioFileName, t.fileName))
          useLooseLyric = true;
          break;

        /*eslint-disable no-constant-condition*/
        } while(0);

      } catch(e) {
        console.log("查詢ai歌詞失敗: ", e)
      }

      if (tasks.length >= 1) {
        console.log(`  已找到ai歌詞記錄${tasks.length}個`)
        
        console.log(`  載入第一個歌詞記錄，id = ${tasks[0].id}`)
        await this.loadRemoteAILyricTaskId(tasks[0].id)
        if (useLooseLyric) {
          this.$q.notify({message: "使用寬鬆的歌詞匹配策略", timeout: 2000})
        }
      } else {
        console.warn("沒有找到ai歌詞")
        this.resetToNoLyricStatus(); // 沒有找到ai歌詞的話，則必然先沒有本地歌詞，清空歌詞狀態
      }
    },

    updateMediaSessionMetadata() {
      console.log("try update media session")
      try {
        if (this.playWorkId == 0) {
          navigator.mediaSession.metadata = null;
        } else {
          navigator.mediaSession.metadata = new window.MediaMetadata({
            title: this.currentPlayingFile.title,
            artist: "",
            album: this.currentPlayingFile.workTitle,
            // artwork: this.visualPlayerCoverUrl,
            artwork: [
              // {
              //   src: this.genCoverUrl(this.playWorkId, "visualPlayerCover"), // 影像太大，safari上有時會出現載入失敗的問題
              //   sizes: "600x600", // 隨便寫的尺寸
              //   type: "image/jpg",
              // },
              {
                src: this.genCoverUrl(this.playWorkId, "main"),
                sizes: "560x560",
                type: "image/jpeg",
              },
              {
                src: this.genCoverUrl(this.playWorkId, "240x240"),
                sizes: "240x240",
                type: "image/jpeg",
              },
              {
                src: this.genCoverUrl(this.playWorkId, "sam"),
                sizes: "100x100",
                type: "image/jpeg",
              },
            ]
          })
        }
      } catch (e) {
        console.warn("set mediasession failed, because: ", e)
      }
    },

    // type: in 'visualPlayerCover', 'main', 'sam', '240x240', # warning '360x360' is almost not exist in dlsite, do not use 360x360
    // 'visualPlayerCover' 預設是 'main'，如果使用者有手動設定過視覺化封面的話，則使用使用者設定過的那個圖片
    genCoverUrl(workId, type) {
      const token = this.$q.localStorage.getItem('jwt-token') || ''

      if (type == "visualPlayerCover") {
        return this.visualPlayerCoverUrl
          ? `${this.visualPlayerCoverUrl}?token=${token}`
          : ""
      } else if (workId != 0) {
        return `/api/cover/${workId}?type=${type}&token=${token}`
      } else {
        return ""
      }
    },

    onChangeSlider(v) {
      console.log("player current time is ", this.player.currentTime)
      console.log("slider change value to ", v)
      console.log("global current time is ", this.currentTime)
      this.player.currentTime = v;
    },
     onPanSlider(phase) {
      console.warn(" pan with phase = ", phase)
      if (phase == 'start') {
        this.isChangingCurrentTime = true;
        this.changeCurrentTime = this.currentTime;
      } else {
        // 延時一下，避免音訊狀態的值立即被更新到slider上
        setTimeout(() => {
          this.isChangingCurrentTime = false;
        }, 100);
      }
     },
  },

  mounted () {
    // 初始化音量
    this.SET_VOLUME(this.player.volume);

    const initAudio = () => {
      document.removeEventListener('click', initAudio);
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = {
        left: audioCtx.createAnalyser(),
        right: audioCtx.createAnalyser(),
        audioCtx,
        splitter: null,
        merger: null,
        audioSrc: null,
      };

      analyser.audioSrc = audioCtx.createMediaElementSource(this.player.media);
      analyser.splitter = audioCtx.createChannelSplitter(2);
      analyser.merger = audioCtx.createChannelMerger(2);
      analyser.audioSrc.connect(analyser.splitter);
      analyser.splitter.connect(analyser.left, 0);
      analyser.splitter.connect(analyser.right, 1);
      analyser.audioSrc.connect(audioCtx.destination)
      this.SET_AUDIO_ANALYSER(analyser)
    }

    if (this.enableVisualizer) {
      document.addEventListener('click', initAudio);
      if (this.$q.platform.is.safari && this.$q.platform.is.mobile) {
        this.$q.notify({
          message: "監測到safari平臺上開啟了音訊視覺化功能，注意移動端safari有bug，如果沒有聲音的話，請關閉音訊視覺化功能",
          timeout: 5000
        })
      }
    }

    this.createLrcObj();
    if (this.source) {
      this.loadLrcFile();
    }
  },
}
</script>

<style scoped>
.vue-plyr {
  /* visibility: hidden; */
  /*display: none;*/
  width: 1px;
    height: 1px;
    overflow: hidden;
    top: 0px;
    left: 0px;
    position: absolute;
}

</style>
