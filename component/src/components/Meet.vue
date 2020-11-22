<template>
  <div class="fullscreen" @mousemove="showActionBar">
    <v-fade-transition>
      <v-banner class="banner white--text" app v-show="visibleButtons">{{ meeting.subject }}</v-banner>
    </v-fade-transition>
    <web-rtc-call
      v-if="connected"
      collab-url="https://collab.extream.app"
      :item-id="meeting.id"
      view="thumbnails"
      :visible-buttons="visibleButtons"
      @close="end"
    />
    <v-container v-else-if="error">
      <p>{{ error }}</p>
    </v-container>
    <v-skeleton-loader v-else type="image"></v-skeleton-loader>
  </div>
</template>
<script>
import WebRtcCall from './WebRtcCall/index.vue'
export default {
  components: {
    WebRtcCall,
  },
  data: () => ({
    meeting: {
      id: '',
      subject: '',
    },
    connect: false,
    connected: false,
    spinner: 0,
    error: '',
    visibleButtons: true,
    buttonTimeout: null,
    buttonDelay: 1800,
  }),
  beforeMount() {
    const roomId = this.$route.params.room
    if (localStorage.getItem('isAuthenticated')) {
      this.connect = true
    } else {
      setTimeout(this.checkAuthenticated, 1000)
    }
    this.meeting.id = roomId
  },
  watch: {
    connect(newVal, oldVal) {
      if (newVal === true && oldVal !== true) {
        this.connectCall()
      }
    },
  },
  methods: {
    showActionBar() {
      clearTimeout(this.buttonTimeout)
      this.visibleButtons = true
      this.buttonTimeout = setTimeout(() => {
        console.log('hiding buttons')
        this.visibleButtons = false
      }, this.buttonDelay)
    },
    checkAuthenticated() {
      if (localStorage.getItem('isAuthenticated') !== 'true') {
        setTimeout(this.checkAuthenticated, 1000)
        this.spinner = ++this.spinner
      } else {
        this.spinner = 0
        this.connect = true
      }
    },
    end() {
      console.log('end call')
    },
    connectCall() {
      console.log(localStorage.getItem('session'))
      const session = JSON.parse(localStorage.getItem('session'))
      const userId = session.id
      this.$extream.socket.off('consumer_webrtc_get')
      this.$extream.on(`consumer_webrtc_get`, (resp) => {
        if (resp.payload && !resp.error) {
          if ([...resp.payload.instance.participants, resp.payload.instance.addedBy].includes(userId)) {
            this.meeting.subject = resp.payload.instance.data.title
            this.connected = true
          } else {
            this.error = 'access denied'
          }
        } else if (resp.error) {
          this.error = 'room not found'
        }
      })
      this.$extream.emit(`consumer_webrtc_get`, {
        id: this.$extreamData.itemId,
        data: {
          instance: this.meeting.id,
        },
      })
    },
  },
}
</script>
<style scoped>
.banner {
  position: fixed !important;
  z-index: 10;
  width: 100vw;
}
.fullscreen {
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
}
</style>