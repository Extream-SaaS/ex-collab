<template>
	<video autoplay playsinline class="stream" />
</template>

<script>
export default {
	name: 'OvVideo',

	props: {
		streamManager: Object,
	},

	mounted () {
		this.streamManager.addVideoElement(this.$el);
	},
};
</script>
<style scoped>
.stream {
	border-radius: 10px;
	box-shadow: #116466 0px 3px 8px 0px;
	overflow: hidden;
	object-fit: contain;
	width: 100%;
}
</style>
