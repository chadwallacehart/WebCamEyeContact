const webcamElement = document.getElementById('webcam');
const classifier = knnClassifier.create();

let net;

async function app() {
    console.log('Loading mobilenet..');

    // Load the model.
    net = await mobilenet.load();
    console.log('Successfully loaded model');

    // Create an object from Tensorflow.js data API which could capture image
    // from the web camera as Tensor.
    const webcam = await tf.data.webcam(webcamElement);

    // Reads an image from the webcam and associates it with a specific class
    // index.
    const addExample = async classId => {

        for (let x = 0; x < 50; x++) {
            // Capture an image from the web camera.
            const img = await webcam.capture();

            // Get the intermediate activation of MobileNet 'conv_preds' and pass that
            // to the KNN classifier.
            const activation = net.infer(img, 'conv_preds');

            // Pass the intermediate activation to the classifier.
            classifier.addExample(activation, classId);

            // Dispose the tensor to release the memory.
            img.dispose();

            // Add some time between images so there is more variance
            setTimeout(() => {
                console.log(`Added image ${x}`);
                if(x==49)
                    console.log(activation);
            }, 100)
        }

    };

    // When clicking a button, add an example for that class.
    document.getElementById('class-a').addEventListener('click', () => addExample(0));
    document.getElementById('class-b').addEventListener('click', () => addExample(1));

    while (true) {
        if (classifier.getNumClasses() > 0) {
            const img = await webcam.capture();

            // Get the activation from mobilenet from the webcam.
            const activation = net.infer(img, 'conv_preds');
            // Get the most likely class and confidence from the classifier module.
            const result = await classifier.predictClass(activation);

            const classes = ['notouch', 'touch'];
            document.getElementById('console').innerText = `
        prediction: ${classes[result.label]}\n
        probability: ${result.confidences[result.label]}
      `;

            // Dispose the tensor to release the memory.
            img.dispose();
        }

        await tf.nextFrame();
    }
}

app();
