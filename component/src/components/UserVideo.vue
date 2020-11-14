<template>
	<div v-if="streamManager">
		<ov-video :stream-manager="streamManager" :class="{
			active: active
		}"  />
		<div class="name"><p>{{ clientData }}</p></div>
	</div>
</template>

<script>
import OvVideo from './OvVideo';

export default {
	name: 'UserVideo',

	components: {
		OvVideo,
	},

	props: {
		streamManager: Object,
		active: {
			type: Boolean,
			default: false,
			required: false,
		},
	},

	computed: {
		clientData () {
			const { clientData } = this.getConnectionData();
			return clientData;
		},
	},

	methods: {
		getConnectionData () {
			const { connection } = this.streamManager.stream;
			const clientData = JSON.parse(connection.data.split('%/%')[0]).clientData;
			const serverData = JSON.parse(connection.data.split('%/%')[1]).serverData;
			return { clientData, serverData };
		},
	},
};
</script>
<style scoped>
.name {
	color: #6fedc3;
}
.active {
	border: 1px solid #6fedc3;
}
</style>
