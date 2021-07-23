<template>
	<div class="maintenancePlanAdd" id="maintenancePlanAdd">
		<div class="child-panel-title">
			<h2>图形标注</h2>
		</div>
		<div class="panel-body">
			<div class="demo">
				<canvas id="canvas" :width="800" :height="600"></canvas>
				<div class="draw-btn-group">
					<div title="隐藏显示">
						<i class="draw-icon icon-mouse" @click="changeOpacity"></i>
					</div>
					<div :class="{active:drawType==''}" title="自由选择" @click="drawTypeChange('')">
						<i class="draw-icon icon-mouse"></i>
					</div>
					<div :class="{active:drawType=='arrow'}" title="画箭头" @click="drawTypeChange('arrow')">
						<i class="draw-icon icon-1"></i>
					</div>
					<div :class="{active:drawType=='text'}" title="文本输入框" @click="drawTypeChange('text')">
						<i class="draw-icon icon-2"></i>
					</div>
					<div :class="{active:drawType=='ellipse'}" title="画圆" @click="drawTypeChange('ellipse')">
						<i class="draw-icon icon-3"></i>
					</div>
					<div :class="{active:drawType=='rectangle'}" title="画矩形" @click="drawTypeChange('rectangle')">
						<i class="draw-icon icon-4"></i>
					</div>
					<div :class="{active:drawType=='polygon'}" title="画多边形" @click="drawPolygon">
						<i class="draw-icon icon-6"></i>
					</div>
					<div :class="{active:drawType=='pen'}" title="笔画" @click="drawTypeChange('pen')">
						<i class="draw-icon icon-7"></i>
					</div>
					<div :class="{active:drawType=='pentagram'}" title="五角星" @click="drawTypeChange('pentagram')">
						<i class="draw-icon icon-pentagram"></i>
					</div>
					<div title="缩放重置" @click="returnBegin()">
						<i class="draw-icon icon-mouse"></i>
					</div>
					<div @click="uploadImg" title="从文件选择图片上传">
						<i class="draw-icon icon-img"></i>
					</div>
					<!--          <div @click="loadExpImg" title="加载背景图">-->
					<!--            <i class="draw-icon icon-back"></i>-->
					<!--          </div>-->
					<div @click="save" title="保存">
						<i class="draw-icon icon-save"></i>
					</div>
					<div style="margin-left: 5px;">
						<el-button type="warning" size="mini" @click="outPut">保存结果</el-button>
					</div>
					<div style="margin-left: 5px;">
						<el-button type="primary" size="mini" @click="hideResult">隐藏结果</el-button>
					</div>
					<div style="margin-left: 5px;">
						<el-button type="success" size="mini" @click="showResult">显示结果</el-button>
					</div>
					<div style="margin-left: 5px;">
						<el-button type="danger" size="mini" @click="deleteResult">删除结果</el-button>
					</div>
					<div style="margin-left: 5px;">
						<el-button type="success" size="mini" @click="resetResult">还原缩放</el-button>
					</div>
				</div>
			</div>
		</div>
		<input type="file" @change="uploadImgChange" id="imgInput" accept="image/*" />
		<img id="img" :src="imgSrc" />
		<img id="expImg" src="./assets/icons/draw/exp.jpg" />
		<el-dialog title="提示" width="500px" :visible.sync="dialogVisible">
			<el-form label-width="120px" :model="form" inline="">
				<el-form-item label="缺陷类型">
					<el-input v-model="form.defectCode"></el-input>
				</el-form-item>
				<el-form-item label="Defect Judge">
					<el-input v-model="form.defectJudge"></el-input>
				</el-form-item>
			</el-form>
			<span slot="footer" class="dialog-footer">
				<el-button @click="dialogVisible = false">取 消</el-button>
				<el-button type="primary" @click="defectConfirm">确 定</el-button>
			</span>
		</el-dialog>
	</div>
</template>
<script>
	export default {
		name: "App",
		data() {
			return {
				dialogVisible: false,
				rect: [],
				canvas: {},
				showMenu: false,
				x: "",
				y: "",

				mouseFrom: {},
				mouseTo: {},
				drawType: null, //当前绘制图像的种类
				canvasObjectIndex: 0,
				textbox: null,
				rectangleLabel: "warning",
				drawWidth: 2, //笔触宽度
				color: "#E34F51", //画笔颜色
				drawingObject: null, //当前绘制对象
				moveCount: 1, //绘制移动计数器
				doDrawing: false, // 绘制状态

				//polygon 相关参数
				polygonMode: false,
				pointArray: [],
				lineArray: [],
				activeShape: false,
				activeLine: "",
				line: {},

				delectKlass: {},
				imgFile: {},
				imgSrc: "",
				form: {},
				//缺陷标注位置点
				defectTextPoint: [],
				//缺陷点
				defectPoints: [],
				//缺陷类型
				defectCodes: '',
				//缺陷judge
				defectJudges: '',
				realX: 0,
				realY: 0,
				zoom: 1,
				height: 0,
				imgUpload: false,
				//是否拖动
				panning: false,
				//选中的元素
				actives: []
			};
		},
		watch: {
			drawType() {
				this.canvas.selection = !this.drawType;
			},
		},
		methods: {
			pointInside(point, vs) {
				// ray-casting algorithm based on
				// http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
				var x = point.x,
					y = point.y;
				var inside = false;
				for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
					var xi = vs[i].x,
						yi = vs[i].y;
					var xj = vs[j].x,
						yj = vs[j].y;

					var intersect = ((yi > y) != (yj > y)) &&
						(x < (xj - xi) * (y - yi) / (yj - yi) + xi);
					if (intersect) inside = !inside;
				}

				return inside;
			},
			defectConfirm() {
				this.dialogVisible = false
				//获取所有选中的元素
				let actives = this.getActives()
				for (var i = 0; i < actives.length; i++) {
					let item = actives[i]
					let centerWith = this.canvas.width / 2
					let centerHeight = this.canvas.height / 2
					let distance = 10000000000;
					//最靠近中心的点
					let minPoint;
					//0-左上，1-右上，2-右下，3-左下
					let location;
					//获取距中心最近的点
					if (!item.points) {
						continue;
					}
					item.points.forEach(point => {
						let xd = point.x - centerWith;
						let yd = point.y - centerHeight;
						let dist = Math.pow(xd, 2) + Math.pow(yd, 2);
						if (dist <= distance) {
							minPoint = point;
							distance = dist;
							if (xd > 0) {
								if (yd > 0) {
									location = 2
								} else {
									location = 1
								}
							} else {
								if (yd > 0) {
									location = 3
								} else {
									location = 0
								}
							}
						}
					})
					if (!minPoint) {
						continue
					}
					let codeLength = this.form.defectCode.length
					let judgeLength = this.form.defectJudge.length
					//标注最大字符长度
					let lenght = codeLength > judgeLength ? codeLength : judgeLength
					let left = minPoint.x
					let top = minPoint.y
					//判断画布中心是否在多边形内
					let inside = this.pointInside({
						x: centerWith,
						y: centerHeight
					}, item.points);
					//标注偏移值
					let widthCorrect = lenght * 10 + 20
					let heightCorrect = 40
					if (location === 0 && inside) {
						top = top - heightCorrect
						left = left - widthCorrect
					} else if (location === 1) {
						if (inside) {
							top = top - heightCorrect
						} else {
							left = left - widthCorrect
						}
					} else if (location === 2 && !inside) {
						top = top - heightCorrect
						left = left - widthCorrect
					} else if (location === 2 && inside) {
						top = top - heightCorrect
					}
					if (top < 0) {
						top = 100
					}
					if (left < 0) {
						left = 100
					}
					if (top > this.canvas.height - heightCorrect) {
						top = this.canvas.height - heightCorrect
					}
					if (left > this.canvas.width - widthCorrect) {
						left = this.canvas.width - widthCorrect
					}
					var text = new fabric.Text(this.form.defectCode + '\n' + this.form.defectJudge, {
						left: left,
						top: top,
						fontSize: 20,
						fill: '#aa00ff',
						lockMovementX: true,
						lockMovementY: true,
						selectable: false,
					});
					//删除旧的标注
					let oldText = item.mytext;
					if (oldText) {
						this.canvas.remove(oldText)
					}
					this.canvas.add(text);
					item.mytext = text
					//标注所在点
					item.textPoint = [left, top]
					item.defectCode = this.form.defectCode
					item.defectJudge = this.form.defectJudge
				}

			},
			//显示隐藏
			changeOpacity() {
				for (let i = 0; i < this.canvas.getObjects().length; i++) {
					if (this.canvas.getObjects()[i].opacity === 0) {
						this.canvas.getObjects()[i].opacity = 1
					} else if (this.canvas.getObjects()[i].opacity === 1) {
						this.canvas.getObjects()[i].opacity = 0
					}
				}
				this.canvas.requestRenderAll()

			},
			// 保存当前画布为png图片
			save() {
				var canvas = document.getElementById('canvas')
				var imgData = canvas.toDataURL('png');
				imgData = imgData.replace('image/png', 'image/octet-stream');

				// 下载后的问题名，可自由指定
				var filename = 'drawingboard_' + (new Date()).getTime() + '.' + 'png';
				this.saveFile(imgData, filename);
			},
			outPut() {
				let items = this.canvas.getObjects()
				console.log(items)
				if (!items || items.length === 0) {
					this.$message.error('请先进行标注！');
					return;
				}
				let defectTextPoint = []
				let defectPoints = []
				let defectCodes = ''
				let defectJudges = ''
				for (let index in items) {
					let item = items[index];
					if (item.mytype === 'polygon') {
						if (!item.mytext || !item.defectCode || !item.defectJudge) {
							this.$message.error('部分标注未指定缺陷类型！');
							return;
						}
						//标注多边形
						defectPoints.push(item.points.map(p => {
							return [parseFloat(p.x.toFixed(3)), parseFloat(p.y.toFixed(3))]
						}))
						defectTextPoint.push(item.textPoint)
						defectCodes += item.defectCode + ','
						defectJudges += item.defectJudge + ','
					}
				}
				if (defectCodes) {
					defectCodes = defectCodes.substring(0, defectCodes.length - 1)
				}
				if (defectJudges) {
					defectJudges = defectJudges.substring(0, defectJudges.length - 1)
				}
				this.defectPoints = defectPoints
				this.defectCodes = defectCodes
				this.defectJudges = defectJudges
				this.defectTextPoint = defectTextPoint
				console.log(defectPoints)
				console.log(defectCodes)
				console.log(defectJudges)
			},
			hideResult() {
				this.canvas.getObjects().forEach(item => {
					if (item.mytype != 'img') {
						this.canvas.remove(item)
					}
				});
			},
			deleteResult() {
				this.hideResult()
				this.defectPoints = []
				this.defectCodes = ''
				this.defectJudges = ''
			},
			resetResult() {
				this.canvas.zoomToPoint({
					x: this.realX,
					y: this.realY
				}, 1);
				let delta = new fabric.Point(-this.realX, -this.realY);
				this.canvas.relativePan(delta);
				this.zoom = 1
				this.realX = 0
				this.realY = 0
			},
			showResult() {
				this.hideResult()
				let codeArray = this.defectCodes.split(',')
				let judgeArray = this.defectJudges.split(',')
				for (var i = 0; i < this.defectPoints.length; i++) {
					let item = this.defectPoints[i];
					// let pathStr;
					// item.forEach(point => {
					// 	if (!pathStr) {
					// 		pathStr += "M "
					// 	} else {
					// 		pathStr += "L "
					// 	}
					// 	pathStr += point[0] + ' ' + point[1]
					// })
					// pathStr += " z"
					// var path = new fabric.Path(pathStr);
					// this.canvas.add(path);

					var polygon = new fabric.Polygon(item.map(p => {
						return {
							x: p[0],
							y: p[1]
						}
					}), {
						stroke: this.color,
						strokeWidth: this.drawWidth,
						fill: "rgba(255, 255, 255, 0)",
						opacity: 1,
						hasBorders: true,
						hasControls: false,
						lockMovementX: true,
						lockMovementY: true
					});
					this.canvas.add(polygon);

					//画出标注文字
					let textStr = codeArray[i] + '\n' + judgeArray[i];
					//文字标注位置
					let textPoint = this.defectTextPoint[i];
					var text = new fabric.Text(textStr, {
						left: textPoint[0],
						top: textPoint[1],
						fontSize: 20,
						fill: '#aa00ff',
						lockMovementX: true,
						lockMovementY: true,
						selectable: false,
					});
					this.canvas.add(text);
					polygon.mytype = 'polygon'
					polygon.mytext = text
					//标注所在点
					polygon.textPoint = [textPoint[0], textPoint[1]]
					polygon.defectCode = codeArray[i]
					polygon.defectJudge = judgeArray[i]
				}
			},
			saveFile(data, filename) {
				var save_link = document.createElement('a');
				save_link.href = data;
				save_link.download = filename;

				var event = document.createEvent('MouseEvents');
				event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
				save_link.dispatchEvent(event);
			},
			uploadImg() {
				document.getElementById("imgInput").click();
			},
			// 从已渲染的DOM元素加载图片至canvas
			loadExpImg() {
				var imgElement = document.getElementById("expImg"); //声明我们的图片
				var imgInstance = new fabric.Image(imgElement, {
					selectable: false
					// zIndex:-99,
				});
				this.canvas.add(imgInstance);
			},
			// 从文件加载图片至canvas
			uploadImgChange() {
				// 获取文件
				var eleImportInput = document.getElementById("imgInput");
				this.imgFile = eleImportInput.files[0];
				var imgSrc = "",
					imgTitle = "";
				// 从reader中获取选择文件的src
				if (/\.(jpe?g|png|gif)$/i.test(this.imgFile.name)) {
					var reader = new FileReader();
					var _this = this;
					reader.addEventListener(
						"load",
						function() {
							imgTitle = _this.imgFile.name;
							_this.imgSrc = this.result;
						},
						false
					);
					reader.readAsDataURL(this.imgFile);
				}
				var imgElement = document.getElementById("img"); //声明我们的图片

				imgElement.onload = () => {
					let imgWidth = imgElement.width
					let imgHeight = imgElement.height
					//按宽缩放
					let canvasWidth = this.canvas.width
					let rate = canvasWidth / imgWidth
					this.canvas.setHeight(imgHeight * rate)
					//修改画布的高度
					var imgInstance = new fabric.Image(imgElement, {
						zIndex: -1,
						selectable: false,
						scaleX: rate,
						scaleY: rate,
					});
					imgInstance.mytype = 'img'
					this.canvas.add(imgInstance);
					this.imgUpload = true
				};
			},
			// 开始绘制时，指定绘画种类
			drawTypeChange(e) {
				this.drawType = e;
				this.canvas.skipTargetFind = !!e
				if (e == "pen") {
					// isDrawingMode为true 才可以自由绘画
					this.canvas.isDrawingMode = true;
				} else {
					this.canvas.isDrawingMode = false;
				}
			},
			mousedblclick(e) {
				let actives = this.getActives()
				if (actives && actives.length > 0) {
					//判断标注类型是否相同
					let defectCode;
					let defectJudge;
					for (var i = 0; i < actives.length; i++) {
						let active = actives[i]
						if (i === 0) {
							defectCode = active.defectCode
							defectJudge = active.defectJudge
						} else if (defectCode != active.defectCode || defectJudge != active.defectJudge) {
							defectCode = ''
							defectJudge = ''
							break;
						}
					}
					this.form.defectCode = defectCode
					this.form.defectJudge = defectJudge
					this.form = JSON.parse(JSON.stringify(this.form))
					this.dialogVisible = true;
				}
			},
			mousedownbefore(e) {
				if (e.e.ctrlKey) {
					//按住ctrl时记录上次选中的元素
					this.actives = this.getActives()
				} else {
					this.actives = []
				}
			},
			//选择分组时设置为不可移动
			selectioncreated(e) {
				this.getActives().forEach(item => {
					if (item.group) {
						item.group.hasControls = false
						item.group.lockMovementX = true
						item.group.lockMovementY = true
					}
				})
			},
			// 鼠标按下时触发
			mousedown(e) {
				//按住alt键才可拖动画布
				if (e.e.altKey) {
					this.panning = true;
					this.canvas.selection = false
				}
				// 记录鼠标按下时的坐标
				var xy = e.pointer || this.transformMouse(e.e.offsetX, e.e.offsetY);
				this.mouseFrom.x = xy.x;
				this.mouseFrom.y = xy.y;
				this.doDrawing = true;
				if (this.drawType == "text") {
					this.drawing();
				}

				if (this.textbox) {
					this.textbox.enterEditing();
					this.textbox.hiddenTextarea.focus();
				}
				// 绘制多边形
				if (this.drawType == "polygon") {
					if (!this.imgUpload) {
						this.$message.error("请先导入要标注的图片！")
						return;
					}
					this.canvas.skipTargetFind = false;
					if (e.pointer.x < this.realX ||
						e.pointer.x > this.realX + this.canvas.width * this.zoom ||
						e.pointer.y < this.realY ||
						e.pointer.y > this.realY + this.canvas.height * this.zoom) {
						this.$message.error("请勿标注在图片外！")
						return;
					}
					try {
						// 此段为判断是否闭合多边形，点击红点时闭合多边形
						if (this.pointArray.length > 1) {
							// e.target.id == this.pointArray[0].id 表示点击了初始红点
							if (e.target && e.target.id == this.pointArray[0].id) { //未闭合时，target为null
								this.generatePolygon();
							}
						}
						//未点击红点则继续作画
						if (this.polygonMode) {
							this.addPoint(e);
						}
					} catch (error) {
						console.log(error);
					}
				}

				if (e.e.ctrlKey) {
					//按住ctrl时重新选中元素
					let actives = this.getActives();
					let ids = this.actives.map(item=>item.id);
					actives.forEach(item => {
						if(ids.indexOf(item.id)===-1){
							this.actives.push(item)
						}
					})
					this.mulSelect(this.actives)
				}
			},
			//多选
			mulSelect(items) {
				this.canvas.discardActiveObject();
				var sel = new fabric.ActiveSelection(items, {
					canvas: this.canvas,
				});
				this.canvas.setActiveObject(sel);
				this.canvas.requestRenderAll();
			},
			//获取选中的元素
			getActives() {
				return this.canvas.getActiveObjects();
			},
			// 鼠标松开执行
			mouseup(e) {
				this.panning = false;
				this.canvas.selection = true
				var xy = e.pointer || this.transformMouse(e.e.offsetX, e.e.offsetY);
				this.mouseTo.x = xy.x;
				this.mouseTo.y = xy.y;
				this.drawingObject = null;
				this.moveCount = 1;
				if (this.drawType != "polygon") {
					this.doDrawing = false;
				}
			},

			//鼠标移动过程中已经完成了绘制
			mousemove(e) {
				if (this.panning && e && e.e) {
					var delta = new fabric.Point(e.e.movementX, e.e.movementY);
					this.canvas.relativePan(delta);
					this.realX += e.e.movementX
					this.realY += e.e.movementY
				}
				if (this.moveCount % 2 && !this.doDrawing) {
					//减少绘制频率
					return;
				}
				this.moveCount++;
				var xy = e.pointer || this.transformMouse(e.e.offsetX, e.e.offsetY);
				this.mouseTo.x = xy.x;
				this.mouseTo.y = xy.y;
				// 多边形与文字框特殊处理
				if (this.drawType != "text" || this.drawType != "polygon") {
					this.drawing(e);
				}
				if (this.drawType == "polygon") {
					if (this.activeLine && this.activeLine.class == "line") {
						var pointer = this.canvas.getPointer(e.e);
						this.activeLine.set({
							x2: pointer.x,
							y2: pointer.y
						});
						this.canvas.renderAll();
					}
					this.canvas.renderAll();
				}
			},
			//鼠标滚轮事件
			mousewheel(e) {
				let move = (e.e.deltaY > 0 ? -0.1 : 0.1)
				if (move < 0 && this.canvas.getZoom() < 0.1 || move > 0 && this.canvas.getZoom() > 10) {
					//缩放限制10倍
					return
				}
				let zoom = (move + 1) * this.canvas.getZoom();
				this.canvas.zoomToPoint(e.pointer, zoom);
				//实时计算图像左上角的位置
				this.realX -= move * (e.pointer.x - this.realX)
				this.realY -= move * (e.pointer.y - this.realY)
				this.zoom = zoom
			},
			//回归最初值
			returnBegin() {
				this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
				// resetCanvas();
			},
			deleteObj() {
				this.getActives().map(item => {
					this.canvas.remove(item);
				});
			},
			transformMouse(mouseX, mouseY) {
				return {
					x: mouseX / 1,
					y: mouseY / 1
				};
			},
			// 绘制多边形开始，绘制多边形和其他图形不一样，需要单独处理
			drawPolygon() {
				this.drawType = "polygon";
				this.polygonMode = true;
				//这里画的多边形，由顶点与线组成
				this.pointArray = new Array(); // 顶点集合
				this.lineArray = new Array(); //线集合
				this.canvas.isDrawingMode = false; //光标
			},
			addPoint(e) {
				let random = Math.floor(Math.random() * 10000);
				let id = new Date().getTime() + random;
				//创建点
				let circle = new fabric.Circle({
					radius: 5,
					fill: "#ffffff",
					stroke: "#333333",
					class: "circle",
					strokeWidth: 0.5,
					left: ((e.pointer.x || e.e.layerX) - this.realX) / this.canvas.getZoom(),
					top: ((e.pointer.y || e.e.layerY) - this.realY) / this.canvas.getZoom(),
					selectable: false,
					hasBorders: false,
					hasControls: false,
					originX: "center",
					originY: "center",
					id: id,
					objectCaching: false
				});
				if (this.pointArray.length == 0) {
					circle.set({
						fill: "red"
					});
				}
				if (this.canvas.getObjects().length > 0) {
					if (this.canvas.getObjects()[this.canvas.getObjects().length - 1].class ===
						'circle') { //如果最后一个是圆，代表删除过一次，此时需要连接点和上次点的位置
						let lastPoints = {
							x: this.canvas.getObjects()[this.canvas.getObjects().length - 1].translateX,
							y: this.canvas.getObjects()[this.canvas.getObjects().length - 1].translateY
						}
						let points = [
							(e.pointer.x - this.realX) / this.canvas.getZoom(),
							(e.pointer.y - this.realY) / this.canvas.getZoom(),
							(lastPoints.x - this.realX) / this.canvas.getZoom(),
							(lastPoints.y - this.realY) / this.canvas.getZoom()
						];
						//创建线
						this.line = new fabric.Line(points, {
							strokeWidth: 2,
							fill: "#999999",
							stroke: "#999999",
							class: "line",
							originX: "center",
							originY: "center",
							selectable: false,
							hasBorders: false,
							hasControls: false,
							evented: false,

							objectCaching: false
						});
						this.canvas.add(this.line);
						this.lineArray.push(this.line);
					}
				}
				let points = [
					((e.pointer.x || e.e.layerX) - this.realX) / this.canvas.getZoom(),
					((e.pointer.y || e.e.layerY) - this.realY) / this.canvas.getZoom(),
					((e.pointer.x || e.e.layerX) - this.realX) / this.canvas.getZoom(),
					((e.pointer.y || e.e.layerY) - this.realY) / this.canvas.getZoom()
				];
				//创建线
				this.line = new fabric.Line(points, {
					strokeWidth: 2,
					fill: "#999999",
					stroke: "#999999",
					class: "line",
					originX: "center",
					originY: "center",
					selectable: false,
					hasBorders: false,
					hasControls: false,
					evented: false,
					objectCaching: false
				});
				this.activeLine = this.line;

				this.pointArray.push(circle);
				this.lineArray.push(this.line);
				this.canvas.add(circle);
				this.canvas.add(this.line);
			},
			//生成连接后图形
			generatePolygon() {
				let points = new Array();
				this.pointArray.map((point, index) => {
					points.push({
						x: point.left,
						y: point.top
					});
					this.canvas.remove(point);
				});
				this.lineArray.map((line, index) => {
					this.canvas.remove(line);
				});
				this.canvas.remove(this.activeShape).remove(this.activeLine);
				var polygon = new fabric.Polygon(points, {
					stroke: this.color,
					strokeWidth: this.drawWidth,
					fill: "rgba(255, 255, 255, 0)",
					opacity: 1,
					hasBorders: true,
					hasControls: false,
					lockMovementX: true,
					lockMovementY: true
				});
				let id = new Date().getTime() + Math.floor(Math.random() * 10000);
				polygon.id  = id
				polygon.mytype = 'polygon'
				this.canvas.add(polygon);

				this.activeLine = null;
				this.activeShape = null;
				this.polygonMode = false;
				this.doDrawing = false;
				this.drawType = null;
			},
			drawing(e) {
				if (this.drawingObject) {
					this.canvas.remove(this.drawingObject);
				}
				var canvasObject = null;
				var left = this.mouseFrom.x,
					top = this.mouseFrom.y,
					mouseFrom = this.mouseFrom,
					mouseTo = this.mouseTo;
				switch (this.drawType) {
					case "arrow": //箭头
						var x1 = mouseFrom.x,
							x2 = mouseTo.x,
							y1 = mouseFrom.y,
							y2 = mouseTo.y;
						var w = x2 - x1,
							h = y2 - y1,
							sh = Math.cos(Math.PI / 4) * 16;
						var sin = h / Math.sqrt(Math.pow(w, 2) + Math.pow(h, 2));
						var cos = w / Math.sqrt(Math.pow(w, 2) + Math.pow(h, 2));
						var w1 = (16 * sin) / 4,
							h1 = (16 * cos) / 4,
							centerx = sh * cos,
							centery = sh * sin;
						/**
						 * centerx,centery 表示起始点，终点连线与箭头尖端等边三角形交点相对x，y
						 * w1 ，h1用于确定四个点
						 */

						var path = " M " + x1 + " " + y1;
						path += " L " + (x2 - centerx + w1) + " " + (y2 - centery - h1);
						path +=
							" L " + (x2 - centerx + w1 * 2) + " " + (y2 - centery - h1 * 2);
						path += " L " + x2 + " " + y2;
						path +=
							" L " + (x2 - centerx - w1 * 2) + " " + (y2 - centery + h1 * 2);
						path += " L " + (x2 - centerx - w1) + " " + (y2 - centery + h1);
						path += " Z";
						canvasObject = new fabric.Path(path, {
							stroke: this.color,
							fill: this.color,
							strokeWidth: this.drawWidth
						});
						break;
					case "pentagram": //五角星
						var x1 = mouseFrom.x,
							x2 = mouseTo.x,
							y1 = mouseFrom.y,
							y2 = mouseTo.y;
						/**
						 * 实现思路  (x1,y1)表示鼠标起始的位置 (x2,y2)表示鼠标抬起的位置
						 * r 表示五边形外圈圆的半径，这里建议自己画个图理解
						 * 正五边形夹角为36度。计算出cos18°，sin18°备用
						 */
						var w = Math.abs(x2 - x1),
							h = Math.abs(y2 - y1),
							r = Math.sqrt(w * w + h * h)
						var cos18 = Math.cos(18 * Math.PI / 180)
						var sin18 = Math.sin(18 * Math.PI / 180)

						/**
						 * 算出对应五个点的坐标转化为路径
						 */
						var point1 = [x1, y1 + r]
						var point2 = [x1 + 2 * r * (sin18), y1 + r - 2 * r * (cos18)]
						var point3 = [x1 - r * (cos18), y1 + r * (sin18)]
						var point4 = [x1 + r * (cos18), y1 + r * (sin18)]
						var point5 = [x1 - 2 * r * (sin18), y1 + r - 2 * r * (cos18)]

						var path = " M " + point1[0] + " " + point1[1]
						path += " L " + point2[0] + " " + point2[1]
						path += " L " + point3[0] + " " + point3[1]
						path += " L " + point4[0] + " " + point4[1]
						path += " L " + point5[0] + " " + point5[1]
						path += " Z";
						canvasObject = new fabric.Path(path, {
							stroke: this.color,
							fill: this.color,
							strokeWidth: this.drawWidth,
							// angle:180,  //设置旋转角度
						});
						break;
					case "ellipse": //椭圆
						// 按shift时画正圆，只有在鼠标移动时才执行这个，所以按了shift但是没有拖动鼠标将不会画圆
						if (e.e.shiftKey) {
							mouseTo.x - left > mouseTo.y - top ? mouseTo.y = top + mouseTo.x - left : mouseTo.x = left +
								mouseTo.y - top
						}
						var radius =
							Math.sqrt(
								(mouseTo.x - left) * (mouseTo.x - left) +
								(mouseTo.y - top) * (mouseTo.y - top)
							) / 2;
						canvasObject = new fabric.Ellipse({
							left: (mouseTo.x - left) / 2 + left,
							top: (mouseTo.y - top) / 2 + top,
							stroke: this.color,
							fill: "rgba(255, 255, 255, 0)",
							originX: "center",
							originY: "center",
							rx: Math.abs(left - mouseTo.x) / 2,
							ry: Math.abs(top - mouseTo.y) / 2,
							strokeWidth: this.drawWidth
						});
						break;
					case "rectangle": //长方形
						// 按shift时画正方型
						if (e.e.shiftKey) {
							mouseTo.x - left > mouseTo.y - top ? mouseTo.y = top + mouseTo.x - left : mouseTo.x = left +
								mouseTo.y - top
						}
						var path =
							"M " +
							mouseFrom.x +
							" " +
							mouseFrom.y +
							" L " +
							mouseTo.x +
							" " +
							mouseFrom.y +
							" L " +
							mouseTo.x +
							" " +
							mouseTo.y +
							" L " +
							mouseFrom.x +
							" " +
							mouseTo.y +
							" L " +
							mouseFrom.x +
							" " +
							mouseFrom.y +
							" z";
						canvasObject = new fabric.Path(path, {
							left: left,
							top: top,
							stroke: this.color,
							strokeWidth: this.drawWidth,
							fill: "rgba(255, 255, 255, 0)",
							hasControls: false
						});
						//也可以使用fabric.Rect
						break;
					case "text": //文本框
						this.textbox = new fabric.Textbox("", {
							left: mouseFrom.x,
							top: mouseFrom.y - 10,
							// width: 150,
							fontSize: 16,
							borderColor: this.color,
							fill: this.color,
							hasControls: false
						});
						this.canvas.add(this.textbox);
						this.textbox.enterEditing();
						this.textbox.hiddenTextarea.focus();
						break;

					default:
						break;
				}

				if (canvasObject) {
					this.canvas.add(canvasObject); //.setActiveObject(canvasObject)
					this.drawingObject = canvasObject;
				}
			}
		},
		mounted() {
			this.canvas = new fabric.Canvas("canvas", {
				defaultCursor: 'pointer', //默认光标改成十字
				hoverCursor: 'pointer', //默认光标改成十字
				selectionColor: "rgba(0,0,0,0.05)",
				selection: true,
				preserveObjectStacking: false
			});
			this.canvas.on("selection:created", this.selectioncreated);
			this.canvas.on("mouse:down", this.mousedown);
			this.canvas.on("mouse:down:before", this.mousedownbefore);
			this.canvas.on("mouse:dblclick", this.mousedblclick);
			this.canvas.on("mouse:move", this.mousemove);
			this.canvas.on("mouse:up", this.mouseup);
			this.canvas.on("mouse:wheel", this.mousewheel);

			document.onkeydown = e => {
				// 键盘 delect删除所选元素
				if (e.keyCode == 46) {
					this.deleteObj();

				}
				// ctrl+z 删除最近添加的元素
				if (e.keyCode == 90 && e.ctrlKey) {
					for (let j = 0; j < this.canvas.getObjects().length; j++) {
						// console.log('前：' + j, this.canvas.getObjects()[j].class)
					}

					if (this.canvas.getObjects()[this.canvas.getObjects().length - 1].class === 'line') {
						this.canvas.remove( //去掉最后的line
							this.canvas.getObjects()[this.canvas.getObjects().length - 1]
						);
						this.canvas.remove( //去掉当前最后的line
							this.canvas.getObjects()[this.canvas.getObjects().length - 1]
						);
						this.canvas.remove( //去掉当前最后的line
							this.canvas.getObjects()[this.canvas.getObjects().length - 1]
						);
					} else if (this.canvas.getObjects()[this.canvas.getObjects().length - 1].class === 'circle') {
						this.canvas.remove( //去掉最后的line
							this.canvas.getObjects()[this.canvas.getObjects().length - 1]
						);
						this.canvas.remove( //去掉当前最后的line
							this.canvas.getObjects()[this.canvas.getObjects().length - 1]
						);
					}
					//去掉pointArray和lineArray数组中的最后一项
					this.pointArray.splice(this.pointArray.length - 1, 1)
					this.lineArray.splice(this.lineArray.length - 1, 1)
				}
			};
		}
	};
</script>

<style lang="scss" scoped>
	.el-container {
		flex-direction: column;
	}

	img,
	input {
		display: none;
	}

	.demo {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	canvas {
		border: 1px dashed black;
	}

	.draw-btn-group {
		// width: 1270px;
		margin-top: 10px;
		display: flex;
		align-items: center;
		justify-content: flex-start;

		&>div {
			background: #fafafa;
			cursor: pointer;

			&:hover {
				background: #eee;
			}

			i {
				display: flex;
				background-repeat: no-repeat;
				background-size: 80%;
				background-position: 50% 50%;
				height: 30px;
				width: 30px;
			}

			.icon-1 {
				background-image: url("./assets/icons/draw/1.png");
			}

			.icon-pentagram {
				background-image: url("./assets/icons/draw/pentagram.png");
			}

			.icon-2 {
				background-image: url("./assets/icons/draw/2.png");
			}

			.icon-3 {
				background-image: url("./assets/icons/draw/3.png");
			}

			.icon-4 {
				background-image: url("./assets/icons/draw/4.png");
				background-size: 75%;
			}

			.icon-5 {
				background-image: url("./assets/icons/draw/5.png");
				background-size: 70%;
			}

			.icon-6 {
				background-image: url("./assets/icons/draw/6.png");
			}

			.icon-7 {
				background-image: url("./assets/icons/draw/7.png");
				background-size: 80%;
			}

			.icon-del {
				background-image: url("./assets/icons/draw/del.png");
				background-size: 90%;
			}

			.icon-img {
				background-image: url("./assets/icons/draw/img.png");
				background-size: 80%;
			}

			.icon-back {
				background-image: url("./assets/icons/draw/back.png");
				background-size: 75%;
			}

			.icon-save {
				background-image: url("./assets/icons/draw/save.png");
				background-size: 80%;
			}

			.icon-mouse {
				background-image: url("./assets/icons/draw/mouse.png");
				background-size: 60%;
			}
		}

		.active {
			background: #eee;
		}
	}
</style>
