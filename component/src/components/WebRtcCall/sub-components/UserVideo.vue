<template>
  <v-card v-if="streamManager">
    <ov-video
      :stream-manager="streamManager"
      :fit="fit"
    />
    <v-card-subtitle class="client-name white--text" v-if="showName">
      {{ clientData }}
    </v-card-subtitle>
  </v-card>
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
    },
    showName: {
      type: Boolean,
      required: false,
      default: true,
    },
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
<style scoped>
.client-name {
  position: absolute;
  bottom: 0;
}
</style>