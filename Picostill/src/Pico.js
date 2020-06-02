const talkToPico = (route) => {
    fetch(`http://192.168.1.185/${route}`)
    .then(res => res.text())
    .then(data => {
        if(route=='data'){
            let stillData = data.substring(1,data.length-1).split(',')
            let T1 = stillData[0]
            let T2 = stillData[1]
            let T3 = stillData[2]
            let T4 = stillData[3]
            let psi = stillData[4]
            document.querySelector(`#data1`).innerHTML=`Coil inlet: ${T1}`
            document.querySelector(`#data2`).innerHTML=`Coil outlet: ${T2}`
            document.querySelector(`#data3`).innerHTML=`Pot: ${T3}`
            document.querySelector(`#data4`).innerHTML=`Ambient: ${T4}`
            document.querySelector(`#data5`).innerHTML=`PSI: ${psi}`
        }
        else if(route=='stillstate'){
            let stillStateData = JSON.parse(data);
            console.log(stillStateData)
            document.querySelector(`#sensor_pump`).innerHTML=`Vacuum: ${stillStateData.isProgramRunning ? 'On' : 'Off'}`
            document.querySelector(`#sensor_sensors`).innerHTML=`Sensors: ${stillStateData.sensors ? 'On' : 'Off'}`
            document.querySelector(`#sensor_fan`).innerHTML=`Fan: ${stillStateData.fan ? 'On' : 'Off'}`


        }
    })
    .catch(err => console.log(err));      
}

const init = () => {
    setInterval(() => talkToPico('data'),250)
}

// window.onload = e => {
//     init()
//     talkToPico('stillstate')
// }

export default talkToPico;