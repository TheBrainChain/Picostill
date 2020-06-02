import React, {useEffect} from 'react'
import uPlot from 'uplot'
import './uPlot.min.css'
let uplot;
const Chart = () => {
    useEffect(() => {
        let data = [
            [1546300800, 1546387200],    // x-values (timestamps)
            [        35,         71],    // y-values (series 1)
          ];
          let opts = {
            title: "My Chart",
            id: "chart1",
            class: "my-chart",
            width: 400,
            height: 300,
            series: [
              {},
              {
                show: true,
                spanGaps: false,
                label: "RAM",
                value: (self, rawValue) => "$" + rawValue.toFixed(2),
                stroke: "red",
                width: 1,
                fill: "rgba(255, 0, 0, 0.3)",
                dash: [10, 5],
              }
            ],
          };
          let area = document.querySelector('#chartArea');
          uplot = new uPlot(opts, data, area);
    })

    return(
        <>
            {/* {uplot} */}
            {/* <div id='chart'></div> */}
        </>
    )
}

export {Chart, uplot};