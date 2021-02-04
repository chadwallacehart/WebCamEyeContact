/*
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

import {TRIANGULATION} from './triangulation';
*/


const video = document.querySelector('video');
const correctBtn = document.getElementById("correct");
const incorrectBtn = document.getElementById("incorrect");
const startBtn = document.getElementById("start");

const instructionText = document.getElementById("instructions");
const samplesText = document.getElementById("samples");
const probabilityText = document.getElementById("probability");
const hid = document.getElementById("hid");


const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const NUM_KEYPOINTS = 468;
const GREEN = '#32EEDB';

const classifier = knnClassifier.create();
let model, samples = 0;
const SAMPLESPERRCLICK = 10;
const CANVAS_MULTIPLIER = 1;    // ToDo: compute this from the css size?


let showResults = false;


async function getCamera() {

    await navigator.mediaDevices.getUserMedia({video: true})
        .then(mediaStream => {
            video.srcObject = mediaStream;
            video.onloadedmetadata = () => {
                video.play();

                // Canvas results for displaying masks
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                console.log(`video dimensions: ${video.videoWidth}x${video.videoHeight}`);
                console.log(`canvas dimensions: ${canvas.width}x${canvas.height}`);

                instructionText.innerText = "Now press start to enter full screen and begin training";

            };
        })
        .catch(function (err) {
            console.log(err.name + ": " + err.message);
        }); // always check for errors at the end.

}

/*
function drawPath(ctx, points, closePath) {
    const region = new Path2D();
    region.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        const point = points[i];
        region.lineTo(point[0], point[1]);
    }

    if (closePath) {
        region.closePath();
    }
    ctx.stroke(region);
}
*/

async function addExample(classId) {
    showResults = false;

    try {
        for (let x = 0; x < SAMPLESPERRCLICK; x++) {

            const predictions = await model.estimateFaces({
                input: video,
                returnTensors: true,
                flipHorizontal: false, // done in CSS
                predictIrises: true
            });


            // const predictionTensor = tf.tensor(predictions[0].scaledMesh);
            // const predictionTensor = tf.tensor(predictions[0].scaledMesh, [478,3], 'float32');

            // Pass the intermediate activation to the classifier.
            classifier.addExample(predictions[0].scaledMesh, classId);

            // Add some time between images so there is more variance
            setTimeout(() => {
                //console.log(`Added image ${x}`);
                // if (x === 49)
                //    console.log(predictions[0].scaledMesh);
            }, 100)
        }

        console.log(`Added ${SAMPLESPERRCLICK} samples`);
        samples += SAMPLESPERRCLICK;

        const correctSamples = classifier.getClassExampleCount()["correct"] || 0;
        const incorrectSamples = classifier.getClassExampleCount()["incorrect"] || 0;

        samplesText.innerText = `Samples - Correct: ${correctSamples}, Incorrect: ${incorrectSamples}`;

        // const samples = Object.keys(classifier.getClassExampleCount()).reduce((a, c) => a + c);

        inference();
    } catch (err) {
        console.error(err)
    }

}

// Pass in a video stream (or an image, canvas, or 3D tensor) to obtain an
async function inference() {
    showResults = true;

    while (showResults) {

        // Pass in a video stream (or an image, canvas, or 3D tensor) to obtain an
        // array of detected faces from the MediaPipe graph. If passing in a video
        // stream, a single prediction per frame will be returned.
        const predictions = await model.estimateFaces({
            input: video,
            returnTensors: false,
            flipHorizontal: false, // done in CSS
            predictIrises: true
        });

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (predictions.length < 1) {
            console.log("no face detected");
            document.body.style.backgroundColor = 'rgba(0,0,220, 0.5)';
            if (hid.checked)
                glow([0, 0, 220]);

            // ToDo: this isn't working; it never starts again
            showResults = false;
            setTimeout(()=>{inference(); console.log("showing results again")}, 1000);
            break;
        }


        //ctx.globalAlpha = 0.6;
        //ctx.fillStyle = GREEN;

        /*
        `predictions` is an array of objects describing each detected face, for example:

        [
          {
            faceInViewConfidence: 1, // The probability of a face being present.
            boundingBox: { // The bounding box surrounding the face.
              topLeft: [232.28, 145.26],
              bottomRight: [449.75, 308.36],
            },
            mesh: [ // The 3D coordinates of each facial landmark.
              [92.07, 119.49, -17.54],
              [91.97, 102.52, -30.54],
              ...
            ],
            scaledMesh: [ // The 3D coordinates of each facial landmark, normalized.
              [322.32, 297.58, -17.54],
              [322.18, 263.95, -30.54]
            ],
            annotations: { // Semantic groupings of the `scaledMesh` coordinates.
              silhouette: [
                [326.19, 124.72, -3.82],
                [351.06, 126.30, -3.00],
                ...
              ],
              ...
            }
          }
        ]
        */

        // Draw the points
        predictions.forEach(prediction => {
            const keypoints = prediction.scaledMesh;

            for (let i = 0; i < NUM_KEYPOINTS; i++) {
                const x = keypoints[i][0] * CANVAS_MULTIPLIER;
                const y = keypoints[i][1] * CANVAS_MULTIPLIER;

                ctx.fillStyle = 'rgb(0,0,0)';
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, 2 * Math.PI);
                ctx.fill();
            }

            const irises = prediction.annotations.rightEyeIris.concat(prediction.annotations.leftEyeIris);

            for (let i = 0; i < irises.length; i++) {
                const x = irises[i][0] * CANVAS_MULTIPLIER;
                const y = irises[i][1] * CANVAS_MULTIPLIER;

                ctx.fillStyle = 'rgb(200,0,0)';
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, 2 * Math.PI);
                ctx.fill();
            }

        });


        //const predictionTensor = tf.tensor(predictions[0].scaledMesh, [478,3], 'float32');
        const predictionTensor = await tf.tensor(predictions[0].scaledMesh);

        //console.log(predictionTensor);
        // const samples = Object.keys(classifier.getClassExampleCount()).reduce((a, c) => a + c,0);
        if (samples > 0) {
            const result = await classifier.predictClass(predictionTensor);
            // console.log("prediction: ", result);

            const correctProbability = result.confidences["correct"] || 0;
            const incorrectProbability = result.confidences["incorrect"] || 0;


            probabilityText.innerText = `
                correct: ${correctProbability.toFixed(2) * 100}%\n
                incorrect: ${incorrectProbability.toFixed(2) * 100}%
                `;


            if (result.confidences[result.label] > 0.7) {
                if (result.label === "correct") {
                    document.body.style.backgroundColor = 'rgba(0,220,0, 0.5)';
                    if (hid.checked)
                        glow([0, 220, 0])

                }
                if (result.label === "incorrect") {
                    document.body.style.backgroundColor = 'rgba(220,0,0, 0.5)';
                    if (hid.checked)
                        glow([220, 0, 0])
                }
            } else {
                document.body.style.backgroundColor = 'rgba(220,220,220, 1)';
                if (hid.checked)
                    glow([220, 220, 220])


            }

        }

    }


}


// Load the model when the camera is ready
video.addEventListener('loadedmetadata', async (event) => {
    // Load the MediaPipe Facemesh package.

    try {
        // console message said to use cpu, not webgl but it take forever to load?
        await tf.setBackend('webgl');
        model = await faceLandmarksDetection.load(
            faceLandmarksDetection.SupportedPackages.mediapipeFacemesh, {maxFaces: 1});

        console.log("facemesh loaded");
        canvas.style.display = "visible";
        startBtn.hidden = false;

        inference();


    } catch (err) {
        console.error(err);
    }

});


startBtn.addEventListener("click", () => {
    correctBtn.hidden = false;
    incorrectBtn.hidden = false;

    instructionText.innerText = "Click on the buttons above and below to train the model";

    document.documentElement.requestFullscreen();

    startBtn.hidden = true;

});

// ToDo: Add save model function


correctBtn.addEventListener("click", () => {
    //message.innerText = `Correct`;
    // document.body.style.backgroundColor = 'rgba(0,220,0, 0.5)';
    try {
        addExample("correct");
        console.log("correct");
    } catch (err) {
        console.error(err)
    }
});

incorrectBtn.addEventListener("click", () => {
    //message.innerText = `Incorrect`;
    //document.body.style.backgroundColor = 'rgba(220,0, 0, 0.5)';
    try {
        addExample("incorrect");
        console.log("incorrect");
    } catch (err) {
        console.error(err)
    }
});


getCamera();
