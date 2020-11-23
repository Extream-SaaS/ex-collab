<template>
  <div
    role="dialog"
    aria-modal="true"
  >
    <div
      v-if="!loading"
    >
      <template v-if="view == 'spotlight' || view == 'thumbnails'">
        <user-video
          v-if="currentSpeaker"
          :stream-manager="subscribers.find(
            (sub) => sub.stream.streamId === currentSpeaker
          )"
          :show-name="false"
          fit="object-cover"
        />
        <user-video
          v-else-if="publisher"
          :stream-manager="publisher"
          :show-name="false"
          fit="object-cover"
        />
      </template>
      <v-slide-group
        v-if="showCall && (view == 'tiled' || view == 'thumbnails')"
        :class="view"
        show-arrows
      >
        <v-slide-item
          v-if="publisher && publisher.stream"
        >
          <v-card class="ma-4 thumbnail" width="280" height="160">
            <user-video
              :stream-manager="publisher"
            />
          </v-card>
        </v-slide-item>
        <v-slide-item
          v-for="(sub, index) in subscribers"
          :key="index"
        >
          <v-card class="ma-4 thumbnail" width="280" height="160">
            <user-video
              :stream-manager="sub"
              :class="[
                currentSpeaker === sub.stream.streamId
                  ? 'border-black'
                  : 'border-white',
                currentSharer === sub.stream.streamId
                  ? 'absolute w-full z-10 left-0'
                  : 'relative',
              ]"
              :fit="
                currentSharer === sub.stream.streamId
                  ? 'object-contain'
                  : 'object-cover'
              "
            />
          </v-card>
        </v-slide-item>
        <v-dialog v-model="showInviteDialog" max-width="600px">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
                color="green"
                fab
                dark
                x-small
                v-bind="attrs"
                v-on="on"
            >
              <v-icon dark>
                mdi-plus
              </v-icon>
            </v-btn>
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
                  <v-btn class="mr-4 my-2" @click="closeModal">
                    Cancel
                  </v-btn>
                  <v-btn
                      class="mr-4 my-2"
                      type="submit"
                      :disabled="invalid || isSending"
                      :loading="isSending"
                  >
                    send
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
        :value="subscribers.length == 0 && showCall"
      >
        We are connecting your call
      </v-snackbar>
    </div>
    <div v-else>
      <base-spinner />
      <p>
        Loading
      </p>
    </div>
    <v-fade-transition>
      <v-btn-toggle rounded v-show="showCall && visibleButtons" class="buttons">
        <v-btn
          type="button"
          @click="toggleAudio"
        >
          <v-icon
            v-if="publishAudio"
            size="lg"
          >mdi-microphone</v-icon>
          <v-icon
            v-else
            size="lg"
          >mdi-microphone-off</v-icon>
        </v-btn>
        <v-btn
          type="button"
          @click="toggleVideo"
        >
          <v-icon
            v-if="publishVideo"
            size="lg"
          >mdi-video</v-icon>
          <v-icon
            v-else
            size="lg"
          >mdi-video-off</v-icon>
        </v-btn>
        <v-btn
          type="button"
          @click="toggleScreen"
        >
          <v-icon
            v-if="!publishScreen"
            size="lg"
          >mdi-laptop</v-icon>
          <v-icon
            v-else
            size="lg"
          >mdi-laptop-off</v-icon>
        </v-btn>
        <v-btn
          type="button"
          color="red"
          @click="end"
        >
          <v-icon
            size="lg"
            color="white"
          >mdi-phone-hangup</v-icon>
        </v-btn>
      </v-btn-toggle>
    </v-fade-transition>
  </div>
</template>

<script>
import { OpenVidu } from 'openvidu-browser'
import UserVideo from './sub-components/UserVideo'
import { required, email, max } from 'vee-validate/dist/rules'
import { extend, ValidationObserver, ValidationProvider } from 'vee-validate'

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
    return {
      OV: undefined,
      session: undefined,
      mainStreamManager: undefined,
      publisher: undefined,
      publishVideo: true,
      publishAudio: true,
      publishScreen: false,
      subscribers: [],
      currentSpeaker: undefined,
      currentSharer: undefined,
      user: undefined,
      showCall: true,
      exSession: JSON.parse(localStorage.getItem('session')),
      exUser: JSON.parse(localStorage.getItem('user')),
      showInviteDialog: false,
      invite: {
        emails: []
      },
      addressBook: [],
      isSending: false,
    }
  },
  watch: {
    async itemId (newVal) {
      if (newVal !== 'null') {
        this.user = await this.verifyUser(this.exSession.accessToken)
        this.joinSession()
      }
    }
  },
  async beforeMount () {
    console.log('loading before mount', this.loading)
    if (!this.loading) {
      this.user = await this.verifyUser(this.exSession.accessToken)
      this.joinSession()
    }
  },
  beforeDestroy () {
    this.leaveSession()
  },
  methods: {
    end () {
      this.leaveSession()
      this.$emit('close')
    },
    toggleVideo () {
      this.publishVideo = !this.publishVideo
      this.publisher.publishVideo(this.publishVideo)
    },
    toggleAudio () {
      this.publishAudio = !this.publishAudio
      this.publisher.publishAudio(this.publishAudio)
    },
    toggleScreen () {
      this.publishScreen = !this.publishScreen
      if (this.publishScreen) {
        this.OV.getUserMedia({
          videoSource: 'screen',
          publishVideo: true // Whether you want to start publishing with your video enabled or not
        }).then((mediaStream) => {
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
        }).catch((error) => {
          if (error.name === 'SCREEN_CAPTURE_DENIED') {
            alert('You must grant permission to share your screen')
          }
          this.publishScreen = !this.publishScreen
        })
      } else {
        this.OV.getUserMedia({
          videoSource: undefined,
          publishVideo: true, // Whether you want to start publishing with your video enabled or not
          resolution: '1280x720', // The resolution of your video
          insertMode: 'APPEND', // How the video is inserted in the target element 'video-container'
          mirror: true // Whether to mirror your local video or not
        }).then((mediaStream) => {
          const screenTrack = mediaStream.getVideoTracks()[0]
          this.publisher.replaceTrack(screenTrack)
          this.session.signal({
            data: JSON.stringify({
              sharing: this.publishScreen
            }),
            type: 'screen'
          })
        }).catch((error) => {
          if (error.name === 'SCREEN_CAPTURE_DENIED') {
            alert('You must grant permission to share your screen')
          }
          this.publishScreen = !this.publishScreen
        })
      }
    },
    missedCall () {
      this.showCall = false
      this.$emit('missed-call')
    },
    requestCallBack () {
      this.leaveSession()
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
    joinSession () {
      let interval
      console.log('joining session')
      if (this.timeOutCall) {
        interval = setTimeout(this.missedCall.bind(this), 20 * 1000)
      }
      // --- Get an OpenVidu object ---
      this.OV = new OpenVidu()
      // --- Init a session ---
      this.session = this.OV.initSession()
      // --- Specify the actions when events take place in the session ---
      // On every new Stream received...
      this.session.on('streamCreated', ({ stream }) => {
        console.log('stream created')
        if (interval) {
          clearInterval(interval)
        }
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
      this.getToken(this.itemId).then((resp) => {
        const token = resp[0]
        this.session
          .connect(token, { clientData: this.exUser.firstName })
          .then(() => {
            // --- Get your own camera stream with the desired properties ---
            const publisher = this.OV.initPublisher(undefined, {
              audioSource: undefined, // The source of audio. If undefined default microphone
              videoSource: undefined, // The source of video. If undefined default webcam
              publishAudio: true, // Whether you want to start publishing with your audio unmuted or not
              publishVideo: true, // Whether you want to start publishing with your video enabled or not
              resolution: '1280x720', // The resolution of your video
              insertMode: 'APPEND', // How the video is inserted in the target element 'video-container'
              mirror: true // Whether to mirror your local video or not
            })
            this.publisher = publisher
            // --- Publish your stream ---
            this.session.publish(this.publisher)
          })
          .catch((error) => {
            console.log(
              'There was an error connecting to the session:',
              error.code,
              error.message
            )
          })
      })
      window.addEventListener('beforeunload', this.leaveSession)
    },
    leaveSession () {
      // --- Leave the session by calling 'disconnect' method over the Session object ---
      if (this.session) this.session.disconnect()
      this.session = undefined
      this.mainStreamManager = undefined
      this.publisher = undefined
      this.subscribers = []
      this.OV = undefined
      window.removeEventListener('beforeunload', this.leaveSession)
    },
    updateMainVideoStreamManager (stream) {
      if (this.mainStreamManager === stream) return
      this.mainStreamManager = stream
    },
    async verifyUser (token) {
      const resp = await fetch(`${this.collabUrl}/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      return await resp.json()
    },
    async getToken (sessionName) {
      console.log('session name', sessionName)
      const resp = await fetch(
        `${this.collabUrl}/sessions/token`,
        {
          method: 'POST',
          body: `sessionName=${sessionName}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Authorization: `Bearer ${this.exSession.accessToken}`
          }
        }
      )
      return resp.json()
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
          instance: this.itemId,
          emails: this.invite.emails
        },
      })
    },
    closeModal() {
      this.showInviteDialog = false
    },
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