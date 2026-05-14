<template>
  <q-item clickable class="row">
      <q-item-section class="col-auto" top> 
        <router-link :to="`/work/${metadata.id}`">
          <q-img transition="fade" :src="coverUrl" style="height: 120px; width: 160px;" />
        </router-link>
      </q-item-section>


      <q-item-section class="q-gutter-y-xs column items-start" top v-on:click.self="showReviewDialog = true && mode != 'histroy' ">
        <q-item-label lines="2" class="text-body2">
          <router-link :to="`/work/${metadata.id}`" class="col-auto text-secondary">
            {{metadata.title}}
          </router-link>
        </q-item-label>

        <div class="row q-gutter-x-sm col-auto" >
          <router-link :to="`/works?circleId=${metadata.circle.id}`" class="col-auto text-grey">
            {{metadata.circle.name}}
          </router-link>

          <span class="col-auto">/</span>
          <span class="col-auto text-grey"> {{metadata.release}}</span>
          <span class="col-auto">/</span>

          <router-link
            v-for="(va, index) in metadata.vas"
            :key=index
            :to="`/works?vaId=${va.id}`"
            class="col-auto text-primary"
          >
            {{ va.name }}
          </router-link>
        </div>

        <div class="row items-center q-gutter-x-xs">
          <q-rating
            v-if="!hideRating"
            v-model="rating"
            @input="setRating"
            size="sm"
            color="blue"
            icon="star_border"
            icon-selected="star"
            icon-half="star_half"
            class="col-auto"
          />
          <span class="col-auto text-grey ">{{metadata.updated_at}}</span>
        </div>

        <q-item-label class="q-pt-sm" v-if="mode === 'review'">
          <q-card class="my-card col-auto" @click="showReviewDialog = true" v-show="metadata.review_text" >
            <q-card-section class="q-pa-sm">
              <pre class="q-ma-none">{{metadata.review_text}}</pre>
            </q-card-section>
          </q-card>
        </q-item-label>

        <div v-if="mode === 'histroy'" class="full-width">
          <div class="full-width">
            <q-btn color="primary" label="從歷史播放"  class="full-width" @click="playHistroy(metadata.id, metadata.state)"/>
          </div>

          <!--
          <div>
            <span class="text-accent">歷史：</span>
              <q-badge color="blue">
                {{ metadata.play_updated_at }}
              </q-badge>
          </div>
          -->

          <div>
            <span class="text-accent">進度：</span>
            <q-badge color="purple">{{ metadata.state.index+1 }} / {{ metadata.state.queue.length }}</q-badge>
            <q-badge color="blue">{{ humanReadableSeconds(metadata.state.seconds) }}</q-badge>
            <span class="text-grey">
              {{ metadata.state.queue[metadata.state.index].title }}
            </span>
          </div>
        </div>

        <q-item-label class="q-pt-xs" v-if="mode === 'progress'">
          <q-btn-toggle
            v-if="mode === 'progress'"
            v-model="progress"
            @input="setProgress"
            dense
            no-caps
            rounded
            toggle-color="primary"
            color="white"
            text-color="black"
            class="q-pa-sm"
            :options="[
              {label: '想聽', value: 'marked'},
              {label: '在聽', value: 'listening'},
              {label: '聽過', value: 'listened'},
              {label: '重聽', value: 'replay'},
              {label: '擱置', value: 'postponed'}
            ]"
          />
          </q-item-label>
      </q-item-section>

      <WriteReview v-if="showReviewDialog" @closed="processReview" :workid="workid" :metadata="metadata"></WriteReview>

  </q-item>
</template>

<script>
import WriteReview from './WriteReview'
import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'FavListItem',

  mixins: [NotifyMixin],

  components: {
    WriteReview
  },

  props: {
      workid: {
        type: Number,
        required: true
      },
      metadata: {
        type: Object,
        required: true
      },
      mode: {
        type: String,
        default: 'review'
      }
  },

  data () {
    return {
      rating: 0,
      showReviewDialog: false,
      hideRating: false,
      progress: ''
    }
  },

  computed: {
    coverUrl () {
      // 從 LocalStorage 中讀取 token
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      return this.workid ? `/api/cover/${this.workid}?type=240x240&token=${token}` : ""
    },
  },

  mounted() {
    // 可以用mounted因為初始化時metadata不為空
    this.setMetadata();
  },

  watch: {
    // 需要watch metadata 當父component重新整理metadata時更新
    metadata () {
      this.setMetadata();
    }
  },

  methods: {
    humanReadableSeconds(seconds) {
      const hour = Math.floor(seconds / 3600)
      const minute = Math.floor(seconds / 60)
      const sec = Math.floor(seconds) % 60

      let str = ""
      if (hour > 0) str += `${hour}小時`
      if (minute > 0) str += `${minute}分鐘`
      str += `${sec}秒`
      return str
    },

    setMetadata () {
      if (this.metadata.userRating) {
        this.rating = this.metadata.userRating;
      } else {
        this.hideRating = true;
      }
      if (!this.rating) {
        this.hideRating = true;
      } else {
        this.hideRating = false;
      }

      this.progress = this.metadata.progress;
    },

    processReview (modified) {
      if (modified) {
        this.calledFromChild = true;
        this.$emit('reset');
      }
      this.showReviewDialog = false;
    },

    setRating (newRating) {
      // 取消標星可能是操作失誤，所以不響應。應使用刪除標記來刪除打星
      if (newRating) {
        const submitPayload = {
          'user_name': this.$store.state.User.name, // 使用者名稱不會被後端使用
          'work_id': this.metadata.id,
          'rating': newRating
        };
        this.submitRating(submitPayload);
      }
    },

    submitRating (payload) {
      const params = {
        starOnly: true
      }
      this.$axios.put('/api/review', payload, { params })
        .then((response) => {
          this.showSuccNotif(response.data.message)
        })
        .then(()=> this.$emit('reset'))
        .catch((error) => {
          if (error.response) {
            // 請求已發出，但伺服器響應的狀態碼不在 2xx 範圍內
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    setProgress (newProgress) {
      const submitPayload = {
        'user_name': this.$store.state.User.name, // 使用者名稱不會被後端使用
        'work_id': this.metadata.id,
        'progress': newProgress
      };
      this.submitProgress(submitPayload);
    },

    submitProgress (payload) {
      const params = {
        starOnly: false,
        progressOnly: true
      }
      this.$axios.put('/api/review', payload, {params})
        .then((response) => {
          this.showSuccNotif(response.data.message)
        })
        .then(()=> this.$emit('reset'))
        .catch((error) => {
          if (error.response) {
            // 請求已發出，但伺服器響應的狀態碼不在 2xx 範圍內
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    playHistroy(workId, histroyState) {
      this.$store.commit('AudioPlayer/SET_QUEUE', {
        workId: workId,
        queue: histroyState.queue,
        index: histroyState.index,
        resetPlaying: false,
        resumeHistroySeconds: histroyState.seconds,
      })
      // this.$store.commit('AudioPlayer/SET_RESUME_HISTROY_SECONDS', histroyState.seconds)
    }
  }

}
</script>