<template>
  <div>
    <v-banner
      single-line
    >{{ meeting.subject }}</v-banner>
    <web-rtc-call
      collab-url="https://collab.extream.app"
      :item-id="meeting.id"
      @close="callConnected = false"
    />
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
  }),
  beforeMount() {
    const roomId = this.$route.params.room
    this.$extream.socket.off('consumer_webrtc_get')
    this.$extream.on(`consumer_webrtc_get`, (resp) => {
      if (resp.payload && !resp.error) {
        this.meeting.subject = resp.payload.instance.data.title
      }
    })
    this.$extream.emit(`consumer_webrtc_get`, {
      id: this.$extreamData.itemId,
      data: {
        instance: roomId,
      },
    })
    this.meeting.id = roomId
  },
  methods: {
    submit () {},
  },
}
</script>
