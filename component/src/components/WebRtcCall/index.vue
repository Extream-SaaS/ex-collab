<template>
  <div
    role="dialog"
    aria-modal="true"
  >
    <div>
      <div
        v-if="!loading"
      >
        <div>
          <template v-if="view == 'spotlight' || view == 'thumbnails'">
            <user-video
              v-if="currentSpeaker"
              :stream-manager="subscribers.find(
                (sub) => sub.stream.streamId === currentSpeaker
              )"
              fit="object-cover"
            />
            <user-video
              v-else
              :stream-manager="publisher"
              fit="object-cover"
            />
          </template>
          <span
            v-if="subscribers.length == 0 && showCall"
            class="text-sm"
          >
            We are connecting your call
          </span>
          <div
            v-if="showCall"
            id="video-container"
            class="flex h-128"
          >
            <template v-if="view == 'tiled' || view == 'thumbnails'">
              <user-video
                v-if="publisher"
                :stream-manager="publisher"
                class="flex-1 h-full border-white border-4"
                @click.native="updateMainVideoStreamManager(publisher)"
              />
              <user-video
                v-for="(sub, index) in subscribers"
                :key="index"
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
                class="flex-1 h-full border-4"
                @click.native="updateMainVideoStreamManager(sub)"
              />
            </template>
          </div>
          <div
            v-else
            class="flex text-center justify-around flex-col h-128"
          >
            <h1>
              There was no answer
            </h1>
            <div class="flex justify-evenly">
              <base-button
                text="Yes"
                @click.native="requestCallBack"
              />
              <base-button
                text="No"
                @click.native="$emit('close')"
              />
            </div>
          </div>
        </div>
      </div>
      <div v-else>
        <base-spinner class="w-16 mx-auto text-blue" />
        <p class="text-sm">
          Loading
        </p>
      </div>
    </div>
    <div
      v-if="showCall"
      class="bg-gray-lighter px-4 py-3 sm:px-6 w-auto ml-auto mr-auto flex justify-center"
    >
      <span class="flex w-full rounded-md sm:ml-3 sm:w-auto">
        <button
          type="button"
          class="inline-flex justify-center w-24 px-2 py-2 text-base leading-6 font-medium hover:text-red focus:outline-none transition ease-in-out duration-150 sm:text-2xl sm:leading-5"
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
        </button>
      </span>
      <span class="flex w-full rounded-md sm:ml-3 sm:w-auto">
        <button
          type="button"
          class="inline-flex justify-center w-24 px-2 py-2 text-base leading-6 font-medium hover:text-red focus:outline-none transition ease-in-out duration-150 sm:text-2xl sm:leading-5"
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
        </button>
      </span>
      <span class="flex w-full rounded-md sm:ml-3 sm:w-auto">
        <button
          type="button"
          class="inline-flex justify-center w-24 px-2 py-2 text-base leading-6 font-medium hover:text-red focus:outline-none transition ease-in-out duration-150 sm:text-2xl sm:leading-5"
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
        </button>
      </span>
    </div>
    <div class="absolute right-0 -mt-16 mr-8">
      <span class="flex w-full rounded-md sm:ml-3 sm:w-auto ml-auto">
        <button
          type="button"
          class="inline-flex justify-center rounded-full w-full px-3 py-2 text-base leading-6 font-medium hover:bg-red-lighter focus:outline-none transition ease-in-out duration-150 sm:text-2xl sm:leading-5"
          @click="end"
        >
          <v-icon
            size="lg"
          >mdi-close-octagon</v-icon>
        </button>
      </span>
    </div>
  </div>
</template>

<script>
import { OpenVidu } from 'openvidu-browser'
import UserVideo from './sub-components/UserVideo'

export default {
  name: 'WebRtcCall',
  components: {
    UserVideo
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
        this.currentSpeaker = streamId
      })
      this.session.on('publisherStopSpeaking', ({ streamId }) => {
        console.log('stop speaking stream id', streamId)
        this.currentSpeaker = null
      })
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
    }
  }
}
</script>
