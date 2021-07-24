<template>
	<div id="screen" style="width: 100%;height: 100%">
	</div>
</template>

<script>
	import RFB from '@novnc/novnc/core/rfb';
	export default {
		name: 'novnc',
		data() {
			return {
				url: 'ws://192.168.43.221:5901/websockify', //链接的url
				desktopName: '',
				rfb: null
			}
		},
		methods: {
			connectedToServer(e) {
				console.log("Connected to " + this.desktopName);
			},
			disconnectedFromServer(e) {
				if (e.detail.clean) {
					console.log("Disconnected");
				} else {
					console.log("Something went wrong, connection is closed");
				}
			},
			updateDesktopName(e) {
				this.desktopName = e.detail.name;
			},
			sendCtrlAltDel() {
				this.rfb.sendCtrlAltDel();
				return false;
			},
			//连接vnc的函数
			connectVnc() {
				let rfb = new RFB(document.getElementById('screen'), this.url, {
					credentials: {
						password: '123456'
					}
				});
				rfb.addEventListener('connect', this.connectedToServer);
				rfb.addEventListener('disconnect', this.disconnectedFromServer);
				rfb.addEventListener("desktopname", this.updateDesktopName);
				// rfb.scaleViewport = true;
				// rfb.resizeSession = true;
				rfb.showDotCursor = true;
				rfb.qualityLevel = 1;
				rfb.viewOnly = false;
				this.rfb = rfb;
			}

		},
		mounted() {
			//这时已经可以获取到dom元素
			this.connectVnc()
		}
	}
</script>

<style>
</style>
