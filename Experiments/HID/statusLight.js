// curl -H 'Content-Type: application/json' --data '{"userId": "7be3e47b1fd6","actionFields": {"color": "green"}}' https://api.luxafor.com/webhook/v1/actions/solid_color

const lightDropdown = document.getElementById("lightsList");
const startBtn = document.getElementById("startBtn");

function luxafor(color){

    let data = {};
    data.userId = "7be3e47b1fd6";

    if(color==="black"){
        data.actionFields = {"color": "custom", "custom_color": "000000"}
    }
    else
        data.actionFields  = {"color": color};

    fetch('https://api.luxafor.com/webhook/v1/actions/solid_color', {
        method: 'POST', // or 'PUT'
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        // .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}


const buttons = document.getElementsByTagName('button');

let device;

// Luxafor functions

async function colorize(device, [r, g, b] ) {
    if(!device) return;
    const data = Uint8Array.from([ r,b,g, 0x00, 0x00, 0x40, 0x02, 0xFF22 ]);
    // 4th parameter is light control, 0 is stable, 70 is fast blink?, 100 is medium blink?
    try {
        await device.sendReport(0, data);    //If the HID device does not use report IDs, set reportId to 0.
    } catch (error) {
        console.error(error);
    }
}

async function glow(rgb) {
    //let device = await openDevice();
    await colorize(device, rgb );
}

async function handleDisconnectClick() {
    // let device = await openDevice();
    if( !device ) {
        console.log("lost device");
        return;
    }
    await colorize(device, [0,0,0]);
    await device.close();

    [...buttons].forEach(button=> button.disabled = true);
    startBtn.disabled = false;
}

async function openDevice() {
    //const vendorId = 0x2c0d; // embrava.com
    //const productId = 0x000c;  // blynclight standard

    const filters = [
        {
            // Embrava Blynclight
            vendorId: 0x2c0d, // embrava.com
            productId: 0x000c  // blynclight standard
        },
        {
            // Luxafor
            vendorId: 0x04d8, // Luxafor
            productId: 0xf372  //
        }

    ];

    let devices;
    //devices = await navigator.hid.getDevices();
    //let device = device_list.find(d => d.vendorId === vendorId && d.productId === productId);
    //console.log("authorized devices:", devices);

    devices = await navigator.hid.requestDevice({ filters });
    console.log("discovered devices:", devices);

    /*
    if (devices.length === 0) {
        devices = await navigator.hid.requestDevice({ filters });
        console.log("discovered devices:", devices);
            if( !devices ) return null;
            else {
            // device = devices[1];
            }
        }

     */

    await devices.forEach(async device => {
        console.log(device);
        let option = document.createElement('option');
        option.text = device.productName;
        lightDropdown.add(option,0);

        await device.open()
            .then(()=>console.log("opened device", device))
            .catch(err=>console.error(err));

    });


    /*
    if (!device.opened) {
        await device.open()
            .then(d=>console.log("opened device",d))
            .catch(err=>console.error(err));
    }*/


    // make Luxafor red if this work
    /*
    try {
        const data = Uint8Array.from([ 0x01, 0xFF, 0xFF0000,[0x00, 0x00, 0x00] ]);
        await device.sendReport(0, data);    //If the HID device does not use report IDs, set reportId to 0.
    } catch (error) {
        console.error(error);
    }
    */

    device = devices[0];
    window.device = device; // expose to console
    console.log("device opened:", device);
    return device;
}

startBtn.addEventListener('click', e=> {
    //for(i=0; i< buttons.length;i++)
    //    buttons[i].disabled= false;
    [...buttons].forEach(button=> button.disabled = false);
    startBtn.disabled = true;
    openDevice();
});


document.getElementById('stopBtn').addEventListener('click', handleDisconnectClick);
