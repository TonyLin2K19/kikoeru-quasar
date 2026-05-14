import { LocalStorage } from 'quasar'

export const SWAP_SEEK_BUTTON_KEY = 'swap_seek_button'
export const ENABLE_VISUALIZER_KEY = 'enable_visualizer'
export const ENABLE_PIP_LYRICS = 'enable_pip_lyrics'
export const ENABLE_VIDEO_SOURCE_KEY = 'enable_video_source'
export const AI_SERVER_URL_KEY = 'ai_server_url'
export const OLD_WORK_CARD_UI_STYLE_KEY = 'old_work_card_ui_style_key'

export default function () {
  return {
    hide: false,
    playing: false, // 播放狀態 (true/false)
    currentTime: 0, // 單位: 秒
    newCurrentTime: -1, // 單位：秒，<0 的負數表示當前無需更改媒體的currentTime，>=0 表示需要更改媒體的currentTime
    duration: 0,
    source: "",
    queue: [
      // list of tracks. object format:
      /*
        hash: null, // unique identifier for the file
        title: null, // title to show in UI
        workTitle: null // workTitle to show in UI
       */
    ],
    queueIndex: 0, // which track in the queue is currently selected
    playMode: {
      id: 0,
      name: "order"
    }, // 順序播放("order"), 迴圈播放("all repeat"), 單曲迴圈("repeat once") or 隨機播放("shuffle")
    muted: false,
    volume: 0, // 音量 (0.0-1.0)
    hasLyric: false,
    currentLyric: '',
    lyricOffsetSeconds: 0,
    sleepTime: null,
    sleepMode: false,
    rewindSeekTime: 5,
    forwardSeekTime: 30,
    rewindSeekMode: false,
    forwardSeekMode: false,
    swapSeekButton: LocalStorage.has(SWAP_SEEK_BUTTON_KEY) && LocalStorage.getItem(SWAP_SEEK_BUTTON_KEY), // 交換進度按鈕與切換按鈕
    enableVisualizer: LocalStorage.has(ENABLE_VISUALIZER_KEY) && LocalStorage.getItem(ENABLE_VISUALIZER_KEY), // 是否開啟音訊視覺化
    enableVideoSource: LocalStorage.has(ENABLE_VIDEO_SOURCE_KEY) && LocalStorage.getItem(ENABLE_VIDEO_SOURCE_KEY), // 是否開啟影片元素作為媒體源，用於在網頁中播放影片格式的音訊作品
    enableVideoSourcePIP: false, // 讓videoSource進入畫中畫模式，每一次需要單獨設定
    visualPlayerCoverUrl: '', // 視覺化播放器的封面圖
    playWorkId: 0, // 當前播放作品的id

    audioAnalyser: null, // 全域性 audio 音訊解析物件
    // audioAnalyzerData: null, // 解析音訊資訊，視覺化展示

    // 是否啟用畫中畫歌詞（桌面歌詞）
    // 注意android chrome不支援畫中畫，firefox估計也不支援，因此在android裝置上停用這一功能
    enablePIPLyrics: LocalStorage.has(ENABLE_PIP_LYRICS) && LocalStorage.getItem(ENABLE_PIP_LYRICS) && !(navigator.userAgent.toLowerCase().indexOf('android') > -1), 

    // 當從歷史記錄播放時，這裡記錄當前queue[queueIndex]應當恢復到的seconds時間，
    // -1表示無需恢復，其他大於等於0的數字需要在onCanplay時間觸發並完成時間跳轉之後，再次設定為-1
    resumeHistroySeconds: -1,

    // 是否切換回舊式的作品卡片，某些人需要直接展示所有tag，保留舊式UI的選項
    oldWorkCardUIStyle: LocalStorage.has(OLD_WORK_CARD_UI_STYLE_KEY) && LocalStorage.getItem(OLD_WORK_CARD_UI_STYLE_KEY),
  }
}
