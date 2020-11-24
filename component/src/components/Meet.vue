<template>
  <v-container fluid>
    <div v-if="connected" class="fullscreen" @mousemove="showActionBar">
      <v-fade-transition>
        <v-banner class="banner white--text" app v-show="visibleButtons">{{ meeting.subject }}</v-banner>
      </v-fade-transition>
      <web-rtc-call
        collab-url="https://collab.extream.app"
        :item-id="meeting.id"
        view="thumbnails"
        :item-subject="meeting.subject"
        :visible-buttons="visibleButtons"
        @close="end"
      />
    </div>
    <v-container v-else-if="error">
      <v-row no-gutters style="height: calc(100vh - 256px);">
        <v-col
          align-self="center"
        >
          <v-card class="pa-md-4  mx-auto" width="400">
            <v-card-text>
              <p>{{ error }}</p>
            </v-card-text>
            <v-card-actions>
              <v-btn to="/">Join a room</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
    <v-container v-else>
      <v-row no-gutters style="height: calc(100vh - 256px);">
        <v-col
          align-self="center"
        >
          <v-card class="pa-md-4  mx-auto" width="400">
            <v-card-text>
              <p>Please wait while the room is loading.</p>
              <v-skeleton-loader type="image" height="32"></v-skeleton-loader>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-container>
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
      const session = JSON.parse(localStorage.getItem('session'))
      const userId = session.id
      this.$extream.socket.off('consumer_webrtc_get')
      this.$extream.on(`consumer_webrtc_get`, (resp) => {
        if (resp.payload && !resp.error) {
          if ([...resp.payload.instance.participants, resp.payload.instance.addedBy].includes(userId)) {
            this.meeting.subject = resp.payload.instance.data.title
            this.connected = true
          } else {
            this.error = 'Access denied. Try logging out and switching user.'
          }
        } else if (resp.error) {
          this.error = 'The room could not be found. Please check the link and try again.'
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