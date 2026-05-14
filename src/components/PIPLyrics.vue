<template>
  <div :class="visibility" class="topClass">
    <canvas ref="canvas" width="500" height="60" class="sized"></canvas>
    <video ref="video" class="sized" muted="muted" playsinline preload="metadata" controls="controls" style="display: inline;"></video>
  </div>
</template>

<script>
import { mapState, mapMutations, mapGetters } from 'vuex'
import { debounce } from 'quasar';

export default {
  name: 'PIPLyrics',

  computed: {
    video() {
      return this.$refs.video;
    },

    canvas() {
      return this.$refs.canvas
    },

    ...mapState('AudioPlayer', [
      'currentLyric',
      'enablePIPLyrics',
      'playing',
    ]),

    ...mapGetters('AudioPlayer', [
      'isQueueEmpty',
    ]),
  },

  data () {
    return {
      ctx: null,
      stopRafObject: { stopped: false },
      visibility: "hide",
      // visibility: "show",
      isFireFox: navigator.userAgent.toLowerCase().indexOf('firefox') > -1,
      isVideoCanPlay: false, // 用以記錄video能否播放並進入畫中畫模式，如果使用者操作太快，此時video還沒有準備好，需要延遲到video canplay事件發生後才能進入畫中畫狀態
      pixelRatio: window.devicePixelRatio,


      lastProcessedWindowSize: {
        height: 0,
        width: 0
      },
      pipWindow: null,
      resizePatchTimeoutID: 0,
    }
  },

  methods: {
    initCanvas() {
      this.ctx = this.$refs.canvas.getContext("2d")
      const canvas = this.$refs.canvas
      // const pixelRatio = 1;
      canvas.width = this.pixelRatio * window.innerWidth
      canvas.height = canvas.width / 500 * 60
      console.warn(`pip canvas init size: ${this.canvas.width} x ${this.canvas.height}`)

      // const ctx = this.ctx
      // let color = 0
      // let startTime = performance.now()
      // const stoper = this.stopRafObject
      // const draw = ()=>{
      //   if (stoper.stopped) return;
      //   const seconds = Math.floor((performance.now() - startTime) / 1000)
      //   // const selectLyric = lyrics[seconds % lyrics.length]
      //   
      //   color = Math.floor((color + 1) * 1.05) % 256
      //   ctx.fillStyle = `rgba(255, ${color}, 0, 1.0)`
      //   ctx.fillRect(0, 0, this.$refs.canvas.width, this.$refs.canvas.height)
      //   // drawLyric(selectLyric)
      //   // ctx.fillStyle = "rgba(0, 0, 0, 0)"
      //   // ctx.fillRect(0, 0, canvas.width, canvas.height)
      //   // ctx.fillStyle = `rgba(255, ${color}, 0, 1.0)`
      //   // ctx.fillRect(0, canvas.height / 4, canvas.width, canvas.height / 2)
      //   requestAnimationFrame(draw)
      // }
      // draw()
    },

    drawLyric(str) {
      console.log('draw lyric: ', str)
      // str += " 強制增加歌詞長度測試，強制增加歌詞長度測試，強制增加歌詞長度測試，"
      const fontScale = 0.7 
      const expectCharCount = 30
      const cvs = this.$refs.canvas
      const ctx = this.ctx

      const fontSize = fontScale * Math.round(Math.sqrt((cvs.width * cvs.height) / expectCharCount))

      const isDarkMode = this.$q.dark.isActive;

      // background
      ctx.clearRect(0, 0, cvs.width, cvs.height)
      ctx.fillStyle = isDarkMode ? 'rgba(50, 50, 50, 1.0)' : "rgba(255, 255, 255, 1.0)"
      ctx.fillRect(0, 0, cvs.width, cvs.height)

      ctx.font = `bold ${fontSize}px "-apple-system", "BlinkMacSystemFont", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", "Helvetica", "Arial", "sans-serif", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`
      ctx.fillStyle = '#9c27b0'

      // 可繪製引數
      const padWidth = 5
      const padHeight = 0

      const allowedLines = Math.floor((cvs.height - padHeight * 2) / fontSize)
      const allowedWidth = cvs.width - padWidth * 2

      // 首次測量全部字串
      const allTxt = ctx.measureText(str)
      const neededLines = Math.ceil(allTxt.width / allowedWidth)
      const drawLines = Math.min(neededLines, allowedLines)
      const restLineHeight = cvs.height - drawLines * fontSize
      let readCharIdx = 0 // 將要新增到繪製行的字元序號

      const chars = str.split("")

      // 遍歷每一行
      for (let line = 0; line < drawLines && readCharIdx < chars.length; line++) {
        // 填充當前行直到allowedWidth
        let lineStr = ""
        let lineStrMetric = null
        while (readCharIdx < str.length) {
          lineStr += chars[readCharIdx]
          lineStrMetric = ctx.measureText(lineStr)
          if (lineStrMetric.width > allowedWidth) {
            // 當前行已滿，準備繪製lineStr
            lineStr = lineStr.substr(0, lineStr.length - 1)
            break;
          } else {
            // 當前行仍然有剩餘空間，繼續往lineStr新增字元
            readCharIdx++;
          }
        }

        if (line == drawLines - 1 && readCharIdx < chars.length) {
          // 已到達最後一行，然而還有文字沒有上屏，將當前行末尾的幾個文字變為省略號，忽略後續其他文字
          lineStr = lineStr.substr(0, lineStr.length - 3) + "..."
        }

        lineStrMetric = ctx.measureText(lineStr)

        // 繪製lineStr
        const drawX = padWidth + (cvs.width - lineStrMetric.width) / 2

        const drawY = restLineHeight / 2 + line * fontSize + lineStrMetric.actualBoundingBoxAscent
        ctx.fillText(lineStr, drawX, drawY)

        // ctx.fillRect(0, drawY, canvas.width, 2) // draw base line for reference
      }

      this.video.srcObject.getTracks().forEach((t => t.requestFrame && t.requestFrame()));
    },

    initVideos() {
      const stream = this.$refs.canvas.captureStream()
      this.video.srcObject = stream
      
      this.isVideoCanPlay = true;
      this.video.addEventListener("loadedmetadata", () => {
        console.log("pip video ready")
        this.isVideoCanPlay = true;
      })
      this.video.addEventListener("enterpictureinpicture", (event) => {
        this.pipWindow = event.pictureInPictureWindow
        this.pipWindow.onresize = () => {
          this.onPipWindowResize()
        }
        setTimeout(() => this.onPipWindowResize(), 500)
        console.warn("enter pip")
      })
      this.video.addEventListener("leavepictureinpicture", () => {
        if (!this.stopPIPLyric) return // 元件已經被銷燬
        this.stopPIPLyric()
        this.setEnablePIPLyrics(false)
        this.pipWindow = null
      })
      this.video.play()
      this.forceVideoStartLoadMetadata()
    },

    onPipWindowResize() {
      // console.warn("pip window resize: ", this.pipWindow.width, this.pipWindow.height)
      if (!this.pipWindow) return
      this.canvas.width = Math.round(this.pixelRatio * this.pipWindow.width);
      this.canvas.height = Math.round(this.pixelRatio * this.pipWindow.height);
      this.drawLyric(this.currentLyric)
    },

    forceVideoStartLoadMetadata() {
      // 首先繪製一次，初始化video狀態，保證dataloaded，是的後續畫中畫狀態能夠立即進入
      let forceDrawCount = 5;
      const draw = () => {
        if (forceDrawCount < 0) {
          if (!this.enablePIPLyrics || !this.playing)this.video.pause() // 停止強制渲染後，根據播放器狀態決定video是否暫停
          return;
        }
        forceDrawCount--;
        requestAnimationFrame(draw)
        this.drawLyric(this.currentLyric) 
      }
      requestAnimationFrame(draw)
    },

    openPIPVideoMode() {
      // this.drawLyric(this.currentLyric) // 首先繪製一次
      this.video.play()
      console.log("開啟桌面歌詞")

      if (
        typeof this.video.requestPictureInPicture === 'function' &&
        document.pictureInPictureEnabled
      ) {
        this.video.requestPictureInPicture().then(() => {
          // 解決歌詞video播放、暫停事件無法傳遞到音訊播放狀態的問題
          if (!this.playing) this.video.pause()
          // from user
          this.video.onplay = () => {
            this.syncPlayingStateFromPIPVideoToAudio(true);
          };
          this.video.onpause = () => {
            this.syncPlayingStateFromPIPVideoToAudio(false);
          };
        }).catch((err) => {
          console.log("PIP lyric open video failed, msg = ", err.message)
          this.stopPIPLyric()
        })
      } else if (typeof this.video.webkitPresentationMode === 'function') {
        this.video.webkitPresentationMode('picture-in-picture')
      }

      if (this.isFireFox) {
        // 對火狐瀏覽器，將video強制顯示出來，讓使用者自己設定video進入畫中畫模式，然後自動隱藏
        this.visibility = "manulSet"
        setTimeout(()=>{
          this.visibility = "hide"
        }, 10000)
      } else {
        // // 20230805 更新，下面這個對SE的處理根本沒用，SE一會能有一會不行，相當玄學，
        // // 有的時候多等一下再點OK按鈕就能顯示出來了，有的時候又不行。算了，不管這個，其他iPhone、ipad、桌面都沒有問題
        // // 對於其他瀏覽器其實無需做額外操作
        // // 但是目前發現iPhoneSE1 15.7.7 的safari奇怪的行為，必須要將video/canvas顯示出來一下，然後才能正常進入畫中畫模式，否則video將無法看到
        // // 這裡就強制所有瀏覽器環境都進行這樣一個操作，先show出來，然後立即hide下去
        // this.visibility = "show"
        // console.log("show pip video temp")
        // setTimeout(() => {
        //   this.visibility = "hide"
        //   console.log("hide pip video")
        // }, 2000);
      }

    },

    showUserPrompt() {
      let msg = "請點選‘開啟’按鈕確認顯示桌面歌詞，或者點選‘取消’關閉桌面歌詞。（請注意，桌面歌詞開啟後，原先網頁內的歌詞就會被隱藏掉）"
      let okMsg = "請繼續"
      if (this.isFireFox) {
        msg = "檢測到FireFox瀏覽器，此瀏覽器下必須由使用者手動選擇開啟畫中畫功能，請在10秒內手動選擇左上角出現的video元件並開啟畫中畫功能，10秒後video元件將會隱藏並無法操作。如果錯過，您也可以重新關閉、開啟桌面歌詞功能，來再次操作。"
        // firefox尚不支援這種js觸發畫中畫功能，先將video顯示出來，讓使用者手動選擇畫中畫功能，然後隱藏頁面中的video元素
        okMsg = "好的"
      }

      this.$q.dialog({
        title: '桌面歌詞',
        message: msg,
        ok: okMsg,
        cancel: "關閉桌面歌詞",
        persistent: false
      }).onOk(async () => {
        this.openPIPVideoMode()
      }).onCancel(() => {
        // console.log('>>>> Cancel')
        this.setEnablePIPLyrics(false)
        this.stopPIPLyric()
      }).onDismiss(() => {
        // console.log('I am triggered on both OK and Cancel')
      })
    },

    stopPIPLyric() {
      const video = this.$refs.video
      if (!video) return
      if (typeof document.exitPictureInPicture === 'function') {
        document.pictureInPictureElement && document.exitPictureInPicture()
      } else if (typeof video.webkitPresentationMode === 'function') {
        video.webkitSetPresentationMode('inline')
      }
      video.pause()
      // this.setEnablePIPLyrics(false)
      video.onplay = null;
      video.onpause = null;
    },

    ...mapMutations('AudioPlayer', {
      setEnablePIPLyrics: 'SET_ENABLE_PIP_LYRICS',
      togglePlaying: 'TOGGLE_PLAYING',
      playAudio: 'PLAY',
      pauseAudio: 'PAUSE',
    }),

    tryEnterPIPAndShowUserPrompt() {
      if (this.isVideoCanPlay) {
        this.showUserPrompt() 
      } else {
        this.$q.notify({message: "桌面歌詞開啟失敗，請播放音訊5秒後再次嘗試開啟", timeout: 500})
      }
    },

    syncPlayingStateFromAudioToPIPVideo() {
      // 將音訊狀態 同步到 歌詞video上
      if (!this.enablePIPLyrics) return;
      if (this.playing && this.video.paused) this.video.play()
      else if (!this.playing && !this.video.paused) this.video.pause()
    },

    syncPlayingStateFromPIPVideoToAudio(isPIPPlaying) {
      if (isPIPPlaying) this.playAudio()
      else this.pauseAudio()
    }
  },

  watch: {
    enablePIPLyrics(value) {
      if (!value) this.stopPIPLyric()
      else  this.tryEnterPIPAndShowUserPrompt()
    },

    // 監聽播放列表，如果有新增，一般是開啟的桌面歌詞狀態的時候，還沒有播放作品，
    // 如果這個時候突然播放作品，就需要做檢查並進入歌詞畫中畫模式
    isQueueEmpty(value) {
      if (value) this.stopPIPLyric()
      else if (this.enablePIPLyrics) this.tryEnterPIPAndShowUserPrompt()
    },
    currentLyric(newLyric) {
      if (!this.enablePIPLyrics) return
      this.drawLyric(newLyric)
    },
    playing() {
      this.syncPlayingStateFromAudioToPIPVideo()
      this.drawLyric(this.currentLyric);
    },
    "$q.dark.isActive"() {
      // 監聽黑夜模式，立即重新繪製
      this.drawLyric(this.currentLyric);
    }
  },

  created() {
    // 防止快速切換導致video/audio相互之間的狀態遞迴
    //  user ===play/pause---> PIP video --- play/pause ---> audio
    //                            ^                           |
    //                            |                           |
    //                            -------------play/pause-----`
    this.syncPlayingStateFromAudioToPIPVideo = debounce(this.syncPlayingStateFromAudioToPIPVideo, 500) // ms
    this.syncPlayingStateFromPIPVideoToAudio = debounce(this.syncPlayingStateFromPIPVideoToAudio, 500) // ms
    this.onPipWindowResize = debounce(this.onPipWindowResize, 100, true /*immediate*/)
  },

  mounted() {
    // this.$q.notify({message: "建立桌面歌片語件中，請稍等...", timeout: 500})
    // addEventListener('mousemove', onCursorMove(this), false)
    // addEventListener('touchmove', onCursorMove(this), false)
    this.initCanvas()
    this.initVideos()

    // this.$nextTick(()=> {
    //   this.showUserPrompt()
    // })
    // setTimeout(()=>{
      // this.showUserPrompt()
    // }, 1000)

  },

  beforeDestroy() {
    this.stopRafObject.stopped = true
    this.stopPIPLyric()
  }
}
</script>

<style lang="scss" scoped>
  .sized {
      width: 500px;
      height: 60px;
      border: 1px solid black;
      position: absolute;
  }

  .hide {
      opacity: 0.1;
      position: fixed;
      right: 5px;
      bottom: 5px;
      width: 5px;
      height: 5px;
      overflow: hidden;
  }
  .topClass {
    z-index: 999;
  }
  .show {
      opacity: 1.0;
      position: fixed;
      left: 0;
      top: 0;
  }

  .manulSet {
    opacity: 1.0;
    position: fixed;
    left: 0;
    top: 0;
    width: 100vw;
    height: 50vh;
  }

  .manulSet > canvas {
    display: none;
  }
</style>
