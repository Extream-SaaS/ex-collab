<template>
  <v-app dark>
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

      <!-- Provides the application the proper gutter -->
      <v-container fluid>
        <router-view></router-view>
      </v-container>
    </v-main>
    <v-dialog :value="!loggedIn && !roomId && !joined" persistent :width="width">
      <v-login @login="login" :login-error="loginError" :user-not-found="userNotFound" :loading="loggingIn" />
    </v-dialog>
    <v-dialog :value="loggedIn && !roomId && !joined && !authCheck" persistent :width="width">
      <v-join
        @choice="choice"
        @create="create"
        @join="join"
        :view="joinView"
        :roomAction="joinAction"
        :loading="joinLoading"
      />
    </v-dialog>
    <v-dialog :value="!loggedIn && roomId && !joined && !authCheck" persistent :width="width">
      <v-login @login="login" @register="register" :login-error="loginError" :reg-error="regError" :user-invited="userInvited" :invited-id="invitedId" :user-not-found="userNotFound" :register="true" :loading="loggingIn" />
    </v-dialog>
  </v-app>
</template>

<script>
import VLogin from './components/Login'
import VJoin from './components/Join'
export default {
  name: 'App',
  components: {
    VLogin,
    VJoin,
  },
  data: () => ({
    authCheck: true,
    joined: false,
    joinView: 'choice',
    loggingIn: false,
    items: [
			{ title: 'Logout' },
    ],
    loggedIn: localStorage.getItem('isAuthenticated'),
    roomId: null,
    joinLoading: false,
    joinAction: '',
    loginError: '',
    regError: '',
    userNotFound: false,
    userInvited: false,
    invitedId: '',
  }),
  async beforeMount() {
    this.roomId = this.$route.params.room
    this.joinView = this.roomId ? 'register' : 'choice'
    this.joinAction = this.roomId ? 'Your details' : ''
    if (this.loggedIn) {
      // need to reauth the user
      const { accessToken } = JSON.parse(localStorage.getItem('session'))
      try {
        const user = await this.$extream.connect(accessToken)
        localStorage.setItem('user', JSON.stringify(user))
      } catch (error) {
        this.loggedIn = false
        localStorage.setItem('isAuthenticated', false)
        localStorage.setItem('session', JSON.stringify({}))
        localStorage.setItem('user', null)
      } finally {
        this.authCheck = false
      }
    } else {
      this.authCheck = false
    }
  },
  computed: {
    width () {
      switch (this.$vuetify.breakpoint.name) {
        case 'xs': return 400
        case 'sm': return 400
        case 'md': return 500
        case 'lg': return 600
      }
      return 800
    },
  },
  methods: {
    async login (user) {
      this.loggingIn = true
      try {
        const { password, username } = await this.$extream.user.fetchUser(user.username)
        const {
          id,
          accessToken,
          accessTokenExpiresAt,
          refreshToken,
          refreshTokenExpiresAt
        } = await this.$extream.user.login(username, password, this.$extreamData.eventId)
        this.token = accessToken
        const authUser = await this.$extream.connect(accessToken)
        localStorage.setItem('isAuthenticated', true)
        localStorage.setItem('session', JSON.stringify({
          id,
          accessToken,
          accessTokenExpiresAt,
          refreshToken,
          refreshTokenExpiresAt,
        }))
        localStorage.setItem('user', JSON.stringify(authUser))
        this.loggingIn = false
        this.connected = true
        this.loggedIn = true
      } catch (error) {
        let errorCaught = false
        if (error.body) {
          const resp = await error.json()
          if (resp.error === 'user is not activated') {
            // they are invited so lets send to confirm
            this.invitedId = resp.id
            this.userInvited = true
            this.userNotFound = false
            errorCaught = true
          }
        }
        if (!errorCaught) {
          this.userInvited = false
          this.userNotFound = true
        }
        this.loggingIn = false
      }
    },
    async create(fields) {
      this.joinLoading = true
      this.$extream.socket.off('client_webrtc_start')
      this.$extream.on(`client_webrtc_start`, (resp) => {
        if (resp.payload && !resp.error) {
          this.$router.push(`/${resp.payload.data.instance}`)
          this.joinLoading = false
          this.joined = true
        }
      })
      this.$extream.emit(`client_webrtc_start`, {
        id: this.$extreamData.itemId,
        data: {
          title: fields.title,
          register: true,
          generator: 'memorable',
          emails: fields.emails,
          baseURL: window.location.origin,
        },
      })
    },
    async join(fields) {
      this.joinLoading = true
      this.$router.push(`/${fields.pin}`)
      this.joinLoading = false
      this.joined = true
    },
    async register(fields) {
      this.joinLoading = true
      console.log('register attendee', fields)
      try {
        await this.$extream.user.completeUser(fields.id, {
          firstName: fields.firstName,
          lastName: fields.lastName,
          email: fields.email,
          username: fields.email,
          user_type: 'audience',
          user: { displayName: fields.username },
          password: Date.now(),
        })
        this.login(fields.email)
      } catch (error) {
        const resp = await error.json()
        if (resp.message === 'user not found') {
          this.userNotFound = true
        } else {
          this.regError = true
        }
      }
      this.joinLoading = false
    },
    choice(choice) {
      if (choice === 'join') {
        this.joinAction = 'Join meeting'
      } else if (choice === 'create') {
        this.joinAction = 'Create meeting'
      } else {
        this.joinAction = ''
      }
    }
  }
};
</script>
