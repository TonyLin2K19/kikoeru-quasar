<template>
  <div>
    <q-card class="q-ma-md">
      <q-form @submit="updateAdminPassword()">
        <q-toolbar>
          <q-toolbar-title>修改管理員密碼</q-toolbar-title>
        </q-toolbar>

        <div class="q-pa-sm">
          <q-input outlined dense type="password" label="新密碼"
            v-model="adminNewPassword"
            lazy-rules
            :rules="[ val => val.length >= 5 || '密碼長度至少為 5' ]"
          />

          <q-input outlined dense type="password" label="確認密碼"
            v-model="adminConfirmPassword"
            lazy-rules
            :rules="[
              val => val.length >= 5 || '密碼長度至少為 5',
              val => val === adminNewPassword || '兩次密碼輸入不一致'
            ]"
          />

          <div class="row justify-end">
            <q-btn :loading="loadingUpdateAdminPassword" type="submit" color="primary" label="修改" />
          </div>
        </div>
      </q-form>
    </q-card>

    <q-card class="q-ma-md">
      <q-form @submit="addNewUser()">
        <q-toolbar>
          <q-toolbar-title>新增新使用者</q-toolbar-title>
        </q-toolbar>

        <div class="q-pa-sm">
          <q-select dense outlined label="使用者組" v-model="newuser.group" :options="groups" class="q-mb-md" />

          <q-input outlined dense
            v-model="newuser.name" label="使用者名稱"
            required
            lazy-rules
            :rules="[
                val => val.length >= 5 || '使用者名稱長度至少為 5',
                val => !users.find(user => user.name === val) || '該名稱已存在，使用者名稱不能重複',
              ]" 
          />

          <q-input outlined dense label="密碼"
            v-model="newuser.password"
            lazy-rules
            :rules="[ val => val.length >= 5 || '密碼長度至少為 5' ]"
          />

          <div class="row justify-end">
            <q-btn :loading="loadingAddNewUser" type="submit" color="primary" label="新增" />
          </div>
        </div>
      </q-form>
    </q-card>

    <q-card class="q-ma-md q-pa-sm">
      <q-table
        title="所有使用者"
        :data="users"
        :columns="columns"
        row-key="name"
        :selected-rows-label="getSelectedString"
        selection="multiple"
        :selected.sync="selected"
      />
      <div class="row justify-end">
        <q-btn :loading="loadingDeleteUsers" :disable="selected.length === 0" @click="confirm = true" color="primary" label="刪除" />
      </div>
    </q-card>

    <q-dialog v-model="confirm" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <span class="q-ma-sm text-h6">確認刪除選中使用者？</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn flat label="確認" color="primary" @click="deleteUsers()" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import NotifyMixin from '../../mixins/Notification.js'

export default {
  mixins: [NotifyMixin],

  data () {
    return {
      selected: [],
      columns: [
        { name: 'desc', required: true, label: '使用者名稱', align: 'left', field: 'name', sortable: true },
        { name: 'calories', required: true, label: '使用者組', align: 'center', field: 'group', sortable: true },
      ],
      users: [],
      loadingDeleteUsers: false,

      newuser: {
        name: '',
        password: '',
        group: 'user'
      },
      groups: ['user', 'guest'],
      loadingAddNewUser: false,

      
      adminNewPassword: '',
      adminConfirmPassword: '',
      loadingUpdateAdminPassword: false,

      confirm: false
    }
  },

  methods: {
    getSelectedString () {
      return this.selected.length === 0 ? '' : `${this.selected.length} record${this.selected.length > 1 ? 's' : ''} selected of ${this.users.length}`
    },

    addNewUser () {
      this.loadingAddNewUser = true
      this.$axios.post('/api/credentials/user', {
        name: this.newuser.name,
        password: this.newuser.password,
        group: this.newuser.group
      })
        .then((response) => {
          this.users.push(this.newuser)
          this.loadingAddNewUser = false
          this.showSuccNotif(response.data.message)
          this.requestUsers()
        })
        .catch((error) => {
          this.loadingAddNewUser = false
          // 請求已發出，但伺服器響應的狀態碼不在 2xx 範圍內
          if (error.response.status === 422) {
            this.showErrNotif(error.response.data.errors[0].msg)
          } else if (error.response.status === 403) {
            this.showWarnNotif(error.response.data.error)
          } else {
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          }
        })

    },

    deleteUsers () {
      this.loadingDeleteUsers = true
      this.$axios.delete('/api/credentials/user', {
        data: { users: this.selected },
      })
        .then((response) => {
          this.selected.forEach(selectedUser => {
            const index = this.users.findIndex(user => user.name === selectedUser.name)
            this.users.splice(index, 1)
          })
          this.loadingDeleteUsers = false
          this.showSuccNotif(response.data.message)
          this.requestUsers()
        })
        .catch((error) => {
          this.loadingDeleteUsers = false
          if (error.response) {
            // 請求已發出，但伺服器響應的狀態碼不在 2xx 範圍內
            if (error.response.status === 403) {
              this.showWarnNotif(error.response.data.error)
            } else {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    updateAdminPassword () {
      this.loadingUpdateAdminPassword = true
      this.$axios.put('/api/credentials/user', {
        name: 'admin',
        newPassword: this.adminNewPassword
      })
        .then((response) => {
          this.loadingUpdateAdminPassword = false
          try {
            // 刪除舊 token
            this.$q.localStorage.set('jwt-token', '')
          } catch (err) {
            this.showErrNotif(err.message)
          }
          this.showSuccNotif(response.data.message)

          // 僅當啟用鑑權時跳轉到登入頁面
          if (this.$store.state.User.auth) {
            console.log('Got here')
            this.$router.push('/login')
          }
        })
        .catch((error) => {
          this.loadingUpdateAdminPassword = false
          if (error.response) {
            // 請求已發出，但伺服器響應的狀態碼不在 2xx 範圍內
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    requestUsers () {
      this.$axios.get('/api/credentials/users')
        .then((response) => {
          this.users = response.data.users
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
  },

  created () {
    this.requestUsers()
  }
}
</script>