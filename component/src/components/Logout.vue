<template>
  <v-container fluid>
    <v-row no-gutters style="height: calc(100vh - 256px);">
      <v-col
        align-self="center"
      >
        <v-card class="pa-md-4  mx-auto" width="400">
          <v-card-text>
            <p>You have successfully logged out.</p>
          </v-card-text>
          <v-card-actions>
            <v-btn to="/">Login again</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
export default {
  beforeMount() {
    localStorage.setItem('isAuthenticated', false)
    localStorage.setItem('session', null)
    localStorage.setItem('user', null)
  },
}
</script>
