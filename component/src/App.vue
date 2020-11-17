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
          src="https://storage.googleapis.com/ex-assets/collab/ex-white.svg"
          transition="scale-transition"
          width="40"
        />
      </div>

      <v-spacer></v-spacer>
			<v-menu offset-y>
				<template v-if="loggedIn" v-slot:activator="{ on, attrs }">
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
    <v-dialog :value="!loggedIn" :width="width">
      <v-login @login="login" />
    </v-dialog>
  </v-app>
</template>

<script>
import VLogin from './components/Login'
export default {
  name: 'App',
  components: {
    VLogin,
  },
  data: () => ({
    items: [
			{ title: 'Logout' },
		],
	}),
  computed: {
    loggedIn() {
      return localStorage.getItem('isAuthenticated')
    },
    width () {
      switch (this.$vuetify.breakpoint.name) {
        case 'xs': return 220
        case 'sm': return 400
        case 'md': return 500
        case 'lg': return 600
      }
      return 800
    },
  },
  methods: {
    async login (user) {
        const { password, username } = await this.$extream.user.fetchUser(user.username)
        const {
          id,
          accessToken,
          accessTokenExpiresAt,
          refreshToken,
          refreshTokenExpiresAt
        } = await this.$extream.user.login(username, password, '08c3d14e-2cfe-4262-a536-f64c25310d52')
        this.token = accessToken
        await this.$extream.connect(accessToken)
        localStorage.setItem('isAuthenticated', true)
        localStorage.setItem('session', {
          id,
          accessToken,
          accessTokenExpiresAt,
          refreshToken,
          refreshTokenExpiresAt,
        })
        this.connected = true
      },
  }
};
</script>
