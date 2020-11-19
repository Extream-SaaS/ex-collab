<template>
  <video
    class="w-full h-full"
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
