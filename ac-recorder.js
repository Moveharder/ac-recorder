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

    // 根据浏览器自动设置mimeType
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
  }

  /**
   * 设置媒体监听事件，用于实现个人逻辑 - Promise
   * @param {Object} listeners 录制器监听回调函数 { start, pause, resume, stop, fail }
   * @returns - { msg }
   */
  setListeners(listeners = {}) {
    return new Promise((resolve, reject) => {
      if (typeof listeners !== "object") {
        return reject({
          msg: "listeners必须是对象，如：{ start, pause, resume, stop, fail }",
        });
      }
      this.callbacks = { ...this.callbacks, ...listeners };
      resolve({ msg: "成功设置事件监听" });
    });
  }

  /**
   * 获取音频流（audio） - Promise
   * !!!注意：new AudioContext()必须在某个用户操作之后执行，
   * !!!否则会出现“The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page”警告，
   * !!!导致音频无法播放。
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
        let audioContext = new AudioContext();
        // audioContext.resume()

        // 创建一个新的 MediaElementAudioSourceNode 对象，输入<audio>元素，对应的音频即可被播放或者修改。
        let sourceNode = audioContext.createMediaElementSource(this.audio);

        // 这里要再链接一下，否则开始录制后，网页声音会静音
        sourceNode.connect(audioContext.destination);

        // 创建一个关联着表示音频流的一个 WebRTC 对象
        let mediaStreamDestination =
          audioContext.createMediaStreamDestination();

        // 将 createMediaElementSource 连接到 createMediaStreamDestination，这样才能获取到音频的stream
        sourceNode.connect(mediaStreamDestination);

        this.audioContext = audioContext;
        this.sourceNode = sourceNode;
        // 获取到音频流数据
        this.audioStream = mediaStreamDestination.stream;

        console.log("audioContext:", audioContext);
        console.log("sourceNode:", sourceNode);

        resolve({ msg: "获取音频流成功", stream: this.audioStream });
      } catch (err) {
        reject({ msg: "获取音频流失败", err });
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
    return new Promise((resolve) => {
      if (this.mediaRecorder) {
        return resolve({ mediaRecorder: this.mediaRecorder });
      }

      const { start, pause, resume, stop, fail } = this.callbacks;
      const combinedStream = new MediaStream([
        // ...this.canvasStream.getTracks(),
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
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordingChunks, {
          type: this.options.mimeType,
        });
        const url = URL.createObjectURL(blob);
        this.mediaUrl = url;

        // 计算视频大小
        let size = this.recordingChunks.reduce((total, curr) => {
          total += curr.size;
          return total;
        }, 0);

        stop && stop({ blobUrl: url, size, chunks: this.recordingChunks });
        this.recordingChunks = [];
      };
      this.mediaRecorder.onerror = (event) => {
        fail &&
          fail({
            msg: `# error recording stream: ${event.error.name}`,
            ...event.error,
          });
      };
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordingChunks.push(event.data);
        }
      };

      return resolve({ mediaRecorder: this.mediaRecorder });
    });
  }

  /**
   * 创建媒体录制器 - Promise
   * @returns - { mimeType, audio, canvas, ... }
   */
  async createRecorder() {
    this.state = 0;
    try {
      await this.getAudioStream();
      await this.getCanvasStream();
      await this.combinACStream();
    } catch (err) {
      return Promise.reject({ msg: "创建录制器失败", ...err });
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
    return new Promise(async (resolve, reject) => {
      if (![0, 2].includes(this.state)) {
        return reject({ msg: "请先停止录制" });
      }
      // !!! 受制于“new AudioContext()”的问题，必须在某个用户操作动作之后执行this.createRecorder()方法。
      await this.createRecorder();

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

  destroy() {
    this.audioContext.close();
    this.audio = null;
    this.audioContext = null;
    this.canvas = null;
    this.canvasStream = null;
    this.recordingChunks = [];
  }
}
