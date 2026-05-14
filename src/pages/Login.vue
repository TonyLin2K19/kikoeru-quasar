<template>
  <q-form @submit="onSubmit" style="width: 260px;" class="absolute-center	q-gutter-md">
    <q-input filled v-model="name" label="使用者名稱" class="fit"
      lazy-rules
      :rules="[ val => val.length >= 5 || '密碼長度至少為 5' ]"
    />
    
    <q-input filled type="password" v-model="password" label="密碼"  class="fit"
      lazy-rules
      :rules="[ val => val.length >= 5 || '密碼長度至少為 5' ]"
    />

    <q-btn label="登入" type="submit" color="primary" class="fit" />
  </q-form>
</template>
   
<script>
import { setAxiosHeaders } from 'boot/axios'
import NotifyMixin from '../mixins/Notification.js'

export default {
  mixins: [NotifyMixin],

  data () {
    return {
      name: '',
      password: '',
    }
  },

  methods: {
    onSubmit () {
      this.$axios.post('/api/auth/me', {
        name: this.name,
        password: this.password
      })
        .then((res) => {
          try {
            this.$q.localStorage.set('jwt-token', res.data.token)
            setAxiosHeaders(res.data.token)
            this.showSuccNotif('登入成功.')
            this.$router.push('/')
          } catch (error) {
            // 由於Web Storage API錯誤，
            // 資料未成功儲存
            this.showErrNotif(error.message)
          }
        })
        .catch((error) => {
          if (error.response) {
            // 請求已發出，但伺服器響應的狀態碼不在 2xx 範圍內
            if (error.response.status === 401) {
              this.showWarnNotif(error.response.data.error)
            } else {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    }, 
  }
}
</script>