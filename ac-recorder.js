/**
 * 基于MediaRecorder和AudioContext实现，能够录制网页上的audio和canvas，生成一个视频文件下载到本地。
 */
export class ACRecorder {
  options = {
    audioControl: false,
    fps: 60,
    mimeType: "video/mp4", //chrome - video/webm ; safari - video/mp4;
    saveType: "mp4",
  };

  callbacks = {
    start: null,
    fail: null,
    pause: null,
    resume: null,
    stop: null,
  };

  audio = null; //音频元素
  audioContext = null;
  sourceNode = null;
  audioStream = null;

  canvas = null; //canvas元素
  canvasStream = null;

  mediaRecorder = null; //媒体录制器
  recordingChunks = []; //数据流recordingChunks
  mediaUrl = null; //生成视频的临时访问链接
  state = 0; // 0-ready 1-recording 2-stoped

  constructor(targetAudio, targetCanvas) {
    if (typeof targetAudio === "object") {
      this.audio = targetAudio;
    } else {
      this.audio = document.querySelector(targetAudio);
    }

    if (typeof targetCanvas === "object") {
      this.canvas = targetCanvas;
    } else {
      this.canvas = document.querySelector(targetCanvas);
    }

    this.setOptions();
  }

  /**
   * 请在实例化之后，createRecorder之前调用此方法。
   * @param {Object} options
   * @param-options.audioControl: false,
   * @param-options.fps: 60,
   * @param-options.mimeType: "video/mp4", //具体使用哪种格式根据浏览器支持情况，代码会自动判断 chrome - video/webm ; safari - video/mp4;
   * @param-options.saveType: "mp4",
   */
  setOptions(options = {}) {
    if (!options.mimeType) {
      if (MediaRecorder.isTypeSupported("video/webm")) {
        // 用户正在使用 Chrome 浏览器
        this.options.mimeType = "video/webm";
        this.options.saveType = "webm";
        this.options.fps = 25;
      } else if (MediaRecorder.isTypeSupported("video/mp4")) {
        // 用户正在使用 Safari 浏览器
        this.options.mimeType = "video/mp4";
        this.options.saveType = "mp4";
        this.options.fps = 60;
      }
    }
    this.options = { ...this.options, ...options };
    console.log("this.options:", this.options);
  }

  /**
   * 获取音频流（audio） - Promise
   * https://developer.mozilla.org/zh-CN/docs/Web/API/AudioContext/createMediaElementSource
   */
  getAudioStream() {
    return new Promise((resolve, reject) => {
      // 检查浏览器是否支持 MediaRecorder API
      if (!window.MediaRecorder) {
        return reject({ msg: "MediaRecorder API is not supported" });
      }

      if (this.audioStream) {
        return resolve({ msg: "获取已存在的音频流", stream: this.audioStream });
      }

      try {
        // 创建音频上下文
        this.audioContext = new AudioContext();

        // 创建一个新的 MediaElementAudioSourceNode 对象，输入<audio>元素，对应的音频即可被播放或者修改。
        this.sourceNode = this.audioContext.createMediaElementSource(
          this.audio
        );

        // 创建一个关联着表示音频流的一个 WebRTC 对象
        let destNode = this.audioContext.createMediaStreamDestination();

        // 将 createMediaElementSource 连接到 createMediaStreamDestination，这样才能获取到音频的stream
        this.sourceNode.connect(destNode);

        // 这里要再链接一下，否则开始录制后，网页声音会静音
        this.sourceNode.connect(this.audioContext.destination);

        // 获取到音频流数据
        this.audioStream = destNode.stream;

        resolve({ msg: "获取音频流成功", stream: this.audioStream });
      } catch (err) {
        reject({ msg: "获取音频流失败", ...err });
      }
    });
  }

  /**
   * 获取视频流（canvas） - Promise
   */
  getCanvasStream() {
    return new Promise((resolve, reject) => {
      if (this.canvasStream) {
        return resolve({
          msg: "获取已存在的视频流",
          stream: this.canvasStream,
        });
      }
      try {
        this.canvasStream = this.canvas.captureStream(this.options.fps);
        resolve({ msg: "获取视频流成功", stream: this.canvasStream });
      } catch (err) {
        reject({ msg: "获取视频流失败", ...err });
      }
    });
  }

  /**
   * 合并视频（canvas）和音频（audio） - Promise
   * https://developer.mozilla.org/zh-CN/docs/Web/API/MediaRecorder
   */
  combinACStream() {
    return new Promise((resolve, reject) => {
      if (this.mediaRecorder) {
        return resolve({ mediaRecorder: this.mediaRecorder });
      }

      const { start, pause, resume, stop, fail } = this.callbacks;
      const combinedStream = new MediaStream([
        ...this.canvasStream.getTracks(),
        ...this.audioStream.getTracks(),
      ]);
      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: this.options.mimeType,
      });

      this.mediaRecorder.onstart = () => {
        start && start();
      };
      this.mediaRecorder.onpause = () => {
        pause && pause();
      };
      this.mediaRecorder.onresume = () => {
        resume && resume();
      };

      // 停止录制并保存为视频文件
      this.mediaRecorder.addEventListener("stop", () => {
        const blob = new Blob(this.recordingChunks, {
          type: this.options.mimeType,
        });
        const url = URL.createObjectURL(blob);
        this.mediaUrl = url;

        stop && stop({ blobUrl: url });
      });

      this.mediaRecorder.onerror = (event) => {
        fail &&
          fail({
            msg: `# error recording stream: ${event.error.name}`,
            ...event.error,
          });
      };

      this.mediaRecorder.addEventListener("dataavailable", (event) => {
        console.log(
          "# ondataavailable, size = " + parseInt(event.data.size / 1024) + "KB"
        );
        if (event.data.size > 0) {
          this.recordingChunks.push(event.data);
        }
      });

      return resolve({ mediaRecorder: this.mediaRecorder });
    });
  }

  /**
   * 创建媒体录制器 - Promise
   * @param {Object} listeners 录制器监听回调函数 { start, pause, resume, stop, fail }
   * @returns - { mimeType, audio, canvas, ... }
   */
  async createRecorder(listeners = {}) {
    if (typeof listeners !== "object") {
      return Promise.reject({
        msg: "listeners必须是对象，如：{ start, pause, resume, stop, fail }",
      });
    }

    this.state = 0;
    this.callbacks = { ...this.callbacks, ...listeners };

    try {
      await this.getAudioStream();
      await this.getCanvasStream();
      await this.combinACStream();
    } catch (err) {
      return reject({ msg: "创建录制器失败", ...err });
    }

    return Promise.resolve({
      audio: this.audio,
      audioSourceNode: this.sourceNode,
      audioContext: this.audioContext,
      canvas: this.canvas,
      supportMimeType: this.options.mimeType,
    });
  }

  /**开始 - Promise */
  start() {
    return new Promise((resolve, reject) => {
      if (![0, 2].includes(this.state)) {
        return reject({ msg: "请先停止录制" });
      }
      this.mediaRecorder.start();
      this.controlAudio("play");
      this.state = 1;
      this.mediaUrl = null;

      resolve({ msg: "# recorder started" });
    });
  }

  /**暂停 - Promise */
  pause() {
    return new Promise((resolve, reject) => {
      if (this.mediaRecorder.state === "recording") {
        this.mediaRecorder.pause();
        this.controlAudio("pause");
        resolve({ msg: "# recorder paused" });
      } else {
        reject({ msg: `录制器当前的状态为${this.mediaRecorder.state}` });
      }
    });
  }

  /**恢复 - Promise */
  resume() {
    return new Promise((resolve, reject) => {
      if (this.mediaRecorder.state === "paused") {
        this.mediaRecorder.resume();
        this.controlAudio("play");
        resolve({ msg: "# resume recording" });
      } else {
        reject({ msg: `录制器当前的状态为${this.mediaRecorder.state}` });
      }
    });
  }

  /**停止 - Promise */
  stop() {
    return new Promise((resolve, reject) => {
      if (this.state != 1) {
        return reject({ msg: "请先开始录制" });
      }

      this.mediaRecorder.stop();
      this.controlAudio("pause");
      this.state = 2;

      resolve({ msg: "# recorder stoped" });
    });
  }

  /**
   * 预览视频 - Promise
   * @param {String} cssText 自定义预览视频的css样式
   * @returns
   */
  preview(cssText) {
    return new Promise((resolve, reject) => {
      if (this.state != 2) {
        return reject({ msg: "请先停止录制" });
      }

      // 创建一个新的Video元素
      const video = document.createElement("video");
      video.id = "believer_ac_preview_video";
      video.style.cssText =
        cssText ||
        `
          z-index:20000;
          position:absolute;
          width: 80%;
          top:50%;
          left:50%;
          transform:translateX(-50%) translateY(-50%);
          border-radius: 16px;
      `;

      // 设置Video元素的属性
      video.src = this.mediaUrl;
      video.controls = true;
      video.autoplay = true;

      // 将Video元素添加到DOM中
      document.body.appendChild(video);

      resolve({ msg: "视频预览已打开" });
    });
  }

  /**关闭预览 */
  closePreview() {
    let previewEl = document.querySelector("#believer_ac_preview_video");
    if (previewEl) {
      document.body.removeChild(previewEl);
    }
  }

  /**下载 */
  download() {
    if (this.state != 2) {
      alert("请先停止录制");
      return;
    }
    const a = document.createElement("a");
    a.href = this.mediaUrl;
    a.download = `output.${this.options.saveType}`;
    a.click();
    this.recordingChunks = []; // 清空 recordingChunks 数组
  }

  /**（是否）从内部控制音频的播放与暂停 */
  controlAudio(type) {
    if (!this.options.audioControl) {
      return;
    }
    if (type == "play") {
      this.audio.play();
      return;
    }
    if (type == "pause") {
      this.audio.pause();
      return;
    }
  }

  /**切换音乐源 */
  changeAudio(src) {
    this.controlAudio("pause");
    this.audio.src = src;
    this.controlAudio("play");
  }
}
