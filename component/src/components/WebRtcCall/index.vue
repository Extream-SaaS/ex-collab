<template>
  <div
    role="dialog"
    aria-modal="true"
  >
    <v-dialog v-model="showLandingDialog" max-width="600px" persistent>
      <v-card class="text-center">
        <v-card-title class="headline mb-4">
        </v-card-title>
        <v-card-subtitle class="headline mb-4">
          <span>Welcome</span>
        </v-card-subtitle>
        <p>Press JOIN when you are ready to join the space. You can mute your microphone or hide your camera in advance.</p>
        <v-card-text>
          <v-btn-toggle rounded>
            <v-tooltip bottom>
              <template v-slot:activator="{ on }">
                <v-btn
                  x-large
                  type="button"
                  @click="rtc.toggleAudio"
                  v-on="on"
                >
                  <v-icon
                    v-if="rtc.publishAudio"
                    size="lg"
                  >mdi-microphone</v-icon>
                  <v-icon
                    v-else
                    size="lg"
                  >mdi-microphone-off</v-icon>
                </v-btn>
              </template>
              <span v-if="rtc.publishAudio">Mute microphone</span>
              <span v-else>Enable microphone</span>
            </v-tooltip>
            <v-tooltip bottom>
              <template v-slot:activator="{ on }">
                <v-btn
                  x-large
                  type="button"
                  @click="rtc.toggleVideo"
                  v-on="on"
                >
                  <v-icon
                    v-if="rtc.publishVideo"
                    size="lg"
                  >mdi-video</v-icon>
                  <v-icon
                    v-else
                    size="lg"
                  >mdi-video-off</v-icon>
                </v-btn>
              </template>
              <span v-if="rtc.publishVideo">Hide video</span>
              <span v-else>Show video</span>
            </v-tooltip>
            <v-btn
              x-large
              type="button"
              color="blue lighten-2 white--text"
              @click="() => { rtc.joinSession(); showLandingDialog = false; }"
            >
             Join
            </v-btn>
          </v-btn-toggle>
        </v-card-text>
      </v-card>
    </v-dialog>
    <div
      v-if="!loading && !showLandingDialog"
    >
      <template v-if="view == 'spotlight' || view == 'thumbnails'">
        <user-video
          v-if="rtc.currentSpeaker"
          :stream-manager="rtc.subscribers.find(
            (sub) => sub.stream.streamId === rtc.currentSpeaker
          )"
          :show-name="false"
          fit="object-cover"
        />
        <user-video
          v-else-if="rtc.subscribers.length > 0"
          :stream-manager="rtc.subscribers[0]"
          :show-name="false"
          fit="object-cover"
        />
        <v-container v-else-if="!showLandingDialog && !showEndDialog" fluid>
          <v-row no-gutters style="height: calc(100vh - 256px);">
            <v-col
              align-self="center"
            >
              <v-card class="pa-md-4  mx-auto" width="400">
                <v-card-text>
                  <h2 class="mb-2">Looks like you&apos;re the first one here.</h2>
                  <h3 class="mb-2">The others should be along shortly.</h3>
                  <p>Unless it&apos;s the wrong place? Wrong time?<br />
                  Not to worry, you can join another space.</p>
                </v-card-text>
                <v-card-actions>
                  <v-btn color="blue white--text" @click="joinNewSpace">Join another space</v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </template>
      <v-slide-group
        v-if="showCall && (view == 'tiled' || view == 'thumbnails')"
        :class="view"
        show-arrows
      >
        <v-slide-item
          v-if="rtc.publisher && rtc.publisher.stream"
        >
          <v-card class="ma-4 thumbnail" width="280" height="160">
            <user-video
              :stream-manager="rtc.publisher"
            />
          </v-card>
        </v-slide-item>
        <v-slide-item
          v-for="(sub, index) in rtc.subscribers"
          :key="index"
        >
          <v-card class="ma-4 thumbnail" width="280" height="160">
            <user-video
              :stream-manager="sub"
              :class="[
                rtc.currentSpeaker === sub.stream.streamId
                  ? 'border-black'
                  : 'border-white',
                rtc.currentSharer === sub.stream.streamId
                  ? 'absolute w-full z-10 left-0'
                  : 'relative',
              ]"
              :fit="
                rtc.currentSharer === sub.stream.streamId
                  ? 'object-contain'
                  : 'object-cover'
              "
            />
          </v-card>
        </v-slide-item>
        <v-dialog v-if="rtc.session && rtc.session!== 'undefined'" v-model="showInviteDialog" max-width="600px">
          <template v-slot:activator="{ on: dialog, attrs }">
            <v-tooltip right>
              <template v-slot:activator="{ on }">
                <v-btn
                  color="green"
                  fab
                  dark
                  x-small
                  v-bind="attrs"
                  v-on="{ ...dialog, ...on }"
                >
                  <v-icon dark>
                    mdi-plus
                  </v-icon>
                </v-btn>
              </template>
              <span>Invite participants</span>
            </v-tooltip>
          </template>
          <v-card>
            <v-card-title>
              <span class="headline">Invite</span>
            </v-card-title>
            <v-card-text>
              <validation-observer ref="invite"
                                   v-slot="{ invalid }"
                                   :key="'invite'"
              >
                <v-form @submit.prevent="sendInvitation">
                  <validation-provider
                      v-slot="{ errors }"
                      name="Participants"
                      rules="required|email"
                      :key="'participants'"
                  >
                    <v-combobox
                        v-model="invite.emails"
                        :error-messages="errors"
                        :items="addressBook"
                        append-icon=""
                        label="Participants"
                        multiple
                        chips
                        deletable-chips
                        :delimiters="[',', ';', ' ']"
                        type="email"
                    ></v-combobox>
                  </validation-provider>
                  <v-btn
                      color="blue white--text"
                      class="mr-4 my-2"
                      type="submit"
                      :disabled="invalid || isSending"
                      :loading="isSending"
                  >
                    send
                  </v-btn>
                  <v-btn class="mr-4 my-2" @click="closeModal">
                    Cancel
                  </v-btn>
                </v-form>
              </validation-observer>
            </v-card-text>
          </v-card>
        </v-dialog>
      </v-slide-group>
      <div v-else>
        <h1>
          There was no answer
        </h1>
        <div>
          <base-button
            text="Yes"
            @click="requestCallBack"
          />
          <base-button
            text="No"
            @click="$emit('close')"
          />
        </div>
      </div>
      <v-snackbar
        :value="rtc.subscribers.length == 0 && showCall"
      >
        We are connecting your call
      </v-snackbar>
    </div>
    <v-container v-else>
      <v-row no-gutters style="height: calc(100vh - 256px);">
        <v-col
          align-self="center"
        >
          <v-card class="pa-md-4  mx-auto" width="400">
            <v-card-text>
              <p>Please wait while the space is loading.</p>
              <v-skeleton-loader type="image" height="32"></v-skeleton-loader>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
    <v-fade-transition>
      <v-btn-toggle rounded v-show="showCall && visibleButtons && !showLandingDialog" class="buttons">
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-btn
                type="button"
                @click="rtc.toggleAudio"
                v-on="on"
              >
                <v-icon
                  v-if="rtc.publishAudio"
                  size="lg"
                >mdi-microphone</v-icon>
                <v-icon
                  v-else
                  size="lg"
                >mdi-microphone-off</v-icon>
              </v-btn>
            </template>
            <span v-if="rtc.publishAudio">Mute microphone</span>
            <span v-else>Enable microphone</span>
          </v-tooltip>
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-btn
                type="button"
                @click="rtc.toggleVideo"
                v-on="on"
              >
                <v-icon
                  v-if="rtc.publishVideo"
                  size="lg"
                >mdi-video</v-icon>
                <v-icon
                  v-else
                  size="lg"
                >mdi-video-off</v-icon>
              </v-btn>
            </template>
            <span v-if="rtc.publishVideo">Hide video</span>
            <span v-else>Show video</span>
          </v-tooltip>
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-btn
                type="button"
                @click="rtc.toggleScreen"
                v-on="on"
              >
                <v-icon
                  v-if="!rtc.publishScreen"
                  size="lg"
                >mdi-laptop</v-icon>
                <v-icon
                  v-else
                  size="lg"
                >mdi-laptop-off</v-icon>
              </v-btn>
            </template>
            <span v-if="!rtc.publishScreen">Share screen</span>
            <span v-else>Stop sharing screen</span>
          </v-tooltip>
        <v-dialog v-model="showEndDialog" max-width="600px">
          <template v-slot:activator="{ on: dialog, attrs }">
            <v-tooltip bottom>
              <template v-slot:activator="{ on }">
                <v-btn
                    type="button"
                    color="red"
                    @click="end"
                    v-bind="attrs"
                    v-on="{...dialog, ...on}"
                >
                  <v-icon
                      size="lg"
                      color="white"
                  >mdi-phone-hangup</v-icon>
                </v-btn>
              </template>
              <span>Leave space</span>
            </v-tooltip>
          </template>
          <v-card class="pa-md-4 mx-auto">
            <v-card-title>
              <span class="headline">You have now left the space.</span>
            </v-card-title>
            <v-card-text>
            </v-card-text>
            <v-card-actions>
              <v-btn color="green--text" @click="rtc.joinNewSpace">Join another space</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-btn-toggle>
    </v-fade-transition>
  </div>
</template>

<script>
import Vue from 'vue'
import { OpenVidu } from 'openvidu-browser'
import UserVideo from './sub-components/UserVideo'
import { required, email, max } from 'vee-validate/dist/rules'
import { extend, ValidationObserver, ValidationProvider } from 'vee-validate'
import { EventBus } from '@/plugins/event-bus.js'

extend('required', {
  ...required,
  message: '{_field_} can not be empty',
})

extend('max', {
  ...max,
  message: '{_field_} may not be greater than {length} characters',
})

extend('email', {
  ...email,
  message: 'Email must be valid',
})

class WebRtc {
  constructor (collabUrl, accessToken, exUser, itemId) {
    this.collabUrl = collabUrl
    this.exUser = exUser
    this.itemId = itemId
    this.accessToken = accessToken

    this.OV = undefined
    this.session = undefined
    this.mainStreamManager = undefined
    this.publisher = undefined
    this.publishVideo = true
    this.publishAudio = true
    this.publishScreen = false
    this.subscribers = []
    this.currentSpeaker = undefined
    this.currentSharer = undefined
    this.user = undefined
  }

  async joinSession() {
          // --- Get an OpenVidu object ---
      this.OV = new OpenVidu()
      // --- Init a session ---
      this.session = this.OV.initSession()
      // --- Specify the actions when events take place in the session ---
      // On every new Stream received...
      this.session.on('streamCreated', ({ stream }) => {
        console.log('stream created')
        const subscriber = this.session.subscribe(stream)
        this.subscribers.push(subscriber)
        this.mainStreamManager = subscriber
      })
      this.session.on('signal:screen', ({ from, data, type, target }) => {
        console.log('screen share', type, target)
        if (from.stream.streamId !== this.publisher.stream.streamId) {
          const sharing = JSON.parse(data)
          if (sharing.sharing) {
            // enlarge the shared screen and stop my screen if im sharing
            if (this.publishScreen) {
              this.toggleScreen()
            }
            this.currentSharer = from.stream.streamId
          } else {
            this.currentSharer = null
          }
        }
      })
      this.session.on('publisherStartSpeaking', ({ streamId }) => {
        if (streamId !== this.publisher.streamId) {
          this.currentSpeaker = streamId
        }
      })
      // this.session.on('publisherStopSpeaking', ({ streamId }) => {
      //   this.currentSpeaker = null
      // })
      // On every Stream destroyed...
      this.session.on('streamDestroyed', ({ stream }) => {
        const index = this.subscribers.indexOf(stream.streamManager, 0)
        if (index >= 0) {
          this.subscribers.splice(index, 1)
        }
      })
      // --- Connect to the session with a valid user token ---
      try {
        const resp = await this.getToken(this.itemId)
        const token = resp[0]
        await this.session.connect(token, { clientData: this.exUser.fields.displayName || this.exUser.firstName || this.exUser.email })
        // --- Get your own camera stream with the desired properties ---
        const publisher = this.OV.initPublisher(undefined, {
          audioSource: undefined, // The source of audio. If undefined default microphone
          videoSource: undefined, // The source of video. If undefined default webcam
          publishAudio: this.publishAudio, // Whether you want to start publishing with your audio unmuted or not
          publishVideo: this.publishVideo, // Whether you want to start publishing with your video enabled or not
          resolution: '1280x720', // The resolution of your video
          insertMode: 'APPEND', // How the video is inserted in the target element 'video-container'
          mirror: true // Whether to mirror your local video or not
        })
        this.publisher = publisher
        // --- Publish your stream ---
        this.session.publish(this.publisher)
      } catch (error) {
        console.log(
          'There was an error connecting to the session:',
          error.code,
          error.message
        )
      }
      window.addEventListener('beforeunload', this.leaveSession)
  }
  leaveSession() {
    // --- Leave the session by calling 'disconnect' method over the Session object ---
    if (this.session) this.session.disconnect()
    this.session = undefined
    this.mainStreamManager = undefined
    this.publisher = undefined
    this.subscribers = []
    this.OV = undefined
    window.removeEventListener('beforeunload', this.leaveSession)
  }
  toggleVideo() {
    this.publishVideo = !this.publishVideo
    this.publisher.publishVideo(this.publishVideo)
  }
  toggleAudio() {
    this.publishAudio = !this.publishAudio
    this.publisher.publishAudio(this.publishAudio)
  }
  async toggleScreen() {
    this.publishScreen = !this.publishScreen
    if (this.publishScreen) {
      try {
        const mediaStream = await this.OV.getUserMedia({
          videoSource: 'screen',
          publishVideo: true // Whether you want to start publishing with your video enabled or not
        })
        mediaStream.addEventListener('inactive', () => {
          this.toggleScreen()
        })
        const screenTrack = mediaStream.getVideoTracks()[0]
        screenTrack.addEventListener('ended', () => {
          this.toggleScreen()
        })
        this.publisher.replaceTrack(screenTrack)
        this.session.signal({
          data: JSON.stringify({
            sharing: this.publishScreen
          }),
          type: 'screen'
        })
      } catch (error) {
        if (error.name === 'SCREEN_CAPTURE_DENIED') {
          alert('You must grant permission to share your screen')
        }
        this.publishScreen = !this.publishScreen
      }
    } else {
      try {
        const mediaStream = await this.OV.getUserMedia({
          videoSource: undefined,
          publishVideo: true, // Whether you want to start publishing with your video enabled or not
          resolution: '1280x720', // The resolution of your video
          insertMode: 'APPEND', // How the video is inserted in the target element 'video-container'
          mirror: true // Whether to mirror your local video or not
        })
        const screenTrack = mediaStream.getVideoTracks()[0]
        this.publisher.replaceTrack(screenTrack)
        this.session.signal({
          data: JSON.stringify({
            sharing: this.publishScreen
          }),
          type: 'screen'
        })
      } catch (error) {
        if (error.name === 'SCREEN_CAPTURE_DENIED') {
          alert('You must grant permission to share your screen')
        }
        this.publishScreen = !this.publishScreen
      }
    }
  }
  async getToken(sessionName) {
    console.log('session name', sessionName)
    const resp = await fetch(
      `${this.collabUrl}/sessions/token`,
      {
        method: 'POST',
        body: `sessionName=${sessionName}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Authorization: `Bearer ${this.accessToken}`
        }
      }
    )
    return resp.json()
  }
  
  async verifyUser() {
    const resp = await fetch(`${this.collabUrl}/auth/verify`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })
    return await resp.json()
  }
}

export default {
  name: 'WebRtcCall',
  components: {
    UserVideo,
    ValidationProvider,
    ValidationObserver,
  },
  props: {
    itemId: {
      type: String,
      required: true
    },
    itemSubject: {
      type: String,
      required: false,
      default: '',
    },
    collabUrl: {
      type: String,
      required: true
    },
    id: {
      type: String,
      default: null
    },
    timeOutCall: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    visibleButtons: {
      type: Boolean,
      required: true,
      default: false,
    },
    view: {
      type: String,
      default: 'tiled'
    }
  },
  data () {
    const exSession = JSON.parse(localStorage.getItem('session'))
    const exUser = JSON.parse(localStorage.getItem('user'))
    const rtc = new WebRtc(this.collabUrl, exSession.accessToken, exUser, this.itemId)
    return {
      rtc: Vue.observable(rtc),
      showCall: true,
      exSession,
      exUser,
      showInviteDialog: false,
      invite: {
        emails: []
      },
      addressBook: [],
      isSending: false,
      showLandingDialog: true,
      showEndDialog: false,
    }
  },
  watch: {
    async itemId (newVal) {
      if (newVal !== 'null') {
        console.log('watcher triggered')
        this.user = await this.rtc.verifyUser()
        this.rtc.joinSession()
      }
    }
  },
  async mounted () {
    console.log('loading mount', this.loading, this.exSession.accessToken)
    if (!this.loading) {
      this.user = await this.rtc.verifyUser()
    }
  },
  beforeDestroy () {
    this.rtc.leaveSession()
  },
  methods: {
    end () {
      this.rtc.leaveSession()
      this.$emit('close')
    },
    missedCall () {
      this.showCall = false
      this.$emit('missed-call')
    },
    requestCallBack () {
      this.rtc.leaveSession()
      this.$extreamClient.socket.off('consumer_webrtc_callback')
      this.$extreamClient.on('consumer_webrtc_callback', () => {
        this.$emit('close')
      })
      this.$extreamClient.emit('consumer_webrtc_callback', {
        id: this.id,
        data: {
          id: this.itemId,
          status: 'callback'
        }
      })
    },
    sendInvitation() {
      this.$refs['invite'].validate()
      this.isSending = true
      this.$extream.socket.off('client_webrtc_add')
      this.$extream.on(`client_webrtc_add`, (resp) => {
        if (resp.payload && !resp.error) {
          this.isSending = false
          this.invite.emails = []
          this.showInviteDialog = false
        }
      })
      this.$extream.emit(`client_webrtc_add`, {
        id: this.$extreamData.itemId,
        data: {
          title: this.itemSubject,
          instance: this.itemId,
          emails: this.invite.emails,
          baseURL: window.location.origin,
        },
      })
    },
    closeModal() {
      this.showInviteDialog = false
    },
    joinNewSpace(){
      EventBus.$emit('joinNewSpace')
      this.$router.push(`/`)
    }
  }
}
</script>
<style scoped>
.thumbnails {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  z-index: 10;
}
.buttons {
  position: fixed;
  z-index: 10;
  bottom: 180px;
  margin-left: auto;
  margin-right: auto;
  left: 0;
  right: 0;
  width: 197px;
}
.tiled {

}
.thumbnail {
  overflow: hidden;
}
</style>