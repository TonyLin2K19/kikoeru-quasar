<template>
  <div>

    <!-- 播放器 -->
    <div>
      <q-card 
        class="fixed-bottom-right box-shadow audio-player" 
        @mousewheel.prevent 
        @touchmove.prevent
        color="primary"
        :class="{showStyle: showAudioPlayer, hideStyle: !showAudioPlayer}"
        :style="{'--cover-url': `url(${coverUrl})`}"
      >
        <!--頂部小橫條-->
        <div class="pull-handler" @click="toggleHide" v-touch-swipe.mouse.down="toggleHide"></div>

        <!-- 音聲封面 -->
        <div class="row items-center albumart q-mt-lg q-pa-sm relative-position flippable-cover-container non-selectable"
          v-touch-swipe.mouse="onCoverSwipe"
        >
          <q-img
            contain
            class="rounded-borders box-shadow flippable-cover cover-img"
            :class="{
              'flip-on-front': !isFlipCover,
              'flip-on-back': isFlipCover,
            }"
            :img-style="{
              transition: 'opacity 1s, filter 1s',
              filter: isFlipCover ? 'brightness(0.1) grayscale(80%)' : 'brightness(1) grayscale(0%)',
              'backface-visibility': 'hidden',
            }"
            transition="fade"
            :src="coverUrl"
            :ratio="4/3"
            @dblclick.prevent="openWorkDetail()"
          >
          <AudioEqualizer class="equalizer rounded-borders box-shadow flip-on-back"
            :disable="!isFlipCover"
            :style="{
              transition: 'all 1s',
              opacity: isFlipCover ? 1 : 0,
            }"
             />
          </q-img>

        </div>

        <!-- 設定選單 -->
        <div class="row justify-between q-mr-sm q-my-sm">
          <!-- 頂在前面 -->
            <!-- 曲目列表 -->
            <q-btn 
              flat 
              dense 
              size="md" 
              padding="none sm" 
              icon="queue_music" 
              @click="showCurrentPlayList = !showCurrentPlayList" 
            >
              <q-tooltip anchor="top middle" self="bottom middle">
                切換曲目
              </q-tooltip>
            </q-btn>

            <!--影片畫中畫-->
            <q-btn 
              v-if="enableVideoSource && isCurrentPlayingFileVideo" 
              dense 
              size="md" 
              padding="none sm" 
              :flat="!enableVideoSourcePIP"
              :outline="enableVideoSourcePIP"
              icon="picture_in_picture_alt" 
              @click="onSetEnableVideoSourcePIP(!enableVideoSourcePIP)" 
            >
            <q-tooltip anchor="top middle" self="bottom middle">
              影片畫中畫
            </q-tooltip>
            </q-btn>

            <!--畫中畫歌詞-->
            <q-btn 
              v-if="hasLyric || enablePIPLyrics" 
              dense 
              size="md" 
              padding="none sm"
              :flat="!enablePIPLyrics"
              :outline="enablePIPLyrics"
              icon="picture_in_picture" 
              @click="setPIPLyrics" 
            >
              <q-tooltip anchor="top middle" self="bottom middle">
                桌面歌詞
              </q-tooltip>
            </q-btn>

            <!--播放順序切換-->
            <q-btn 
              flat 
              dense 
              size="md" 
              padding="none sm" 
              :icon="playModeIcon" 
              @click="changePlayMode()" 
            >
              <q-tooltip anchor="top middle" self="bottom middle">
                {{ playModeString }}
              </q-tooltip>
            </q-btn>

            <!--大螢幕-->
            <q-btn 
              flat 
              dense 
              size="md" 
              padding="none sm" 
              icon="fullscreen" 
              @click="gotoFullScreenPlayer"
            >
              <q-tooltip anchor="top middle" self="bottom middle">
                網頁全屏
              </q-tooltip>
            </q-btn>

            <!--equalizer-->
            <q-btn 
              v-if="enableVisualizer"
              flat 
              dense 
              size="md" 
              padding="none sm" 
              icon="equalizer" 
              @click="flipCover"
            >
              <q-tooltip anchor="top middle" self="bottom middle">
                音效均衡器
              </q-tooltip>
            </q-btn>

          <!-- 放在尾部 -->
            <q-btn
              flat 
              dense
              size="md"
              padding="none sm"
              icon="more_horiz"
            >
              <q-tooltip anchor="top middle" self="bottom middle">
                更多播放設定
              </q-tooltip>
              <q-menu anchor="bottom right" self="top right">
                <q-item clickable v-ripple @click="hideSeekButton = !hideSeekButton">
                  <q-item-section avatar>
                    <q-icon :name="hideSeekButton ? 'done' : ''" />
                  </q-item-section>

                  <q-item-section>
                    隱藏封面按鈕
                  </q-item-section>
                </q-item>
                
                <q-item clickable v-ripple @click="toggleSwapSeekButton">
                  <q-item-section avatar>
                    <q-icon :name="swapSeekButton ? 'done' : ''" />
                  </q-item-section>
                  <q-item-section>
                    交換進度按鈕與切換按鈕
                  </q-item-section>
                </q-item>
                
                <q-item clickable v-ripple @click="openWorkDetail()" v-close-popup>
                  <q-item-section avatar>
                    <!-- placeholder -->
                  </q-item-section>
                  <q-item-section>
                    開啟作品詳情（或雙擊封面）
                  </q-item-section>
                </q-item>
                
                <q-item clickable v-ripple @click="toggleEnableVisualizer">
                  <q-item-section avatar>
                    <q-icon :name="enableVisualizer ? 'done' : ''" />
                  </q-item-section>
                  <q-item-section>
                    開啟音訊視覺化（需要重新整理頁面）
                  </q-item-section>
                </q-item>
                
                <q-item clickable v-ripple @click="onToggleVideoSource">
                  <q-item-section avatar>
                    <q-icon :name="enableVideoSource ? 'done' : ''" />
                  </q-item-section>
                  <q-item-section>
                    影片源繪製功能（需要重新整理頁面）
                  </q-item-section>
                </q-item>

                <q-item v-if="hasLyric">
                  <q-item-section>
                    <q-input
                      v-if="hasLyric"
                      :value="lyricOffsetSeconds"
                      @input="lyricOffsetChange"
                      type="number"
                      prefix="歌詞偏移"
                      suffix="s"
                      style="max-width: 100%;"
                      outlined
                      clearable
                      input-style="text-align: right;"
                    >
                      <template slot="before">
                          <q-btn size="sm" padding="md xs" icon="sync_alt" @click="lyricSyncDialog = true"></q-btn>
                      </template>
                      <template slot="append">
                        <div class="column">
                          <q-btn
                            size="xs"
                            icon="arrow_drop_up"
                            @click="lyricOffsetChange(lyricOffsetSeconds + 0.1)"
                          ></q-btn>
                          <q-btn
                            size="xs"
                            icon="arrow_drop_down"
                            @click="lyricOffsetChange(lyricOffsetSeconds - 0.1)"
                          ></q-btn>
                        </div>
                      </template>
                    </q-input>
                  </q-item-section>
                </q-item>
              </q-menu>
            </q-btn>
        </div>

        <!-- 進度條控制元件 -->
        <div class="row items-center q-mx-sm q-mb-sm non-selectable">
          <div class="col-auto relative-position">{{ formatSeconds(currentTime) }}</div>
          <AudioElement class="col" />
          <div class="col-auto relative-position">{{ formatSeconds(duration) }}</div>
        </div>

        <!-- Place holder for iOS -->
        <div style="height: 5px" v-if="$q.platform.is.ios" />

        <!-- 標題 -->
        <div class="column text-center non-selectable ">
          <Scrollable class="full-width" :stop="hide" name="audioTitle">
            <span class="audio-name relative-position q-px-md">{{ currentPlayingFile.title }}</span>
          </Scrollable>
          <Scrollable class="full-width" :stop="hide" name="workTitle">
            <span class="work-name relative-position q-px-md">{{ currentPlayingFile.workTitle }}</span>
          </Scrollable>
        </div>

        <!-- Place holder for iOS -->
        <div  style="height: 10px" v-if="$q.platform.is.ios" />

        <!-- 播放按鈕控制元件 -->
        <div class="row justify-around" style="height: 65px">
          <q-btn flat dense class="col-auto" size="lg"   icon="skip_previous" @click="previousTrack()" style="width: 55px" />
          <q-btn flat dense class="col-auto" size="lg"   :icon="rewindIcon" @click="rewind(true)" style="width: 55px" />
          <q-btn flat dense class="col-auto" size="28px" :icon="playingIcon" @click="togglePlaying()" style="width: 65px" />
          <q-btn flat dense class="col-auto" size="lg"   :icon="forwardIcon" @click="forward(true)" style="width: 55px" />
          <q-btn flat dense class="col-auto" size="lg"   icon="skip_next" @click="nextTrack()" style="width: 55px" />
        </div>

        <!-- 音量控制元件 -->
        <!-- HTML5 volume in iOS is read-only -->
        <div class="row items-center q-mx-lg" style="height: 50px" v-if="!$q.platform.is.ios">
          <q-icon name="volume_down" size="sm" class="col-auto" />
          <q-slider v-model="volume" :min="0" :max="1" :step="0.01" class="col q-mx-md"/>
          <q-icon name="volume_up" size="sm" class="col-auto" />
        </div>
      </q-card>
    </div>

    <!-- 當前播放列表 -->
    <q-dialog v-model="showCurrentPlayList">
      <q-card class="current-play-list">
        <!-- 操作當前播放列表的控制按鈕 -->
        <div class="row" style="padding: 5px; height: 45px;">
          <q-btn dense round size="md" icon="edit" color="primary" @click="editCurrentPlayList = !editCurrentPlayList" style="height: 35px; width: 35px;" class="col-auto" />
          <q-btn dense round size="md" icon="save" color="teal" style="height: 35px; width: 35px;" class="col-auto q-mx-sm" />
          <q-space />
          <q-btn dense round size="md" icon="delete_forever" color="red" @click="emptyQueue()" style="height: 35px; width: 35px;" class="col-auto" />
        </div>
        
        <q-separator />

        <!-- 音訊檔案列表 -->
        <q-list style="max-height: 450px" class="scroll">
          <draggable
            handle=".handle"
            v-model="queueCopy"
            @change="val => onMoved(val.moved)"
          >
            <q-item
              clickable
              v-ripple
              v-for="(track, index) in queueCopy"
              :key="index"
              :active="queueIndex === index"
              active-class="text-white bg-teal"
              class="non-selectable"
              style="padding: 0px 10px;"
              @click="onClickTrack(index)"
            >
              <q-item-section side v-show="editCurrentPlayList">
                <q-icon name="clear" :color="queueIndex === index ? 'white' : 'red'" @click="removeFromQueue(index)" />
              </q-item-section>

              <q-item-section avatar>
                <q-img transition="fade" :src="samCoverUrl(track.hash)" style="height: 38px; width: 38px" class="rounded-borders" />
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ track.title }}</q-item-label>
                <q-item-label caption lines="1">{{ track.workTitle }}</q-item-label>
              </q-item-section>

              <q-item-section side class="handle" v-show="editCurrentPlayList">
                <q-icon name="reorder" :color="queueIndex === index ? 'white' : 'dark'" />
              </q-item-section>
            </q-item>
          </draggable>
        </q-list>
      </q-card>
    </q-dialog>

    <q-dialog v-model="lyricSyncDialog"  seamless position="top">
      <q-card class="bg-primary text-white">
        <q-card-section>
          <div class="text-h6">歌詞同步輔助工具</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          這是一個輔助計算歌詞偏移量的工具，當音訊和歌詞的時間出現不同步的時候，使用此工具來計算修復的歌詞偏移量。
          請在正常播放狀態下播放音訊和歌詞，從聲音和歌詞中找到一個關鍵點A，對應聲音A和歌詞A，
          判斷先聽到聲音還是先看到歌詞，當其中一個出現時，點選下方對應的按鈕，接著在另一個元素出現時再次點選一次按鈕。
          這裡將會計算兩次點選之間的時間差，點選“應用偏移量”即可立即剛才兩次點選的時間差作為歌詞偏移量。
        </q-card-section>

        <q-card-section v-if="fixState === 'ready'">
          <q-btn @click="startFixLyricSync('lyric')">歌詞先出現了</q-btn>
          <q-btn @click="startFixLyricSync('audio')">先聽到了聲音</q-btn>
        </q-card-section>

        <q-card-section v-if="fixState === 'measure'">
          <q-btn @click="stopFixLyricSync">{{ fixWhoStartFirst == "audio" ? "歌詞這個時候出現了" : "這個時候才聽到了聲音" }}</q-btn>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn @click="lyricSyncDialog = false">關閉</q-btn>
          <q-btn v-if="fixState !== 'ready'" @click="fixState = 'ready'" >重新計量偏移量</q-btn>
          <q-btn v-if="fixState === 'done'" @click="fixApply">應用偏移量 {{ showDeltaSeconds }}</q-btn>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import draggable from 'vuedraggable'
import AudioElement from 'components/AudioElement'
import Scrollable from 'components/Scrollable'
import AudioEqualizer from 'components/AudioEqualizer'
import { mapState, mapGetters, mapMutations } from 'vuex'
import { formatSeconds } from '../utils'
import { debounce } from 'quasar'

export default {
  name: 'AudioPlayer',

  components: {
    draggable,
    AudioElement,
    Scrollable,
    AudioEqualizer,
  },

  data () {
    return {
      showCurrentPlayList: false,
      editCurrentPlayList: false,
      queueCopy: [],
      hideSeekButton: false,
      isAndroid: navigator.userAgent.toLowerCase().indexOf('android') > -1,
      histroyCheckIntervalId: -1,
      latestUpdatedHistory: null, // 記錄最近一次更新的歷史記錄，防止反覆對同一個播放歷史進行遠端資料更新

      isFlipCover: false, // 是否反轉封面顯示其他內容

      // 歌詞偏移量修復工具
      lyricSyncDialog: false,
      fixState: "ready",  // ready: 準備開始, measure: 計時進行中, done: 計時完成
      fixWhoStartFirst: "", // "audio", "lyric" // 先看到的歌詞，還是先聽到的聲音
      fixStartMills: 0,
      fixStopMills: 0,
    }
  },

  mounted () {
    if (this.$q.localStorage.has('hideSeekButton')) {
      this.hideSeekButton = this.$q.localStorage.getItem('hideSeekButton')
    }
    this.histroyCheckIntervalId = setInterval(() => {
      this.onUpdatePlayingStatus()
    }, 60 * 1000) // 每隔一段時間更新一次播放記錄

    if (this.$q.platform.is.desktop) {
      window.addEventListener('keydown', this.onKeyDown);
    }
  },

  beforeDestroy() {
    if (this.$q.platform.is.desktop) {
      window.removeEventListener('keydown', this.onKeyDown);
    }
    clearInterval(this.histroyCheckIntervalId)

    // 原本是想要在關閉視窗時，更新最後一次播放歷史
    // 但是實際測試下來，關閉視窗時根本沒有來得及傳送最後一次更新訊息，於是放棄這個方案
    // this.onUpdatePlayingStatus()
  },

  watch: {
    queue (val) {
      this.queueCopy = val.concat()
      // 在刪除最後一個 track 時關閉當前播放列表
      if (this.queueCopy.length === 0) {
        this.showCurrentPlayList = false
      } else {
        // 播放列表發生變化，且更新後不為空的情況下
        // 更新播放歷史
        this.onUpdatePlayingStatus()
      }
    },

    queueIndex() {
      // 當前播放序號發生變化時更新歷史
      this.onUpdatePlayingStatus()
    },

    showCurrentPlayList (flag) {
      // 關閉當前播放列表後，重置 editCurrentPlayList 狀態為 false
      if (flag === false) {
        this.editCurrentPlayList = false
      }
    },

    hideSeekButton (option) {
      this.$q.localStorage.set('hideSeekButton', option)
    },

    playing() {
      this.onUpdatePlayingStatus()
    },

    // 監聽 前進、後退 進度條時間，
    // 當 ***SeekMode 變為false，表明進度條跳轉已經完成
    rewindSeekMode(v) {
      if (!v) {
        // 當用戶前進後退時，currentTime可能並沒有立即從audio元素中反饋到vue狀態裡，
        // 因此這裡需要延遲一小會，等待audio前進後退之後的更新時間抵達vue的currentTime狀態，
        // 然後再去更新播放歷史
        setTimeout(() => {
          this.onUpdatePlayingStatus()
        }, 100) 
      }
    },
    forwardSeekMode(v) {
      if (!v) {
        // 當用戶前進後退時，currentTime可能並沒有立即從audio元素中反饋到vue狀態裡，
        // 因此這裡需要延遲一小會，等待audio前進後退之後的更新時間抵達vue的currentTime狀態，
        // 然後再去更新播放歷史
        setTimeout(() => {
          this.onUpdatePlayingStatus()
        }, 100)
      }
    },
    currentTime() {
      if (!this.playing) {
        // 暫停狀態下切換時間，也更新播放歷史
        this.onUpdatePlayingStatus()
      }
    },
    enableVisualizer() {
      this.suggestRefreshPage();
    },
    enableVideoSource() {
      this.suggestRefreshPage();
    },
    lyricSyncDialog() {
      this.fixState = 'ready';
    }
  },

  computed: {
    showAudioPlayer () {
      return this.currentPlayingFile.hash && !this.hide;
    },

    coverUrl () {
      // 從 LocalStorage 中讀取 token
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      const hash = this.currentPlayingFile.hash
      return hash ? `/api/cover/${hash.split('/')[0]}?token=${token}` : ""
    },

    workDetailUrl () {
      const hash = this.currentPlayingFile.hash
      return hash ? `/work/${hash.split('/')[0]}` : ""
    },

    volume: {
      get () {
        return this.$store.state.AudioPlayer.volume
      },
      set (val) {
        this.SET_VOLUME(val)
      }
    },

    queue: {
      get () {
        return this.$store.state.AudioPlayer.queue
      },
      set () {}
    },

    playModeIcon () {
      switch (this.playMode.name) {
        case "all repeat":
          return "repeat"
        case "repeat once":
          return "repeat_one"
        case "shuffle":
          return "shuffle"
        default:
          return "playlist_play"
      }
    },

    playModeString () {
      switch (this.playMode.name) {
        case "all repeat":
          return "全部"
        case "repeat once":
          return "單曲迴圈"
        case "shuffle":
          return "隨機"
        default:
          return "列表播放"
      }
    },

    playingIcon () {
      return this.playing ? "pause" : "play_arrow"
    },

    rewindIcon () {
      switch (this.rewindSeekTime) {
        case 5:
          return 'replay_5'
        case 10:
          return 'replay_10'
        case 30:
          return 'replay_30'
        default:
          return 'replay_5'
      }
    },

    forwardIcon () {
      switch (this.forwardSeekTime) {
        case 5:
          return 'forward_5'
        case 10:
          return 'forward_10'
        case 30:
          return 'forward_30'
        default:
          return 'forward_5'
      }
    },

    fixDeltaMills() {
      // 音訊先出現的話，需要將offset增加，使得歌詞提前出現
      let sign = this.fixWhoStartFirst == 'audio' ? +1 : -1;
      return sign * (this.fixStopMills - this.fixStartMills);
    },
    showDeltaSeconds() {
      const epsilon = 1;
      if (Math.abs(this.fixDeltaMills) < epsilon) return ""
      return `${this.fixDeltaMills > 0 ? '+': ''}${(this.fixDeltaMills/1000).toFixed(2)}s`;
    },

    ...mapState('AudioPlayer', [
      'playing',
      'hide',
      'currentTime',
      'duration',
      'queueIndex',
      'playMode',
      'rewindSeekTime',
      'forwardSeekTime',
      'swapSeekButton',
      'enableVisualizer',
      'enableVideoSource',
      'enableVideoSourcePIP',
      'enablePIPLyrics',
      'playWorkId',
      'rewindSeekMode',
      'forwardSeekMode',
      'hasLyric',
      'lyricOffsetSeconds',
    ]),
    
    ...mapGetters('AudioPlayer', [
      'currentPlayingFile',
      'resumeHistroyDone',
      'isCurrentPlayingFileVideo',
    ])
  },

  methods: {
    formatSeconds,

    startFixLyricSync(whoStartFirst) {
      this.fixState = "measure";
      this.fixWhoStartFirst = whoStartFirst;
      this.fixStartMills = this.fixStopMills = performance.now();
    },

    stopFixLyricSync() {
      this.fixState = "done"; // 計時結束，重製狀態
      this.fixStopMills = performance.now();
    },

    fixApply() {
      this.lyricOffsetChange(this.fixDeltaMills / 1000);
      this.lyricSyncDialog = false;
      this.fixState = "ready";
      this.$q.notify({message: `歌詞偏移量(${this.fixDeltaMills/1000}s)已應用`, timeout: 500})
    },

    ...mapMutations('AudioPlayer', {
      toggleHide: 'TOGGLE_HIDE',
      togglePlaying: 'TOGGLE_PLAYING',
      nextTrack: 'NEXT_TRACK',
      previousTrack: 'PREVIOUS_TRACK',
      changePlayMode: 'CHANGE_PLAY_MODE',
      setVolume: 'SET_VOLUME',
      rewind: 'SET_REWIND_SEEK_MODE',
      forward: 'SET_FORWARD_SEEK_MODE',
      toggleSwapSeekButton: 'TOGGLE_SWAP_SEEK_BUTTON',
      toggleEnableVisualizer: 'TOGGLE_ENABLE_VISUALIZER',
      toggleEnableVideoSource: 'TOGGLE_ENABLE_VIDEO_SOURCE',
      setEnableVideoSourcePIP: 'SET_ENABLE_VIDEO_SOURCE_PIP',
      setEnablePIPLyrics: 'SET_ENABLE_PIP_LYRICS',
      setLyricOffsetSeconds: 'SET_LYRIC_OFFSET_SECONDS',
    }),
    ...mapMutations('AudioPlayer', [
      'SET_TRACK',
      'SET_QUEUE',
      'REMOVE_FROM_QUEUE',
      'EMPTY_QUEUE',
      'SET_VOLUME',
    ]),

    samCoverUrl (hash) {
      // 從 LocalStorage 中讀取 token
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      return hash ? `/api/cover/${hash.split('/')[0]}?type=sam&token=${token}` : ""
    },

    onClickTrack (index) {
      if (!this.editCurrentPlayList) {
        this.SET_TRACK(index)
        this.showCurrentPlayList = false
      }
    },

    onMoved(moved) {
      let index = null
      if (moved.oldIndex === this.queueIndex) {
        index = moved.newIndex
      } else if (moved.oldIndex < this.queueIndex && moved.newIndex >= this.queueIndex) {
        index = this.queueIndex - 1
      } else if (moved.oldIndex > this.queueIndex && moved.newIndex <= this.queueIndex) {
        index = this.queueIndex + 1
      } else {
        index = this.queueIndex
      }
   
      this.SET_QUEUE({
        queue: this.queueCopy.concat(),
        index: index,
        resetPlaying: false
      })
    },

    removeFromQueue (index) {
      this.REMOVE_FROM_QUEUE(index)
    },

    emptyQueue () {
      this.EMPTY_QUEUE()
    },

    onCoverSwipe(evt) {
      switch(evt.direction) {
        case 'left':
        case 'right':
          this.flipCover();
          break;
        case 'down':
          this.toggleHide();
      }
    },

    openWorkDetail () {
      if (this.workDetailUrl && this.$route.path !== this.workDetailUrl) {
        this.$router.push(this.workDetailUrl)
      }
      if (this.$q.screen.lt.sm) {
          this.toggleHide()
      }
    },

    setPIPLyrics() {
      if (!this.enablePIPLyrics) {
        this.$q.notify({message: "建立桌面歌片語件中，請稍等...", timeout: 500})
      }
      this.setEnablePIPLyrics(!this.enablePIPLyrics)
    },
    
    // return true if two history updated on (onUpdatePlayingStatus) is same
    isSameTwoHistory(ha, hb) {
      // 如果有任意一個是null，則認為兩者不一樣
      if (!(ha && hb)) return false;
      
      if (ha.work_id != hb.work_id) return false;
      if (ha.state.seconds != hb.state.seconds) return false;
      if (ha.state.index != hb.state.index) return false;
      if (ha.state.queue.length != hb.state.queue.length) return false;
      for (let i = 0; i < ha.state.queue.length; ++i) {
        if (ha.state.queue[i].hash != hb.state.queue[i].hash) return false;
      }
      return true;
    },
    
    onUpdatePlayingStatus() {
      // 當前播放列表為空，禁止記錄播放歷史
      if (this.queueCopy.length <= 0) return;

      // 尚處於恢復歷史記錄的階段，為了避免此時將空狀態寫入遠端伺服器覆蓋有效狀態，跳過本次歷史更新
      if (!this.resumeHistroyDone) {
        console.log("尚處於恢復歷史記錄的狀態，跳過本次歷史更新")
        return
      }

      const data = {
        "work_id": this.playWorkId,
        "state": {
          queue: this.queueCopy,
          index: this.queueIndex,
          seconds: this.currentTime,
        }
      }

      // 檢查最近一次的歷史更新記錄，如果兩次資料不變，則無需更新記錄
      if (this.isSameTwoHistory(this.latestUpdatedHistory, data)) {
        console.log("播放狀態未變，跳過伺服器歷史更新")
        return
      }

      this.$axios.put('/api/histroy', data)
        .then((_) => {
          console.log("更新播放狀態成功")
          this.latestUpdatedHistory = data;
        })
        .catch((err) => {
          console.error(err.response.data.error)
        })
    },

    // 中轉一道這個設定，加一些使用者提示
    onToggleVideoSource() {

      // 如果是關閉的話，直接關掉，無需使用者提示
      if (this.enableVideoSource) {
        this.toggleEnableVideoSource();
        return;
      }

      // 開啟的話，需要提示一些使用者資訊
      this.$q.dialog({
        title: '注意',
        message: '開啟影片源繪製功能會增加效能開銷，移動裝置上可能會發熱嚴重，請謹慎選擇。此外，在iOS safari系統中，safari會強制將頁面中正在播放的影片元素設定為畫中畫模式，無法規避，建議iOS safari環境下關閉此項功能',
        cancel: true,
      }).onOk(() => {
        this.toggleEnableVideoSource()
      }).onCancel(() => {})
    },

    onSetEnableVideoSourcePIP(enable) {
      this.setEnableVideoSourcePIP(enable)

      const video = document.querySelector("#mediaVideo") // 全域性id獲取對應的video元素，因為safari進入pip模式需要在使用者動作回撥中執行，實在是沒法跨元件做這個，這裡hack一下
      const isAlreadyInPIP = document.pictureInPictureElement === video
      if (enable && !isAlreadyInPIP) {
        if (
          typeof video.requestPictureInPicture === 'function' &&
          document.pictureInPictureEnabled
        ) {
          video.requestPictureInPicture().then(() => {
            video.addEventListener('leavepictureinpicture', () => {
              if (this.playing) this.player.play()
              this.setEnableVideoSourcePIP(false)
            })
          }).catch((err) => {
            console.log("PIP in video source failed, msg = ", err.message)
          })
        } else if (typeof video.webkitPresentationMode === 'function') {
          video.webkitPresentationMode('picture-in-picture')
        }
      } else if (isAlreadyInPIP) {
        document.exitPictureInPicture();
      }
    },

    gotoFullScreenPlayer() {
      this.$router.push(`/fullScreenPlayer`)
    },

    // 當發生特定配置改動，需要使用者重新整理頁面時，通過這個通知來提示使用者
    suggestRefreshPage() {
      this.$q.notify({
        message: "配置已更改，建議重新整理頁面",
        actions: [
          { label: "立即重新整理",
            handler: () => {
              // this.$router.push(`/fullScreenPlayer/${this.playWorkId}`)
              // this.$router.push(`/fullScreenPlayer`)
              this.$router.go(0);
            }
          }
        ],
      });
    },

    lyricOffsetChange(seconds) {
      if (seconds == null) seconds = 0;
      seconds = Math.round(seconds * 10000) / 10000; // 解決javascript小數點精度問題，比如0.9+0.1變成0.999999這種問題，在這裡修復成1.0
      console.log("lyric offset change to ", seconds, typeof seconds)
      this.setLyricOffsetSeconds(seconds)
    },

    flipCover() {
      if (!this.enableVisualizer) return; // 尚未開啟音訊視覺化選項，無法使用音效均衡器
      console.warn("flip cover");
      this.isFlipCover = !this.isFlipCover;
    },

    onKeyDown(event) {
      // console.warn("key down code = ", event.code, ", activeElement is ", document.activeElement); 
      if (document.activeElement.tagName === "INPUT") return; // 禁止文本編輯的按鍵響應
      if (this.playWorkId === 0) return; // 尚未播放任何作品時，禁止快捷鍵操作
      const volumeStep = 0.04; // volume is between [0.0, 1.0]

      switch(event.code) {
        case "Space": this.togglePlaying(); break;
        case "ArrowLeft": this.rewind(true); break;
        case "ArrowRight": this.forward(true); break;

        case "PageDown": this.nextTrack(); break;
        case "PageUp": this.previousTrack(); break;

        case "ArrowUp": 
          this.volume = Math.min(1.0, this.volume + volumeStep); break;
        case "ArrowDown": 
          this.volume = Math.max(0.0, this.volume - volumeStep); break;
        default: return; // return now
      }

      event.preventDefault()
      event.stopPropagation()
    },
  },

  created() {
    // 歷史更新函式防抖動
    this.onUpdatePlayingStatus = debounce(this.onUpdatePlayingStatus, 500);
  }
}
</script>


<style lang="scss" scoped>
.box-shadow {
  box-shadow: black 0px 4px 8px;
}

.audio-player {

  // 寬度 > $breakpoint-sm-min
  @media (min-width: $breakpoint-sm-min) {
    width: 330px;
    margin: 0px 10px 10px 0px;
    border-radius: 8px;
  }

  // 寬度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  transition: 0.6s;
  overflow: hidden;

  /* flex佈局，讓封面佔據主要空間，其餘空間留給其他控制元件 */
  display: flex;
  flex-direction: column;
}

.audio-player::before {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  content: "";
  background-image: var(--cover-url);
  background-position: 50% 50%;
  background-size: contain;
  background-repeat: repeat;
  filter: blur(30px) brightness(0.7); // blur bigger than 80 will cause safari wrong render result
}

.hideStyle {
  transform: translateY(200%);
}

.showStyle {
  transform: translateY(0);
}

.albumart {

  // 寬度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    width: 100%;
  }

  /* 播放控制元件中，封面佔據幾乎所有剩餘空間，將其他控制元件擠到底部去 */
  flex-grow: 1;
}

.current-play-list {
  max-height: 500px;

  // 寬度 > $breakpoint-xs-max
  @media (min-width: $breakpoint-xs-max) {
    width: 450px;
  }

  // 寬度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    min-width: 280px;
  }
}

.pull-handler {
  height: 6px;
  width: 100px;
  background: rgba(255, 255, 255, 0.3);
  position: absolute;
  border-radius: 4px !important;
  overflow: hidden;
  left: 50%;
  top: 12px;
  transform: translateX(-50%);
}

.pull-handler:hover {
  background: rgba(255, 255, 255, 0.5);
}

.audio-name {
  font-weight: bold;
  white-space: nowrap;
}

.work-name {
  opacity: 0.7;
  white-space: nowrap;
}

.equalizer {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: transparent;
  transform: rotateY(180deg);
}

.flippable-cover-container {
  perspective: 60rem;
  transition: opacity 1s;
}

.cover-img {
  transition: transform 1s;
}

.hide-cover-img {
  opacity: 0;
}

.show-cover-img {
  opacity: 1;
}

.flip-on-front {
  transform: rotateY(0);
}

.flip-on-back {
  transform: rotateY(180deg);
}

</style>
