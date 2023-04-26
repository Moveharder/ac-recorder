# ac-recorder

基于 MediaRecorder 和 AudioContext 实现，能够录制网页上的 audio 和 canvas，生成一个视频文件下载到本地。

Based on MediaRecorder and AudioContext implementation, it can record audio and canvas on the web page and generate a video file to download locally.

🔗 支持 Chrome
🔗 支持 Safari（实测效果更好）

## 实例化

实例化参数： constructor(targetAudio, targetCanvas)

- targetAudio: 可播放音频的 audio 元素或是一个 '#id_name' or '.class_name' css 选择器
- targetCanvas: 播放动画或视频的 canvas 元素或是一个 '#id_name' or '.class_name' css 选择器

## 配置参数（可选）

.setOptions()

## 创建录制器

.createRecorder()

## 录制器控制方法（主要方法）

```
.start()
.pause()
.resume()
.stop()

```

## 其它方法

```
.preview()
.closePreview()
.download()
.changeAudio()
```

## Usage

1. 导入 ACRecorder 类:

```
import { ACRecorder } from "./index.js";
```

2. 实例化 ACRecorder,传入要录制的 audio 元素和 canvas 元素:

```
let ACR = new ACRecorder(document.querySelector("#audio"), "#canvas");
```

3. 设置监听事件(可选):

```
ACR.setListeners({
  start: () => {...},
  fail: () => {...},
  pause: () => {...},
  resume: () => {...},
  stop: () => {...}
});
```

4. 开始录制:

```
ACR.start();
```

5. 暂停录制:

```
ACR.pause();
```

6. 恢复录制:

```
ACR.resume();
```

7. 停止录制:

```
ACR.stop();
```

8. 预览录制视频(可选):

```
ACR.preview();
```

9. 关闭视频预览(可选):

```
ACR.closePreview();
```

10. 下载录制视频(可选):

```
ACR.download();
```

11. 销毁录制器(可选):

```
ACR.destroy();
```
