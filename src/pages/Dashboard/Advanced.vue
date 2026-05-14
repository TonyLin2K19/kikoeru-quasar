<template>
  <q-form @submit="onSubmit">
    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>網頁偏好設定（每個瀏覽器之間，此部分配置相互獨立）</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>高階音訊模式</q-item-label>
            <q-item-label caption>支援顯示音訊特效、左右聲道反轉等音訊功能，建議在桌面瀏覽器中開啟，移動端iOS裝置會有聲音播放bug</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle :value="enableVisualizer" @input="changeEnableVisualizer" dense/>
          </q-item-section>
        </q-item>

        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>啟用影片源作為播放格式</q-item-label>
            <q-item-label caption>開啟此選項後，影片格式(mp4)用於播放音訊的同時，也可以看到影片畫面(大圖模式下)</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle :value="enableVideoSource" @input="changeEnableVideoSource" dense/>
          </q-item-section>
        </q-item>

        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>切換回舊式作品卡片UI</q-item-label>
            <q-item-label caption>搜尋頁面展示作品使用舊的卡片樣式，舊式卡片可以直接顯示所有標籤</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle :value="oldWorkCardUIStyle" @input="changeOldWorkCardUIStyle" dense/>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>播放器設定</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>後退按鈕跳躍秒數</q-item-label>
            <q-item-label caption>播放時後退按鈕跳躍秒數</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <div class="q-gutter-sm">
              <q-radio dense v-model="rewindSeekTime" val=5 label="5 秒" />
              <q-radio dense v-model="rewindSeekTime" val=10 label="10 秒" />
              <q-radio dense v-model="rewindSeekTime" val=30 label="30 秒" />
            </div>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>前進按鈕跳躍秒數</q-item-label>
            <q-item-label caption>播放時前進按鈕跳躍秒數</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <div class="q-gutter-sm">
              <q-radio dense v-model="forwardSeekTime" val="5" label="5 秒" />
              <q-radio dense v-model="forwardSeekTime" val="10" label="10 秒" />
              <q-radio dense v-model="forwardSeekTime" val="30" label="30 秒" />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>爬蟲相關設定</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>標籤語言</q-item-label>
            <q-item-label caption>從 DLSite 爬取的標籤後設資料的語言</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <div class="q-gutter-sm">
              <q-radio dense v-model="config.tagLanguage" val="zh-cn" label="簡" />
              <q-radio dense v-model="config.tagLanguage" val="zh-tw" label="繁" />
              <q-radio dense v-model="config.tagLanguage" val="ja-jp" label="日" />
            </div>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>DLsite 超時時間</q-item-label>
            <q-item-label caption>預設 10000 毫秒</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.dlsiteTimeout"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>HVDB 超時時間</q-item-label>
            <q-item-label caption>預設 10000 毫秒</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.hvdbTimeout"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>重新請求間隔時間</q-item-label>
            <q-item-label caption>預設 2000 毫秒</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.retryDelay"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>請求最大嘗試次數</q-item-label>
            <q-item-label caption>預設 5</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.retry"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>爬蟲並行任務數量</q-item-label>
            <q-item-label caption>預設 16</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.maxParallelism"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>HTTP 代理服務主機 IP</q-item-label>
            <q-item-label caption>此項為空時預設為本機</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model="config.httpProxyHost"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>HTTP 代理服務埠號 </q-item-label>
            <q-item-label caption>此項為 0 時預設不使用代理</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.httpProxyPort"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>資料夾掃描相關設定</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>最大遞迴掃描深度</q-item-label>
            <q-item-label caption>預設 2</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.scannerMaxRecursionDepth"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section>
            <q-item-label>掃描時跳過清理音聲庫</q-item-label>
            <q-item-label caption>是否跳過清理不存在的音聲（不推薦，預設不跳過）</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-toggle v-model="config.skipCleanup" dense />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>Web 伺服器相關設定</q-toolbar-title>
        <div class="q-pr-xs">更改此設定需要重啟程式</div>
      </q-toolbar>

      <q-list>
        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>使用者驗證</q-item-label>
            <q-item-label caption>是否啟用使用者驗證（生產環境下無法修改此設定）</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.auth" dense :disable="config.production" />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>啟用Gzip</q-item-label>
            <q-item-label caption>對網路傳輸啟用Gzip壓縮</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.enableGzip" dense/>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>設定埠號</q-item-label>
            <q-item-label caption>伺服器監聽埠號</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.listenPort"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>遮蔽遠端連線</q-item-label>
            <q-item-label caption>只允許本地訪問，預設為false。更改此設定需要重啟程式</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.blockRemoteConnection" dense/>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>token 過期時間</q-item-label>
            <q-item-label caption>預設 2592000 秒</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.expiresIn"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>每頁顯示的音聲數量</q-item-label>
            <q-item-label caption>預設 12</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-input
              v-model.number="config.pageSize"
              type="number"
              input-class="text-right"
              style="max-width: 100px;"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>安全設定</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>生產環境</q-item-label>
            <q-item-label caption>此設定無法在網頁端修改，詳情請查閱GitHub Wiki中關於配置檔案的說明</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.production" dense disable />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card class="q-ma-md">
      <q-toolbar>
        <q-toolbar-title>其它設定</q-toolbar-title>
      </q-toolbar>

      <q-list>
        <q-item style="height: 70px;">
          <q-item-section>
            <q-item-label>檢查更新</q-item-label>
            <q-item-label caption>開啟網頁時是否檢查更新</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.checkUpdate" dense />
          </q-item-section>
        </q-item>

        <q-item v-if="config.checkUpdate">
          <q-item-section>
            <q-item-label>檢查測試版更新</q-item-label>
            <q-item-label caption>是否檢查測試版更新</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.checkBetaUpdate" dense />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>資料庫使用預設路徑</q-item-label>
            <q-item-label caption>使用程式所在位置下的sqlite資料夾，並忽略databaseFolderDir設定（如無必要請勿修改，更改此設定需要重啟程式）</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.dbUseDefaultPath" dense />
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>封面使用預設路徑</q-item-label>
            <q-item-label caption>使用程式所在位置下的covers資料夾，並忽略封面資料夾路徑設定</q-item-label>
          </q-item-section>

          <q-item-section avatar>
            <q-toggle v-model="config.coverUseDefaultPath" dense />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <div class="q-ma-lg row justify-end">
      <q-btn :loading="loading" label="儲存" type="submit" color="primary" />
    </div>
  </q-form>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'
import { mapState } from 'vuex'

export default {
  name: 'Advanced',

  mixins: [NotifyMixin],

  data () {
    return {
      config: {},
      loading: false,
      rewindSeekTime: '5',
      forwardSeekTime: '30',
      
    }
  },

  computed: {
    ...mapState('AudioPlayer', [
      'oldWorkCardUIStyle',
      'enableVideoSource',
      'enableVisualizer',
    ]),
  },

  methods: {
    requestConfig () {
      this.$axios.get('/api/config/admin')
        .then((response) => {
          this.config = response.data.config;
          // Integer => String
          this.rewindSeekTime = this.config.rewindSeekTime.toString()
          this.forwardSeekTime = this.config.forwardSeekTime.toString()
        })
        .catch((error) => {
          if (error.response) {
            // 請求已發出，但伺服器響應的狀態碼不在 2xx 範圍內
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    onSubmit () {
      // String => Integer
      this.config.rewindSeekTime = parseInt(this.rewindSeekTime)
      this.config.forwardSeekTime = parseInt(this.forwardSeekTime)

      this.loading = true
      this.$axios.put('/api/config/admin', {
        config: this.config
      })
        .then((response) => {
          this.loading = false
          this.showSuccNotif(response.data.message)
        })
        .catch((error) => {
          this.loading = false
          if (error.response) {
            // 請求已發出，但伺服器響應的狀態碼不在 2xx 範圍內
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    changeOldWorkCardUIStyle(value) {
      console.log("change old work card ui to: ", value, typeof(value));
      this.$store.commit('AudioPlayer/SET_OLD_WORK_CARD_UI_STYLE', value);
    },

    changeEnableVideoSource(value) {
      this.$store.commit('AudioPlayer/SET_ENABLE_VIDEO_SOURCE', value);
    },

    changeEnableVisualizer(value) {
      this.$store.commit('AudioPlayer/SET_ENABLE_VISUALIZER', value);
    }
  },

  created () {
    this.requestConfig()

  }
}
</script>