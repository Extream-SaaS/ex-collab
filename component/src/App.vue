<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
    >
      <div class="d-flex align-center">
        <v-img
          alt="Extream"
          class="shrink mr-2"
          contain
          src="https://storage.googleapis.com/ex-assets/collab/ex-icon-1.jpg"
          transition="scale-transition"
          width="40"
        />
      </div>

      <v-spacer></v-spacer>
			<v-menu offset-y>
				<template v-slot:activator="{ on, attrs }">
					<v-btn
            icon
            x-large
						v-bind="attrs"
            v-on="on"
          >
            <v-avatar
              color="secondary"
              size="48"
            >
              <v-icon>
								mdi-account-circle
							</v-icon>
            </v-avatar>
          </v-btn>
				</template>
				<v-list>
					<v-list-item
						v-for="(item, index) in items"
						:key="index"
						link
					>
						<v-list-item-title>{{ item.title }}</v-list-item-title>
					</v-list-item>
				</v-list>
			</v-menu>
    </v-app-bar>
    <v-main>
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script>

export default {
  name: 'App',

  data: () => ({
    items: [
			{ title: 'Logout' },
		],
		loggedIn: false,
	}),
	beforeMount() {
		if (!this.loggedIn) {
			console.log('log in')
			this.$router.push({ name: 'Login' })
		}
	},
};
</script>
