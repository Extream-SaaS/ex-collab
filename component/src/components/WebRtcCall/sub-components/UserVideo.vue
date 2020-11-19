<template>
  <div
    v-if="streamManager"
    class="relative"
  >
    <ov-video
      :stream-manager="streamManager"
      :fit="fit"
    />
    <div class="absolute bottom-0 right-0 bg-white bg-opacity-75 px-4 py-1">
      {{ clientData }}
    </div>
  </div>
</template>

<script>
import OvVideo from './OvVideo'

export default {
  name: 'UserVideo',
  components: {
    OvVideo
  },
  props: {
    streamManager: {
      type: Object,
      required: true
    },
    fit: {
      type: String,
      required: false,
      default: 'object-cover'
    }
  },

  computed: {
    clientData () {
      const { clientData } = this.getConnectionData()
      return clientData
    }
  },

  methods: {
    getConnectionData () {
      const { connection } = this.streamManager.stream
      const clientData = JSON.parse(connection.data.split('%/%')[0]).clientData
      const serverData = JSON.parse(connection.data.split('%/%')[1]).serverData
      return { clientData, serverData }
    }
  }
}
</script>
