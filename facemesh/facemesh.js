/*
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

import {TRIANGULATION} from './triangulation';
*/


const video = document.querySelector('video');
const captureButton = document.getElementById("capture");
const points = document.getElementById("points");

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const NUM_KEYPOINTS = 468;
const GREEN = '#32EEDB';


let model, data;

async function gum() {

    navigator.mediaDevices.getUserMedia({video: true})
        .then(function (mediaStream) {
            video.srcObject = mediaStream;
            video.onloadedmetadata = () => {
                video.play();

                // Canvas results for displaying masks
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };
        })
        .catch(function (err) {
            console.log(err.name + ": " + err.message);
        }); // always check for errors at the end.

}

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

async function inference() {


    // Pass in a video stream (or an image, canvas, or 3D tensor) to obtain an
    // array of detected faces from the MediaPipe graph. If passing in a video
    // stream, a single prediction per frame will be returned.
    const predictions = await model.estimateFaces({
        input: document.querySelector("video"),
        flipHorizontal: false, // done in CSS
        predictIrises: true
    });

    // console.log(predictions);

    data = predictions;

    if (predictions.length > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

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

        predictions.forEach(prediction => {
            const keypoints = prediction.scaledMesh;

            for (let i = 0; i < NUM_KEYPOINTS; i++) {
                const x = keypoints[i][0];
                const y = keypoints[i][1];

                ctx.fillStyle = 'rgb(0,0,0)';
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, 2 * Math.PI);
                ctx.fill();
            }

            const irises = prediction.annotations.rightEyeIris.concat(prediction.annotations.leftEyeIris);

            for (let i = 0; i < irises.length; i++) {
                const x = irises[i][0];
                const y = irises[i][1];

                ctx.fillStyle = 'rgb(200,0,0)';
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, 2 * Math.PI);
                ctx.fill();
            }


        });
    }

    inference();


}


gum();

video.addEventListener('loadedmetadata', async (event) => {
    // Load the MediaPipe Facemesh package.
    await tf.setBackend('webgl');
    model = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);

    console.log("facemesh loaded");
    canvas.style.display = "visible";
    inference().catch(err => console.error(err));
});

captureButton.addEventListener("click", () => {
    points.innerText = `Points captured: ${data[0].mesh.length}`;
    console.log(data);
});
