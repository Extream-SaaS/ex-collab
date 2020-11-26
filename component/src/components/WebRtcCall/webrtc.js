import { OpenVidu } from 'openvidu-browser'

export default class WebRtc {
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
  