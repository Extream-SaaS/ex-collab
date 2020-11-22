<template>
  <video
    class="video-holder"
    :class="fit"
    autoplay
    playsinline
  />
</template>

<script>
export default {
  name: 'OvVideo',

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

  mounted () {
    this.streamManager.addVideoElement(this.$el)
  }
}
</script>
<style scoped>
.video-holder {
  width: 100%;
  height: 100%;
}
.object-cover {
  object-fit: cover;
}
.object-contain {
  object-fit: contain;
}
</style>