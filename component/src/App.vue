<template>
  <v-app dark>
    <blur-hash-image v-if="unsplash" :hash="unsplash.blur_hash" :src="unsplash.urls.regular" class="cover" />
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
            :to="item.link"
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
    <v-dialog :value="(!loggedIn || loggedIn === 'false') && !roomId && !joined" persistent :width="width">
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
    <v-dialog :value="(!loggedIn || loggedIn === 'false') && roomId && !joined && !authCheck" persistent :width="width">
      <v-login @login="login" @register="register" :login-error="loginError" :reg-error="regError" :user-invited="userInvited" :invited-id="invitedId" :user-not-found="userNotFound" :register="true" :loading="loggingIn" />
    </v-dialog>
    <v-footer
      v-if="unsplash && (!loggedIn || loggedIn === 'false') && !roomId && !joined"
      padless
      absolute
      :elevation="4"
      outlined
      color="primary"
      dark
      style="z-index: 201;"
    >
      <v-card
        class="flex"
        flat
        tile
      >
        <v-card-text class="text-center">
          <span>&copy; Extream Ltd. {{ new Date().getFullYear() }}</span>
          <v-spacer></v-spacer>
          <span>Photo by <v-btn small :href="unsplash.user.links.html" target="_blank">
            {{ unsplash.user.name }}
          </v-btn> on <v-btn small href="https://unsplash.com" target="_blank">Unsplash</v-btn></span>
        </v-card-text>
      </v-card>
    </v-footer>
  </v-app>
</template>

<script>
import VLogin from './components/Login'
import VJoin from './components/Join'
import { EventBus } from '@/plugins/event-bus.js'
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
			{ title: 'Logout', link: '/logout' },
    ],
    loggedIn: false,
    roomId: null,
    joinLoading: false,
    joinAction: '',
    loginError: '',
    regError: '',
    userNotFound: false,
    userInvited: false,
    invitedId: '',
    unsplash: null,
  }),
  async beforeMount() {
    try {
      this.$extream.silentAuthenticate()
      this.loggingIn = true
    } catch {
      this.loggingIn = false
    }
    this.checkModals()
    this.unsplashRandom()
    EventBus.$on('joinNewSpace', () => {
      this.joined = false
    })
  },
  watch: {
    $route(to, from) {
      if (to.path === '/' && to.path !== from.path) {
        this.checkModals()
      }
    },
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
    async unsplashRandom() {
      const resp = await fetch('https://generator.extream.app/background/random')
      if (resp.status === 200) {
        this.unsplash = await resp.json()
      }
    },
    async checkModals() {
      this.loggedIn = localStorage.getItem('isAuthenticated')
      this.roomId = this.$route.params.room
      this.joinView = this.roomId ? 'register' : 'choice'
      this.joinAction = this.roomId ? 'Your details' : ''
      if (this.loggedIn === 'true') {
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
    async login (user) {
      this.loggingIn = true
      try {
        const { password, username } = await this.$extream.user.fetchUser(encodeURIComponent(user.username.toLowerCase()))
        await this.$extream.authenticate(encodeURIComponent(username.toLowerCase()), encodeURIComponent(password), this.$extreamData.eventId)
        this.token = this.$extream.accessToken
        localStorage.setItem('isAuthenticated', true)
        localStorage.setItem('session', JSON.stringify({
          id: this.$extream.currentUser.id,
          accessToken: this.token,
        }))
        localStorage.setItem('user', JSON.stringify(this.$extream.currentUser))
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
          emails: fields.emails.map((email) => email.toLowerCase()),
          baseURL: window.location.origin,
        },
      })
    },
    async join(fields) {
      this.joinLoading = true
      this.$router.push(`/${fields.pin.trim()}`)
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
          email: fields.email.toLowerCase(),
          username: fields.email.toLowerCase(),
          user_type: 'audience',
          user: { displayName: fields.username },
          password: Date.now(),
        })
        this.login(fields.email.toLowerCase())
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
        this.joinAction = 'Join space'
      } else if (choice === 'create') {
        this.joinAction = 'Create space'
      } else {
        this.joinAction = ''
      }
    }
  }
};
</script>
<style>
.cover {
  position: absolute !important;
  padding-bottom: 0 !important;
  z-index: 0;
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
}
.cover > span > img {
  object-fit: cover;
  max-width: 100vw;
  max-height: 100vh;
}
</style>
