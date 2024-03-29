const video = document.querySelector('video');
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');


async function gum(){

    navigator.mediaDevices.getUserMedia({video:true})
        .then(function(mediaStream) {
            video.srcObject = mediaStream;
            video.onloadedmetadata = ()=> {
                video.play();

                // Canvas results for displaying masks
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };
        })
        .catch(function(err) { console.log(err.name + ": " + err.message); }); // always check for errors at the end.

}

function annotate(predictions){
    if (predictions.length > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < predictions.length; i++) {


            const start = predictions[i].topLeft;
            const end = predictions[i].bottomRight;
            const size = [end[0] - start[0], end[1] - start[1]];
            ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
            ctx.fillRect(start[0], start[1], size[0], size[1]);

            // annotate boxes
            const landmarks = predictions[i].landmarks;

            ctx.fillStyle = "blue";
            for (let j = 0; j < landmarks.length; j++) {
                const x = landmarks[j][0];
                const y = landmarks[j][1];
                ctx.fillRect(x, y, 5, 5);
            }

        }
    }

}

async function bf() {

    // Load the model.
    const model = await blazeface.load();

    // Pass in an image or video to the model. The model returns an array of
    // bounding boxes, probabilities, and landmarks, one for each detected face.

    const returnTensors = false; // Pass in `true` to get tensors back, rather than values.
    const predictions = await model.estimateFaces(document.querySelector("video"), returnTensors);

    if (predictions.length > 0) {

        console.log(predictions);
        /*
        `predictions` is an array of objects describing each detected face, for example:

        [
          {
            topLeft: [232.28, 145.26],
            bottomRight: [449.75, 308.36],
            probability: [0.998],
            landmarks: [
              [295.13, 177.64], // right eye
              [382.32, 175.56], // left eye
              [341.18, 205.03], // nose
              [345.12, 250.61], // mouth
              [252.76, 211.37], // right ear
              [431.20, 204.93] // left ear
            ]
          }
        ]
        */

        /*
        for (let i = 0; i < predictions.length; i++) {
            const start = predictions[i].topLeft;
            const end = predictions[i].bottomRight;
            const size = [end[0] - start[0], end[1] - start[1]];

            // Render a rectangle over each detected face.
            ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
            ctx.fillRect(start[0], start[1], size[0], size[1]);
        }*/

        annotate(predictions);
    }
    bf();
}


video.addEventListener('loadedmetadata', (event) => {
    canvas.style.display = "visible";
    bf();
});


gum();
