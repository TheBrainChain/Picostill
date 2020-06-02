import express from "express";
import fetch from "node-fetch";
import expressWs from "express-ws";
import fs from "fs";
const app = express();
expressWs(app);

let targetTemp = 164;
let breakout = false;
let prevDifference = 0;

app.use(express.static("build"));

app.ws("/arduino", function(ws, req) {
//   ws.on("message", ev => {
//     let data = JSON.parse(ev);

//     console.log(data);
//     targetTemp = parseFloat(data.newTargetTemp);
//   });

//   fetch("http://192.168.1.164/pot/0");

  setInterval(() => {
    console.log("AA")
    fetch("http://192.168.1.24/data")
      .then(res => res.text())
      .then(data => {
        console.log(data)
        let val1 = data.split("#")[1];
        let stillData = val1.split(",");
        let coilIn = stillData[0];
        let coilOut = stillData[1];
        let pot = stillData[2];
        let ambient = stillData[3];
        let psi = stillData[4];
        let currentDifference = coilIn - targetTemp;
        let dataToSend;
        if(coilOut < 88){
          dataToSend=coilIn;
        }
        else{
          dataToSend="0";
        }
        console.log(dataToSend)
        ws.send(dataToSend);
        //   JSON.stringify({
            // targetTemp,
            // coilIn,
            // coilOut,
            // pot,
            // psi
        //   })
        // );
        // if (!fs.existsSync('./server/data/datastore.json')) {
        //   fs.writeFile('./server/data/datastore.json', JSON.stringify({
        //     targetTemp: [],
        //     coilIn: [],
        //     coilOut: [],
        //     psi: []
        //   }),
        //   err => console.log(err)
        //   )
        // }else{
        //   fs.readFile("./server/data/datastore.json", (err, res) => {
        //     let fileData = JSON.parse(res);
        //     let newTargetTemp = [...fileData.targetTemp, targetTemp]
        //     let newCoilIn = [...fileData.coilIn, parseFloat(coilIn)]
        //     let newCoilOut = [...fileData.coilOut, parseFloat(coilOut)]
        //     let newPSI = [...fileData.psi, parseFloat(psi)]
  
        //     fs.writeFile(
        //       "./server/data/datastore.json",
        //       JSON.stringify({
        //         targetTemp: newTargetTemp,
        //         coilIn: newCoilIn,
        //         coilOut: newCoilOut,
        //         psi: newPSI
        //       }),
        //       err => console.log(err)
        //     );
        //     if (err) {
        //       throw err;
        //     }
        //   });
  
        // }
      
        // if (currentDifference != prevDifference) {
        //   ws.send(
        //     JSON.stringify({
        //       difference: currentDifference,
        //       targetTemp,
        //       coilIn,
        //       pot,
        //       psi
        //     })
        //   );
        //   console.log(`Difference: ${currentDifference}`);
        //   if (currentDifference < -0.6 && !breakout) {
        //     fetch("http://192.168.1.164/pot/1"); //.then(res => res.text()).then(data => console.log(data))
        //     console.log("Sending ON");
        //     breakout = true;
        //   } else if (currentDifference > -0.5 && breakout) {
        //     fetch("http://192.168.1.164/pot/0"); //.then(res => res.text()).then(data => console.log(data))
        //     console.log("Sending OFF");
        //     breakout = false;
        //   }
        //   prevDifference = currentDifference;
        // }
      })
      .catch(err => console.log(err));
  }, 2000);
});

app.listen(8080);
