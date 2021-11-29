const outputVideo = document.querySelector('video.output_video');
const selfViewVideo = document.querySelector('video.self_view');
const screenShareVideo = document.querySelector('video.screen_share');
const popOutBtn = document.querySelector('button.pop_out');
const screenShareBtn = document.querySelector('button.screen_share');
const deviceSelect = document.querySelector('select#devices');

const showSelfViewVideoCheckbox = document.querySelector('input#show_video');
const flipVideoCheckbox = document.querySelector('input#flip_video');
const showScreenShareCheckbox = document.querySelector('input#show_screen_share');


const FRAME_RATE = 15;
const VIDEO_HEIGHT = 360;
const PIXEL_RATIO = 16 / 9;
const VIDEO_WIDTH = VIDEO_HEIGHT * PIXEL_RATIO;

// const canvasElement = document.querySelector('canvas#output_canvas');
const canvasElement = new OffscreenCanvas(VIDEO_WIDTH, VIDEO_HEIGHT);
const canvasCtx = canvasElement.getContext('2d');

// stats setup
const stats = new Stats();
stats.dom.style.position = 'relative';
stats.dom.style.float = 'right';
document.querySelector('#stats').appendChild(stats.dom);


/*
 *  MEdiaPipe Face Mesh setup
 */

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


// Output display controller - used in as transform
async function mesh(frame, controller) {
    // stats setup
    stats.begin();

    const flip = flipVideoCheckbox.checked ? -1: 1;


    // MediaPipe doesn't take a frame, so need to write this to a canvas
    // we could read right from the element in `new VideoFrame(canvasElement)`, but this lets us flip it too
    canvasCtx.save();
    canvasCtx.scale(flip, 1);
    canvasCtx.drawImage(frame, 0, 0, canvasElement.width * flip, canvasElement.height);
    canvasCtx.restore();


    await faceMesh.onResults(async results => {

        // Show the video or a colored background
        // ToDo: I don't understand why this doesn't work
        if(showScreenShareCheckbox.checked && screenShareStream.active){
            canvasCtx.drawImage(screenShareVideo, 0, 0, canvasElement.width, canvasElement.height);
        }
        else if (!showSelfViewVideoCheckbox.checked){
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

        const meshFrame = new VideoFrame(canvasElement);
        controller.enqueue(meshFrame);
        frame.close();

        stats.end();
    });
    await faceMesh.send({image: canvasElement})
}


outputVideo.onleavepictureinpicture = () => {
    // Video element left Picture-In-Picture mode.
    console.log("PIP closed");
    popOutBtn.disabled = false;
};

// create a stream and send it to replace when its starts playing
outputVideo.onplaying = () =>
    popOutBtn.disabled = false;


popOutBtn.onclick = async () => {
    let pip = await outputVideo.requestPictureInPicture();
    console.log(`Picture-in-Picture size: ${pip.width}x${pip.height}`);
    window.pip = pip;
    popOutBtn.disabled = true;
};


/*
 * Video player controls
 */
if ('mediaSession' in navigator) {

    navigator.mediaSession.metadata = new MediaMetadata({
        title: 'WebCamEyeContact',
        artist: "Cogint Labs",
        /*
        album: 'Cogint Labs Greatest Hits',
        artwork: [
            {src: 'https://dummyimage.com/96x96', sizes: '96x96', type: 'image/png'},
            {src: 'https://dummyimage.com/128x128', sizes: '128x128', type: 'image/png'},
            {src: 'https://dummyimage.com/192x192', sizes: '192x192', type: 'image/png'},
            {src: 'https://dummyimage.com/256x256', sizes: '256x256', type: 'image/png'},
            {src: 'https://dummyimage.com/384x384', sizes: '384x384', type: 'image/png'},
            {src: 'https://dummyimage.com/512x512', sizes: '512x512', type: 'image/png'},
        ]

 */
    });


    //     https://web.dev/media-session/
    const actionHandlers = [
        // ['play',          () => console.log("play") ],
        // ['pause',         () => console.log("pause") ],
        ['previoustrack', () => console.log("previous track")],
        ['nexttrack', () => console.log("next track")],
        ['togglecamera', () => {
            showSelfViewVideoCheckbox.checked = !showSelfViewVideoCheckbox.checked;
            navigator.mediaSession.setCameraActive(showSelfViewVideoCheckbox.checked);
        }],
        // ['stop',          () => console.log("stop") ],
        // ['seekbackward',  (details) => { /* ... */ }],
        // ['seekforward',   (details) => { /* ... */ }],
        // ['seekto',        (details) => { /* ... */ }],
        // ['togglemicrophone', () => { /* ... */ }],
        // ['hangup',           () => { /* ... */ }],
    ];

    for (const [action, handler] of actionHandlers) {
        try {
            navigator.mediaSession.setActionHandler(action, handler);
        } catch (error) {
            console.log(`The media session action "${action}" is not supported yet.`);
        }
    }

}


/*
 * Source video capture
 */

// ToDo: Handle screenshare aspect ratio and resizing
//  will need to do poll $('video.screen_share').srcObject.getVideoTracks()[0].getSettings()

// Screenshare selector
let screenShareStream = new MediaStream();
screenShareBtn.onclick = async () => {

    // clean-up resources
    screenShareStream.getTracks().forEach(track=>track.stop());

    const constraints = {
        video: {
            // height: {ideal: 720},
            frameRate: {ideal: FRAME_RATE},
        }
    };

    screenShareVideo.height = VIDEO_HEIGHT;
    screenShareStream = await navigator.mediaDevices.getDisplayMedia(constraints);
    screenShareVideo.srcObject = screenShareStream;
};


async function getVideo() {

    // clean up resources if switching sources
    if (window.stream)
        window.stream.getTracks().forEach(track => track.stop());

    let videoSource = videoDevices[deviceSelect.selectedIndex || 0]?.deviceId;

    const constraints = {
        video:
            {
                height: {ideal: VIDEO_HEIGHT},
                width: {ideal: VIDEO_WIDTH},
                frameRate: {ideal: FRAME_RATE},
                deviceId: videoSource ? {exact: videoSource} : undefined
            }
    };

    const selfViewStream = await navigator.mediaDevices.getUserMedia(constraints);
    selfViewVideo.srcObject = selfViewStream;

    const settings = selfViewStream.getVideoTracks()[0].getSettings();
    console.log(`Capture camera with device ${selfViewStream.getVideoTracks()[0].label} at ${settings.width}x${settings.height}`);



    // Insertable streams
    const [track] = selfViewStream.getVideoTracks();
    const processor = new MediaStreamTrackProcessor({track});

    const generator = new MediaStreamTrackGenerator({kind: 'video'});
    outputVideo.srcObject  = new MediaStream([generator]);

    await processor.readable.pipeThrough(new TransformStream({
        transform: (frame, controller) => mesh(frame, controller)
    })).pipeTo(generator.writable);

    window.outputStream = selfViewStream;

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

    await getDevices();

    // Note: list of devices may change after first camera permission approval
    await getVideo();
}

deviceSelect.onchange = getVideo;
start().catch(err => console.error(err));
