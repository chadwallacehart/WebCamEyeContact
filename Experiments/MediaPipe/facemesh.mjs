const outputVideoElement = document.querySelector('video#output_video');
const popOutBtn = document.querySelector('button#pop_out');

const showVidCheckbox = document.querySelector('input#show_video');
const fpsSpan = document.querySelector('span#fps');

const FRAME_RATE = 15;
const VIDEO_HEIGHT = 180;
const PIXEL_RATIO = 16 / 9;
const VIDEO_WIDTH = VIDEO_HEIGHT * PIXEL_RATIO;

// const canvasElement = document.querySelector('canvas#output_canvas');
const canvasElement = new OffscreenCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
const canvasCtx = canvasElement.getContext('2d');

// stats setup
const stats = new Stats();
document.querySelector('#stats').appendChild(stats.dom);
stats.dom.style.position = 'relative';
stats.dom.style.right = '600px';

async function mesh(frame, controller) {
    // stats setup
    stats.begin();

    canvasCtx.drawImage(frame, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

    await faceMesh.onResults(async results => {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // Show the video or a colored background
        if (showVidCheckbox.checked)
            canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        else {
            canvasCtx.fillStyle = "aqua";
            canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
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

        const meshFrame = new VideoFrame(canvasElement);
        controller.enqueue(meshFrame);
        frame.close();

        stats.end();
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
    outputVideoElement.srcObject = new MediaStream([generator]);

    await processor.readable.pipeThrough(new TransformStream({
        transform: (frame, controller) => mesh(frame, controller)
    })).pipeTo(generator.writable);

}

let videoDevices = [];

async function getDevices() {
    let devices = await navigator.mediaDevices.enumerateDevices();
    videoDevices = devices.filter(device => device.kind === 'videoinput');
    console.log("video devices:", videoDevices);
    videoDevices.forEach(device => {
        const option = document.createElement('option');
        option.text = device.label;
        deviceSelect.appendChild(option);
    });
}

async function start() {
    canvasElement.height = VIDEO_HEIGHT;
    canvasElement.width = VIDEO_WIDTH;

    // create a stream and send it to replace when its starts playing
    outputVideoElement.onplaying = () =>
        popOutBtn.disabled = false;

    // Note: list of devices may change after first camera permission approval
    await getVideo();
}

popOutBtn.onclick = async () => {
    const PIP_HEIGHT = 180;
    let pip = await outputVideoElement.requestPictureInPicture();
    console.log(`Picture-in-Picture size: ${pip.width}x${pip.height}`);
    window.pip = pip;
    popOutBtn.disabled = true;
}

outputVideoElement.onleavepictureinpicture = () => {
    // Video element left Picture-In-Picture mode.
    console.log("PIP closed");
    popOutBtn.disabled = false;
};


if ('mediaSession' in navigator) {

    navigator.mediaSession.metadata = new MediaMetadata({
        title: 'WebCamEyeContact',
        artist: "Cogint Labs",
        album: 'Cogint Labs Greatest Hits',
        artwork: [
            {src: 'https://dummyimage.com/96x96', sizes: '96x96', type: 'image/png'},
            {src: 'https://dummyimage.com/128x128', sizes: '128x128', type: 'image/png'},
            {src: 'https://dummyimage.com/192x192', sizes: '192x192', type: 'image/png'},
            {src: 'https://dummyimage.com/256x256', sizes: '256x256', type: 'image/png'},
            {src: 'https://dummyimage.com/384x384', sizes: '384x384', type: 'image/png'},
            {src: 'https://dummyimage.com/512x512', sizes: '512x512', type: 'image/png'},
        ]
    });

    /*
    navigator.mediaSession.setActionHandler('play', ()=>console.log("play"));
    navigator.mediaSession.setActionHandler('pause', ()=>console.log("pause"));
    navigator.mediaSession.setActionHandler('seekbackward', ()=>console.log("seek back"));
    navigator.mediaSession.setActionHandler('seekforward', ()=>console.log("seek forward"));
    navigator.mediaSession.setActionHandler('seekto', ()=>console.log("seek forward"));
    navigator.mediaSession.setActionHandler('previoustrack', ()=>console.log("previous track"));
    navigator.mediaSession.setActionHandler('nexttrack', ()=>console.log("next track"));
    navigator.mediaSession.setCameraActive(true);
    navigator.mediaSession.setMicrophoneActive(true);

     */

    //     https://web.dev/media-session/
    const actionHandlers = [
        // ['play',          () => console.log("play") ],
        // ['pause',         () => console.log("pause") ],
        ['previoustrack', () => console.log("previous track")],
        ['nexttrack',     () => console.log("next track")],
        // ['stop',          () => console.log("stop") ],
        // ['seekbackward',  (details) => { /* ... */ }],
        // ['seekforward',   (details) => { /* ... */ }],
        // ['seekto',        (details) => { /* ... */ }],
        // ['togglemicrophone', () => { /* ... */ }],
        ['togglecamera',     () => {
            showVidCheckbox.checked = !showVidCheckbox.checked;
            navigator.mediaSession.setCameraActive(showVidCheckbox.checked);
        }],
        // ['hangup',           () => { /* ... */ }],
    ];

    for (const [action, handler] of actionHandlers) {
        try {
            navigator.mediaSession.setActionHandler(action, handler);
        } catch (error) {
            console.log(`The media session action "${action}" is not supported yet.`);
        }
    }

    /*
    //  https://developer.mozilla.org/en-US/docs/Web/API/MediaSession#examples
    [
        'play',
        'pause',
        'seekbackward',
        'seekforward',
        'seekto',
        'previoustrack',
        'nexttrack',
        'skipad',
        'togglemicrophone',
        'togglecamera',
        // 'hangup'
    ]
        .forEach(action => navigator.mediaSession.setActionHandler(action, () => console.log(`mediaSession.setActionHandler event: ${action}`))
        );

     */

}

await getDevices();
deviceSelect.onchange = getVideo;
start().catch(err => console.error(err));
//startBtn.onclick = async ()=> (await start()).catch(err=>console.error(err));