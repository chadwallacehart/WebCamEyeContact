const outputVideoElement = document.querySelector('video#output_video');

const showVidCheckbox = document.querySelector('input#show_video');
const fpsSpan = document.querySelector('span#fps');

const FRAME_RATE = 30;
const VIDEO_WIDTH = 640;    // ToDo: fix one of these and adjust based on ratio
const VIDEO_HEIGHT = 360;

// const canvasElement = document.querySelector('canvas#output_canvas');
const canvasElement = new OffscreenCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
const canvasCtx = canvasElement.getContext('2d');

/*
// stats setup
const stats = new Stats();
document.querySelector('div.container').appendChild(stats.dom);
stats.dom.style.position = 'relative';
stats.dom.style.right = '0px';
 */

async function mesh(frame, controller){
    // stats setup
    // senderStats.begin();

    canvasCtx.drawImage(frame, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

    await faceMesh.onResults(async results => {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // Show the video or a colored background
        if(showVidCheckbox.checked)
            canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        else{
            canvasCtx.fillStyle = "aqua";
            canvasCtx.fillRect(0,0, canvasElement.width, canvasElement.height);
        }

        // how to draw the mesh
        if (results.multiFaceLandmarks) {
            const THIN_LINE = 1;
            const THICK_LINE = 2;

            const GREY_CONNECTOR = {color: '#C0C0C070', lineWidth: THIN_LINE};
            const WHITE_CONNECTOR = {color: '#E0E0E0', lineWidth: THIN_LINE};
            const RED_CONNECTOR = {color: '#FF3030', lineWidth: THIN_LINE};
            const GREEN_CONNECTOR = {color: '#30FF30', lineWidth: THIN_LINE};

            for (const landmarks of results.multiFaceLandmarks) {
                drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, GREY_CONNECTOR);
                drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, WHITE_CONNECTOR);
                drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW, WHITE_CONNECTOR);
                drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_IRIS, RED_CONNECTOR);
                drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, WHITE_CONNECTOR);
                drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW, WHITE_CONNECTOR);
                drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_IRIS, RED_CONNECTOR);
                drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, WHITE_CONNECTOR);
                drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, WHITE_CONNECTOR);
            }
        }
        canvasCtx.restore();

        const meshFrame= new VideoFrame(canvasElement);
        controller.enqueue(meshFrame);
        frame.close();
    });
    await faceMesh.send({image: canvasElement})
}

const faceMesh = new FaceMesh({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }
});
faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
//faceMesh.onResults(onResults);

/*
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await faceMesh.send({image: videoElement});
    },
    // width: 1280,
    // height: 720
});
camera.start();
*/

const deviceSelect = document.querySelector('select#devices');

async function getVideo() {

    // clean up resources if switching sources
    if (window.stream)
        window.stream.getTracks().forEach(track => track.stop());

    let videoSource = videoDevices[deviceSelect.selectedIndex || 0]?.deviceId;

    const stream = await navigator.mediaDevices.getUserMedia(
        {
            video:
                {
                    height: {exact: VIDEO_HEIGHT}, width: {exact: VIDEO_WIDTH}, frameRate: FRAME_RATE,
                    deviceId: videoSource ? {exact: videoSource} : undefined
                }
        });

    window.stream = stream;

    const settings = stream.getVideoTracks()[0].getSettings();
    console.log(`Capture camera with device ${stream.getVideoTracks()[0].label} at ${settings.width}x${settings.height}`);


    // Insertable streams
    const [track] = stream.getVideoTracks();
    const processor = new MediaStreamTrackProcessor({track});

    const generator = new MediaStreamTrackGenerator({kind: 'video'});
    const outputStream = new MediaStream([generator]);
    outputVideoElement.srcObject = outputStream;

    await processor.readable.pipeThrough(new TransformStream({
        transform: (frame, controller) => mesh(frame, controller)
    })).pipeTo(generator.writable);

}

let videoDevices = [];
async function getDevices(){
    let devices = await navigator.mediaDevices.enumerateDevices();
    videoDevices = devices.filter(device=>device.kind==='videoinput');
    console.log("video devices:", videoDevices);
    videoDevices.forEach(device=>{
        const option = document.createElement('option');
        option.text = device.label;
        deviceSelect.appendChild(option);
    });
}

async function start(){
    canvasElement.height = VIDEO_HEIGHT;
    canvasElement.width = VIDEO_WIDTH;

    // create a stream and send it to replace when its starts playing
    /*
    inputVideoElement.onplaying = async ()=> {

        let lastTime = new Date();

        async function getFrames() {
            const now = inputVideoElement.currentTime;
            if (now > lastTime){
                const fps = (1/(now-lastTime)).toFixed();
                fpsSpan.textContent = `${fps} fps`;
                await faceMesh.send({image: inputVideoElement})
            }
            lastTime = now;
            // stats.update();
            requestAnimationFrame(getFrames);
        }

        await getFrames();

        // await faceMesh.send({image: videoElement})
    };
     */

    // Note: list of devices may change after first camera permission approval
    await getDevices();
    await getVideo();
}


deviceSelect.onchange = getVideo;
start().catch(err=>console.error(err));