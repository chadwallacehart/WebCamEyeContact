window.webgazer = webgazer;

let started = false;
dataSpan = document.getElementById("coords");
startButton = document.getElementById("start");
stopButton = document.getElementById("stop");

function eyetracker() {
    webgazer.setRegression('weightedRidge')
        .setGazeListener((data, elapsedTime)=> {
            if (data == null) {
                return;
            }
            //console.log(data);
            xPct = (100.0 * data.x / window.innerWidth).toFixed(0);
            yPct = (100.0 * data.y / window.innerHeight).toFixed(0);
            // console.log(`x: ${data.x}, y: ${data.y}`);
            dataSpan.innerText =
                `Coordinates: ( ${data.x.toFixed(2)}, ${data.y.toFixed(2)} )\n` +
                `Percent:     ( ${xPct}, ${yPct} )\n` +
                `Viewport:    ( ${window.innerWidth}, ${window.innerHeight} )\n`;
        });
    webgazer.begin();
    webgazer.showPredictionPoints(true);
    webgazer.params.showVideoPreview = true;
    started = true;
}

startButton.addEventListener("click", ()=>{
   document.documentElement.requestFullscreen().catch(e=>console.error(e));
   if(!started){
       console.log("starting");
       eyetracker();
   }
   else {
       console.log("resuming");
       webgazer.resume();
   }
   startButton.hidden = true;
   stopButton.hidden = false;
});



stopButton.addEventListener("click", ()=>{
    console.log("stopping");
    document.exitFullscreen().catch(e=>console.error(e));
    webgazer.pause();
    startButton.hidden = false;
    stopButton.hidden = true;
});
