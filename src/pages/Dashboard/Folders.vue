<template>
  <div>
    <q-card class="q-ma-md">
      <q-form @submit="onSubmitRootFolder">
        <q-toolbar>
          <q-toolbar-title>新增新資料夾</q-toolbar-title>
        </q-toolbar>

        <div class="q-pa-sm">
          <q-input
            outlined
            dense
            v-model="rootFolder.name"
            required
            lazy-rules
            :rules="[val => !config.rootFolders.find(rootFolder => rootFolder.name === val) || '該別名已存在，資料夾別名不能重複']"
            label="資料夾別名"
          />

          <q-input
            outlined
            dense
            v-model="rootFolder.path"
            required
            lazy-rules
            :rules="[val => !config.rootFolders.find(rootFolder => rootFolder.path === val) || '該路徑已存在，資料夾路徑不能重複']"
            label="絕對路徑"
          />

          <div class="row justify-end">
            <q-btn type="submit" color="primary" label="新增" />
          </div>
        </div>
      </q-form>
    </q-card>

    <q-form @submit="onSubmit">
      <q-card class="q-ma-md" v-show="config.rootFolders.length">
        <q-toolbar>
          <q-toolbar-title>資料夾列表</q-toolbar-title>
        </q-toolbar>

        <q-list>
          <q-item v-for="rootFolder in config.rootFolders" :key="rootFolder.name">
            <q-item-section avatar>
              <q-icon color="amber" name="folder" />
            </q-item-section>

            <q-item-section>
              <q-item-label>{{rootFolder.name}}</q-item-label>
              <q-item-label caption>{{rootFolder.path}}</q-item-label>
            </q-item-section>

            <q-item-section avatar>
              <q-btn flat round color="red" icon="delete" @click="removeFromRootFolders(index)" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <q-card class="q-ma-md">
        <q-toolbar>
          <q-toolbar-title>封面資料夾路徑</q-toolbar-title>
        </q-toolbar>

        <div v-if="config.coverUseDefaultPath" class="q-pa-md">已指定為預設路徑，即程式所在位置下的covers資料夾。如需修改，請前往高階設定並取消“封面使用預設路徑”。</div>
        <q-input v-else outlined dense required v-model="config.coverFolderDir" class="q-pa-sm" />
      </q-card>

      <div class="q-ma-lg row justify-end">
        <q-btn :loading="loading" label="儲存" type="submit" color="primary" />
      </div>
    </q-form>
  </div>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'

export default {
  name: 'Folders',

  mixins: [NotifyMixin],

  data () {
    return {
      config: {
        rootFolders: []
      },
      rootFolder: {
        name: '',
        path: ''
      },
      loading: false
    }
  },

  methods: {
    requestConfig () {
      this.$axios.get('/api/config/admin')
        .then((response) => {
          this.config = response.data.config
          this.rootFolder.path = response.data.config.voiceWorkDefaultPath
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
      this.loading = true
      this.$axios.put('/api/config/admin', {
        config: this.config
      })
        .then((response) => {
          this.showSuccNotif(response.data.message)
          this.loading = false
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

    onSubmitRootFolder () {
      if (this.rootFolder.name !== '' && this.rootFolder.path !== '') {
        this.config.rootFolders.push({
          name: this.rootFolder.name,
          path: this.rootFolder.path
        })
        this.rootFolder.name = ''
        this.rootFolder.path = ''
        this.onSubmit()
      }
    },

    removeFromRootFolders (index) {
      this.config.rootFolders.splice(index, 1)
      this.onSubmit()
    },
  },

  created () {
    this.requestConfig()
  }
}
</script>