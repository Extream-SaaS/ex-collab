<template>
  <div>
    <v-banner
      single-line
    >{{ meeting.subject }}</v-banner>
    <web-rtc-call
      v-if="connected"
      collab-url="https://collab.extream.app"
      :item-id="meeting.id"
      view="thumbnails"
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
