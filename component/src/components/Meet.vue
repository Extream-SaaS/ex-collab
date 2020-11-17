<template>
  <div>
    <v-banner
      single-line
    >{{ meeting.subject }}</v-banner>
    
  </div>
</template>
<script>
  export default {
    data: () => ({
      meeting: {
        id: '',
        subject: '',
      },
    }),
    mounted() {
      const roomId = this.$route.params.room
      this.meeting.id = roomId
      this.meeting.subject = roomId
    },
    methods: {
      submit () {},
    },
  }
</script>
