# ac-recorder

基于MediaRecorder和AudioContext实现，能够录制网页上的audio和canvas，生成一个视频文件下载到本地。
Based on MediaRecorder and AudioContext implementation, it can record audio and canvas on the web page and generate a video file to download locally.

🔗 支持Chrome
🔗 支持Safari（实测效果更好）

## 实例化
实例化参数： constructor(targetAudio, targetCanvas)
- targetAudio: 可播放音频的audio元素或是一个 '#id_name' or '.class_name' css选择器
- targetCanvas: 播放动画或视频的canvas元素或是一个 '#id_name' or '.class_name' css选择器

## 配置参数（可选）
 * 2.手动配置： .setOptions() 方法

## 创建录制器
.createRecorder() 方法

## 录制器控制方法
``` 

.start() 
.pause() 
.resume() 
.stop() 
.preview()
.closePreview()
.download()
.changeAudio() 

```

## Usage
```
import { ACRecorder } from "../scripts/utils/ac_recorder";

let audio = document.querySelector('#speaker');
let canvas = document.querySelector('canvas');

// 实例化ACRecorder
ACR = new ACRecorder(audio, canvas);

// 创建录制器
ACR.createRecorder({
  start: () => { console.warn('# recorder - start') },
  fail: () => { console.warn('# recorder - fail') },
  pause: () => { console.warn('# recorder - pause') },
  resume: () => { console.warn('# recorder - resume') },
  stop: () => { console.warn('# recorder - stop') },
})

ACR.start(); // 开始录制
ACR.pause(); // 暂停录制
ACR.resume(); // 恢复录制
ACR.stop(); // 停止录制
ACR.preview(); // 预览录制视频
ACR.closePreview(); // 关闭预览录制的视频
```
