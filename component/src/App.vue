<template>
	<div id="main-container">
		<div id="session" v-if="session">
			<div id="session-header">
				<h1 id="session-title">{{ mySessionId }}</h1>
				<input type="button" id="buttonLeaveSession" @click="leaveSession" value="Leave session">
			</div>
			<div id="main-video">
				<user-video :stream-manager="mainStreamManager" :active="true" />
			</div>
			<div id="video-container">
				<user-video :stream-manager="publisher" class="video" />
				<user-video v-for="(sub, index) in subscribers" :key="index" :stream-manager="sub" @click.native="updateMainVideoStreamManager(sub)" class="video" />
			</div>
		</div>
	</div>
</template>

<script>
import axios from 'axios';
import { OpenVidu } from 'openvidu-browser';
import UserVideo from './components/UserVideo';


axios.defaults.headers.post['Content-Type'] = 'application/json';

// const OPENVIDU_SERVER_URL = "https://dev.collab.extream.app";
// const OPENVIDU_SERVER_URL = "http://localhost:5442";
const OPENVIDU_SERVER_URL = "https://collab.extream.app";

export default {
	name: 'App',
	components: {
		UserVideo,
	},
	data () {
		return {
			OV: undefined,
			session: undefined,
			mainStreamManager: undefined,
			publisher: undefined,
			subscribers: [],
			mySessionId: 'SessionA',
			myUserName: 'Participant' + Math.floor(Math.random() * 100),
			user: undefined,
		}
	},
	async beforeMount() {
		const qs = new URLSearchParams(window.location.search);
		try {
			const resp = await this.verifyUser(qs.get('token'));
			this.user = resp.data;
			this.myUserName = resp.data.username;
			this.mySessionId = qs.get('item');
			this.joinSession();
		} catch (error) {
			console.log('error', error);
		}
	},
	methods: {
		joinSession () {
			// --- Get an OpenVidu object ---
			this.OV = new OpenVidu();
			// --- Init a session ---
			this.session = this.OV.initSession();
			// --- Specify the actions when events take place in the session ---
			// On every new Stream received...
			this.session.on('streamCreated', ({ stream }) => {
				console.log('stream created');
				const subscriber = this.session.subscribe(stream);
				this.subscribers.push(subscriber);
			});
			this.session.on('publisherStartSpeaking', ({ streamId }) => {
        if (this.subscribers[streamId]) {
          this.updateMainVideoStreamManager(this.subscribers[streamId])
        } else {
          this.updateMainVideoStreamManager(this.publisher)
        }
      })
      // this.session.on('publisherStopSpeaking', (stream) => {
      //   // blah
      // })
      // On every Stream destroyed...
      this.session.on('streamDestroyed', ({ stream }) => {
        if (this.subscribers[stream.streamId]) {
          this.$delete(this.subscribers, stream.streamId)
          if (this.mainStreamManager === stream) {
            this.mainStreamManager = this.prevStreamManager
          }
        }
      })
			// --- Connect to the session with a valid user token ---
			// 'getToken' method is simulating what your server-side should do.
			// 'token' parameter should be retrieved and returned by your own backend
			this.getToken(this.mySessionId).then(resp => {
				const token = resp.data[0];
				// const token = resp;
				this.session.connect(token, { clientData: this.myUserName })
					.then(() => {
						// --- Get your own camera stream with the desired properties ---
						let publisher = this.OV.initPublisher(undefined, {
							audioSource: undefined, // The source of audio. If undefined default microphone
							videoSource: undefined, // The source of video. If undefined default webcam
							publishAudio: true,  	// Whether you want to start publishing with your audio unmuted or not
							publishVideo: true,  	// Whether you want to start publishing with your video enabled or not
							resolution: '1280x720',  // The resolution of your video
							insertMode: 'APPEND',	// How the video is inserted in the target element 'video-container'
							mirror: true       	// Whether to mirror your local video or not
						});
						this.mainStreamManager = publisher;
						this.publisher = publisher;
						// --- Publish your stream ---
						this.session.publish(this.publisher);
					})
					.catch(error => {
						console.log('There was an error connecting to the session:', error.code, error.message);
					});
			});
			window.addEventListener('beforeunload', this.leaveSession)
		},
		leaveSession () {
			// --- Leave the session by calling 'disconnect' method over the Session object ---
			if (this.session) this.session.disconnect();
			this.session = undefined;
			this.mainStreamManager = undefined;
			this.publisher = undefined;
			this.subscribers = [];
			this.OV = undefined;
			window.removeEventListener('beforeunload', this.leaveSession);
		},
		updateMainVideoStreamManager (stream) {
			if (this.mainStreamManager === stream) return;
			this.mainStreamManager = stream;
		},
		verifyUser (token) {
			this.userToken = token;
			return axios.get(`${OPENVIDU_SERVER_URL}/auth/verify`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
		},
		getToken (sessionName) {
			return axios.post(`${OPENVIDU_SERVER_URL}/sessions/token`, {
				sessionName,
			},
			{
				headers: {
					Authorization: `Bearer ${this.userToken}`,
				},
			});
		},
	}
}
</script>
<style scoped>
#session-title {
	width: 50vw;
	font-size: 16px;
	color: #6fedc3;
	border: 1px solid #d1e8e2;
	display: inline-block;
	padding: 15px;
}
#buttonLeaveSession {
	background-color: #116466; /* Green */
  border: none;
  color: #6fedc3;
  padding: 16px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
	font-size: 16px;
	cursor: pointer;
}
#buttonLeaveSession:hover {
	background: #d9b08c;
	color: #116466;
}
#video-container {
	display: flex;
}
.video {
	width: 30vw;
	overflow: hidden;
	margin-right: 12px;
	flex-basis: auto;
}
</style>
