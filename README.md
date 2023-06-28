#ac-recorder

Based on MediaRecorder and AudioContext implementation: can record audio and canvas on a web page simultaneously, and generate a video file to download locally.

🔗 Chrome support
🔗 Support Safari

## Example

To see it in action, run
```
npm install
npm run build
npm start
```

and hit "start recording", then "preview video".

## Instantiation

Instantiation parameters: constructor(targetAudio, targetCanvas)

- targetAudio: the audio element that can play audio or a '#id_name' or '.class_name' css selector
- targetCanvas: The canvas element that plays the animation or video or a '#id_name' or '.class_name' css selector

## Configuration parameters (optional)

.setOptions()

## Create recorder

.createRecorder()

## Recorder control method (main method)

```
.start()
.pause()
.resume()
.stop()

```

## other methods

```
.preview()
.closePreview()
.download()
.changeAudio()
```

## Usage

1. Import the ACRecorder class:

```
import { ACRecorder } from "./index.js";
```

2. Instantiate ACRecorder, and pass in the audio element and canvas element to be recorded:

```
let ACR = new ACRecorder(document. querySelector("#audio"), "#canvas");
```

3. Set up listening events (optional):

```
ACR.setListeners({
  start: () => {...},
  fail: () => {...},
  pause: () => {...},
  resume: () => {...},
  stop: () => {...}
});
```

4. Start recording:

```
ACR.start();
```

5. Pause recording:

```
ACR. pause();
```

6. Resume recording:

```
ACR. resume();
```

7. Stop recording:

```
ACR. stop();
```

8. Preview recorded video (optional):

```
ACR. preview();
```

9. Turn off video preview (optional):

```
ACR. closePreview();
```

10. Download recorded video (optional):

```
ACR.download();
```

11. Destroy the recorder (optional):

```
ACR.destroy();
```

## Tips

> `new AudioContext()` must be executed after a user operation, otherwise the warning "The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page" will appear, causing the audio to fail to play .