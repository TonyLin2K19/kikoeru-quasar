<template>
  <q-page padding>
    <div class="fit row wrap justify-between items-start q-px-sm">
      <div class="col-lg-3 col-sm-12 col-xs-12">
          <q-btn-toggle
            v-model="mode"
            @input="changeMode"
            spread
            no-caps
            rounded
            toggle-color="primary"
            class="text-bold outline-style"
            :options="[
              {label: '播放歷史', value: 'histroy'},
              {label: '我的評價', value: 'review'},
              {label: '我的進度', value: 'progress'},
              {label: '分類整理', value: 'folder'},
            ]"
          />
      </div>

      <!-- 排序選項 -->
      <div v-if="mode != 'histroy'" class="col-auto row q-pt-md">
        <q-select dense rounded outlined v-model="sortBy" :options="sortOptions"/>
        <q-btn
          :disable="sortButtonDisabled"
          dense
          round
          outline
          padding="sm"
          class="q-ml-sm"
          :icon="direction? 'arrow_downward' : 'arrow_upward'"
          @click="switchSortMode" 
        />
      </div>
    </div>

    <!-- 進度選項，僅在我的進度tab選項中顯示-->
    <div
      v-if="mode === 'progress'"
      class="q-px-sm q-pt-md"
    >
      <q-btn-toggle
        v-model="progressFilter"
        @input="changeProgressFilter"
        toggle-color="primary"
        rounded
        class="outline-style"
        :options="[
          {label: '想聽', value: 'marked'},
          {label: '在聽', value: 'listening'},
          {label: '聽過', value: 'listened'},
          {label: '重聽', value: 'replay'},
          {label: '擱置', value: 'postponed'}
        ]"
      />
    </div>

    <!-- 作品列表 -->
    <div>
      <div class="q-px-sm q-pt-md">
        <q-infinite-scroll @load="onLoad" :offset="500" :disable="stopLoad" ref="scroll" v-if="mode !=='folder'">
          <div class="row justify-center text-grey" v-if="works.length === 0">在作品介面上點選星標、標記進度，標記的音聲就會出現在這裡啦</div>
          <q-list bordered separator class="shadow-2" v-if="works.length">
             <FavListItem v-for="work in works" :key="work.id" :workid="work.id" :metadata="work" @reset="reset()" :mode="mode"></FavListItem> 
          </q-list>
          <template v-slot:loading>
            <div class="row justify-center q-my-md">
              <q-spinner-dots color="primary" size="40px" />
            </div>
          </template>
        </q-infinite-scroll>

        <div v-else class="row justify-center text-grey">尚未實現，敬請期待</div>
      </div>
    </div>
  </q-page>
</template>

<script>
import FavListItem from 'components/FavListItem'
import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'Favourites',

  mixins: [NotifyMixin],

  components: {
    FavListItem
  },

  props: {
    route: {
      type: String,
      default: 'review'
    },
    progress: {
      type: String,
      default: 'marked'
    }
  },

  computed: {
    direction () {
      return this.sortMode === 'desc'
    },

    sortButtonDisabled () {
      return this.sortBy.order === 'allage' || this.sortBy.order === 'nsfw'
    }
  },

  data() {
    return {
      mode: 'histroy',
      progressFilter: 'marked',
      works: [],
      stopLoad: false,
      pagination: { currentPage:0, pageSize:12, totalCount:0 },
      sortMode: 'desc',
      sortBy: {
          label: '標記時間',
          order: 'updated_at'
        },
      sortOptions: [
        {
          label: '標記時間',
          order: 'updated_at'
        },
        {
          label: '評價',
          order: 'userRating'
        },
        {
          label: '釋出時間',
          order: 'release'
        },
        {
          label: '評論數量',
          order: 'review_count'
        },
        {
          label: '售出數量',
          order: 'dl_count'
        },
        {
          label: '全年齡新作',
          order: 'allage'
        },
        {
          label: '18禁新作',
          order: 'nsfw'
        }
      ]
    }
  },

  created() {
    this.mode = this.route;
    this.progressFilter = this.progress;
  },

  mounted() {
    if (localStorage.sortByFavourites) {
      try {
        this.sortBy = JSON.parse(localStorage.sortByFavourites);
      } catch {
        localStorage.removeItem('sortByFavourites');
      }
    }
  },

  watch: {
    sortBy(newSortOptionSetting) {
      localStorage.sortByFavourites = JSON.stringify(newSortOptionSetting);
      this.reset();
    },

    sortMode() {
      this.reset();
    },

    // Browser back and forth
    route() {
      this.mode = this.route;
      this.reset();
    },
    progress() {
      this.progressFilter = this.progress;
      this.reset();
    }
  },

  methods: {
    // Split two-way binding
    changeMode(newMode) {
      this.$router.push(`/favourites/${newMode}`);
      this.reset();
    },

    // Split two-way binding
    changeProgressFilter(newFilter) {
      this.$router.push(`/favourites/progress/${newFilter}`);
      this.reset();
    },

    switchSortMode() {
      if(this.sortMode ==='desc') {
        this.sortMode = 'asc'
      } else {
        this.sortMode = 'desc'
      }
    },

    onLoad (index, done) {
      this.requestWorksQueue()
        .then(() => done())
    },

    reset () {
      // Freeze the scroller first
      this.stopLoad = true
      this.pagination = { currentPage:0, pageSize:12, totalCount:0 }
      // Manually fetch first page content before enable scroller
      // Note: the internal API of the infinite scroller does not work well
      this.requestWorksQueue()
        .then(() => {
          this.stopLoad = false
        })
    },

    requestWorksQueue () {
      const params = {
        order: this.sortBy.order,
        sort: this.sortMode,
        page: this.pagination.currentPage + 1 || 1
      }

      if (this.sortBy.order === 'allage') {
        params.order = 'nsfw'
        params.sort = 'asc'
      }

      if (this.sortBy.order === 'nsfw') {
        params.order = 'nsfw'
        params.sort = 'desc'
      }

      if (this.mode === 'progress') {
        params.filter = this.progressFilter;
      }

      const requestUrl = this.mode == 'histroy' ? "/api/histroy" : 'api/review'
      return this.$axios.get(requestUrl, { params })
        .then((response) => {                  
          const works = response.data.works
          this.works = (params.page === 1) ? works.concat() : this.works.concat(works)
          this.pagination = response.data.pagination

          if (this.works.length >= this.pagination.totalCount) {
            this.stopLoad = true
          }
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
          this.stopLoad = true
        })
    },
  }
}
</script>

<style scoped>
.outline-style {
  border: 1px solid var(--q-color-primary);
}
</style>
