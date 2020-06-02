import "bootstrap/dist/css/bootstrap.min.css";

import React, { useEffect, useState } from "react";
import {
  Button,
  Container,
  Row,
  Col,
  InputGroup,
  FormControl,
  ListGroup,
  Card
} from "react-bootstrap";

import { line } from "d3-shape";
import { select } from "d3-selection";
import { scaleLinear, scaleOrdinal } from "d3-scale";
import { axisBottom, axisLeft, axisRight } from "d3-axis";
import * as d3 from "d3";
import { legendColor } from "d3-svg-legend";
let ws = new WebSocket(`ws://localhost:8080/echo`);

var margin = { top: 50, right: 30, bottom: 30, left: 30 },
  width = 1000 - margin.left - margin.right,
  height = 400 - margin.top - margin.bottom;
var svg;
const App = () => {
  const [pot, setPot] = useState(0);
  const [difference, setDifference] = useState(0);
  const [targetTemp, setTargetTemp] = useState(0);
  const [coilIn, setCoilIn] = useState(0);
  const [psi, setPsi] = useState(0);
  const [newTemp, setNewTemp] = useState(0);

  let potData = [];
  let coilInData = [];
  let psiData = [];
  let nRoverV = [];

  let count = 0;
  let p;

  var x = scaleLinear()
    .domain([0, 600])
    .range([0, width]);

  var y = scaleLinear()
    .domain([50, 150])
    .range([height, 0]);

  var y2 = scaleLinear()
    .domain([0, 15])
    .range([height, 0]);

  let potPath = line()
    .x(d => x(d.count))
    .y(d => y(d.data));

  let psiPath = line()
    .x(d => x(d.count))
    .y(d => y2(d.data));
  useEffect(() => {
    // ws.onopen = () => ws.send("opened");
    ws.onmessage = e => {
      let interData = JSON.parse(e.data);
      setPot(interData.pot);
      setCoilIn(interData.coilIn);
      setPsi(interData.psi);
      coilInData.push({ count, data: parseFloat(interData.coilIn) });
      potData.push({ count, data: parseFloat(interData.pot) });
      psiData.push({ count, data: parseFloat(interData.psi) });

      nRoverV.push({
        count,
        potData: parseFloat(interData.psi) / parseFloat(interData.pot),
        coilInData: parseFloat(interData.psi) / parseFloat(interData.coilIn)
      });

      select("#pot_path")
        .data([potData])
        .attr("class", "line")
        .attr("d", potPath);

      select("#coilIn_path")
        .data([coilInData])
        .attr("class", "line")
        .attr("d", potPath);

      select("#psi_path")
        .data([psiData])
        .attr("class", "line")
        .attr("d", psiPath);
      console.log(coilInData);

      if (count > 600) {
        coilInData.shift()
        potData.shift();
        psiData.shift();
        coilInData.forEach(data=>{
          data.count = data.count-1;
        })
        potData.forEach(data=>{
          data.count = data.count-1;
        })
        psiData.forEach(data=>{
          data.count = data.count-1;
        })
      } else {
        count++;
      }
    };
  }, []);

  useEffect(() => {
    let svg = select("#my_dataviz");

    svg
      .append("g")
      .attr("transform", "translate(30," + height + ")")
      .call(axisBottom(x));

    svg
      .append("g")
      .attr("transform", "translate(30,0)")
      .call(axisLeft(y));

    svg
      .append("g")
      .attr("transform", `translate(${width + 30},0)`)
      .call(axisRight(y2));

    var ordinal = d3
      .scaleOrdinal()
      .domain(["Pot", "Coil", "PSI"])
      .range(["rgb(0, 0, 255)", "rgb(0, 0, 0)", "rgb(255,0,0)"]);

    var colorLegend = legendColor()
      .shape(
        "path",
        d3
          .symbol()
          .type(d3.symbolCircle)
          .size(150)()
      )
      .shapePadding(10)
      .scale(ordinal);

    svg.select(".legendQuant").call(colorLegend);
  }, []);

  return (
    <>
      <Container fluid>
        <Row>
          <Col sm={3}>
            <Card>
              <Card.Title>Temperatures</Card.Title>
              <ListGroup>
                <ListGroup.Item>{`Pot: ${pot}\n`}</ListGroup.Item>
                <ListGroup.Item>{`Coil in: ${coilIn}\n`}</ListGroup.Item>
                <ListGroup.Item>{`PSI: ${psi}\n`}</ListGroup.Item>
                <ListGroup.Item>
                  {`Target: `}{" "}
                  <InputGroup size="sm" className="mb-3">
                    <FormControl
                      aria-label="Small"
                      aria-describedby="inputGroup-sizing-sm"
                      onBlur={e => {
                        ws.send(
                          JSON.stringify({
                            newTargetTemp: e.target.value
                          })
                        );
                      }}
                    />
                  </InputGroup>
                </ListGroup.Item>
                <ListGroup.Item>
                    <Button onClick={() => console.log('')}>{`Start collecting sensor data`}</Button>
                </ListGroup.Item>
              </ListGroup>
            </Card>
          </Col>
          <Col sm={9} id="g">
            <svg
              style={{ marginTop: "50px" }}
              id="my_dataviz"
              width={`${width + margin.left + margin.right}`}
              height={`${height + margin.top + margin.bottom}`}
            >
              <g
                className="legendQuant"
                transform={`translate(${width - 30},30)`}
              ></g>
              <path
                id="coilIn_path"
                stroke="black"
                fill="none"
                transform="translate(30,0)"
              ></path>
              <path
                id="pot_path"
                stroke="blue"
                fill="none"
                transform="translate(30,0)"
              ></path>
              <path
                id="psi_path"
                stroke="red"
                fill="none"
                transform="translate(30,0)"
              ></path>
            </svg>
          </Col>
        </Row>
        <Row></Row>
      </Container>
    </>
  );
};

export default App;
