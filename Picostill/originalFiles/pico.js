
var picostill = {
version : "0.0.30",
ipRouter : "192.168.1.142",
networkSsid : "MonkeyHouse5",
programName : "PicoManual",
isProgramRunning : true,
isWifiConnected : true,
sensors : true,
fan : true,
};
/*------- Static -------*/

/*----- console methods -----*/
/* defined because js console.assert is not supported on Firefox (Aug 2018) */
function assert(condition, msg) {
    if (!condition) {
        console.error("ASSERT: " + msg);
    }
};

function debug(msg) {
    if (isDebug) {
        console.log(msg);
    }
};

function notImplemented(methodName) {
    /* use case is when designing APIs before implementation */
    console.error("NOT IMPLEMENTED: " + methodName);
};

/*----- core objects -----*/
const intervalDataTime = 2000;
var intervalData = null;
const isDebug = true;
var ip = "xxx.xxx.x.x";
const DocumentElementNames = {
        fanCheckBoxId    : "fanCheckBox",
        sensorCheckBoxId : "sensorCheckBox",
        startButtonId    : "startButton",
        stopButtonId     : "stopButton",
        defaultTabId     : "defaultOpen",
        ipEntryId        : "ip-address",
        versionEntryIds  : ["version-number", "versionNumber"],
};
var picostillSensorDataController = null;  // declare in init after classes are declared
var picostillStateController = null;

/*----- core classes definitions-----*/
/**
 * @class contains static methods for data sending/receiving with the Picostill
 */
class StillHttp {
    /**
     * @method retrieves a comma separated representation of the sensor data
     */
    static GetData(given_ip, callback, errorMsg) {
        debug("StillHttp.GetData()");
        let GET_DATA_ENDPOINT = "/data";
        httpGet(given_ip, GET_DATA_ENDPOINT, callback, errorMsg);
    };

    /**
     * @method retrieves a boolean true if the fan is on, else false
     */
    static GetFanState(given_ip, callback, errorMsg) {
        debug("StillHttp.GetFanState()");
        let GET_FANSTATE_ENDPOINT = "/fanstate";
        httpGet(given_ip, GET_FANSTATE_ENDPOINT, callback, errorMsg);
    };

    /**
     * @method retrieves a manifest of the still's state
     * in the form of a json equivalent of the picostill object
     */
    static GetStillState(given_ip, callback, errorMsg) {
        httpGet(given_ip, "/stillstate", callback, errorMsg);
    };

    static PostFanState(setOn, given_ip, callback, errorMsg) {
        debug("StillHttp.PostFanState()");
        let ENDPOINT = setOn ? "/fanon" : "/fanoff";
        httpGet(given_ip, ENDPOINT, callback, errorMsg);
    };

    static PostFanOff(given_ip, callback, errorMsg) {
        StillHttp.PostFanState(false, given_ip, callback, errorMsg);
    };

    static PostFanOn(given_ip, callback, errorMsg) {
        StillHttp.PostFanState(true, given_ip, callback, errorMsg);
    };

    static PostSensorsOn(given_ip, callback, errorMsg) {
        httpGet(given_ip, "/sensors", callback, errorMsg);
    };

    static PostStartProgram(given_ip, callback, errorMsg) {
        httpGet(given_ip, "/start", callback, errorMsg);
    };

    static PostStopProgram(given_ip, callback, errorMsg) {
        httpGet(given_ip, "/end", callback, errorMsg);
    };
};

/**
 * @class model of Picostill state
 */
class PicostillModel {
    constructor(picostill=null) {
        debug("PicostillModel.constructor()");
        this.picostill = picostill;
    };

    set(picostill) {
        debug("PicostillModel.set()");
        this.picostill = picostill;
    };
};

/**
 * @class view rendering for Picostill state
 */
class PicostillView {
    constructor() {
        debug("PicostillView.constructor()");
        this.DocumentElementNames = {
                fanCheckBoxId    : "fanCheckBox",
                sensorCheckBoxId : "sensorCheckBox",
                startButtonId    : "startButton",
                stopButtonId     : "stopButton",
        };
        Object.freeze(this.DocumentElementNames);
    };

    // If renders get any more complex this should be redone
    // with listeners waiting for a value change.
    // As is, the work is not worth the payoff
    render(model) {
        debug("PicostillView.render()");

        assert(model instanceof PicostillModel, "model instanceof PicostillModel");
        if (!(model instanceof PicostillModel)) { return; }

        // getting element refs
        let fanCheckBox    = document.getElementById(this.DocumentElementNames.fanCheckBoxId);
        let sensorCheckBox = document.getElementById(this.DocumentElementNames.sensorCheckBoxId);
        let startButton    = document.getElementById(this.DocumentElementNames.startButtonId);
        let stopButton     = document.getElementById(this.DocumentElementNames.stopButtonId);

        // render changes as needed
        if (fanCheckBox.checked != model.picostill.fan) {
            debug("rendering fan state change");
            fanCheckBox.checked = model.picostill.fan;
        }

        if ((model.picostill.isProgramRunning || model.picostill.sensors) && !sensorCheckBox.checked) {
            debug("rendering sensor state change");
            // TODO picostill should send a sensors state boolean explicitely
            sensorCheckBox.checked = model.picostill.isProgramRunning;
            sensorCheckBox.disabled = model.picostill.isProgramRunning;
            // sensors are ON if a program is running
            // sensors should be able to be turned on independent of a program running
        }
        
        if ((model.picostill.ipRouter == null) || !(model.picostill.ipRouter == ip)) {
            // if not connected over router disable cannot run
            if (!startButton.disabled) { debug("rendering start state change"); startButton.disabled = true; }
            if (!stopButton.disabled)  { debug("rendering stop state change");  stopButton.disabled = true;  }
        } else {
            if (startButton.disabled != model.picostill.isProgramRunning) {
                // update
                debug("rendering start state change");
                // start enabled if there is no program running already
                startButton.disabled = model.picostill.isProgramRunning;
            }
            if (stopButton.disabled == model.picostill.isProgramRunning) {
                // update
                debug("rendering stop state change");
                // stop enabled if there is a running program to stop
                stopButton.disabled = !model.picostill.isProgramRunning;
            }
        }
    };
};

/**
 * @class controller for syncing Picostill state to page
 */
class PicostillController {
    constructor(model, view) {
        debug("PicostillController.constructor()");
        assert(model instanceof PicostillModel, "model instanceof PicostillModel");
        assert(view instanceof PicostillView, "view instanceof PicostillView");
        this.model = model;
        this.view = view;
    };

    render() {
        debug("PicostillController.render()");

        assert(this.model.picostill != null, "this.model.picostill != null");
        if (this.model.picostill == null) { return; }

        this.view.render(this.model);
    };

    set(picostill) {
        debug("PicostillController.set()");
        /* Expects structure:
        picostill = {
            version: "x.y.z",
            ipRouter: null,
            networkSsid: null,
            isWifiConnected: false,
            sensors: false,
            fan: false,
            isProgramRunning: false,
            programName: "Manual",
        };
        */
        let valid = (picostill) => {
            // validate object properties
            if (typeof picostill.version === 'undefined')          { return false; }
            if (typeof picostill.ipRouter === 'undefined')         { return false; }
            if (typeof picostill.networkSsid === 'undefined')      { return false; }
            if (typeof picostill.isWifiConnected === 'undefined')  { return false; }
            if (typeof picostill.sensors === 'undefined')          { return false; }
            if (typeof picostill.fan === 'undefined')              { return false; }
            if (typeof picostill.isProgramRunning === 'undefined') { return false; }
            if (typeof picostill.programName === 'undefined')      { return false; }

            return true;
        }

        if (!valid) {
            console.error("Invalid or incomplete picostill object in PicostillController.set() method");
            console.error(picostill);
            return;
        }

        this.model.set(picostill);
        this.render();
    };

    getStateObject() {
        return this.model.picostill;
    };
};

/**
 * @class model of Picostill sensor data
 */
class SensorDataModel {
    constructor(t1="-", t2="-", t3="-", t4="-", p="-", isMetric=false, precision=2) {
        debug("SensorDataModel.constructor()");
        assert(typeof isMetric === "boolean", "typeof isMetric === \"boolean\"");
        assert(typeof precision === "number", "typeof precision === \"number\"");
        this.data = {
            T1 : t1,
            T2 : t2,
            T3 : t3,
            T4 : t4,
            P  : p,
        };
        this.isMetric = isMetric;
        this.precision = precision;
        Object.freeze(this.precision);

        this.clean();
    };

    isValidSet() {
        let isValid = typeof this.data.T1 === "number"
            && typeof this.data.T2 === "number"
            && typeof this.data.T3 === "number"
            && typeof this.data.T4 === "number"
            && typeof this.data.P === "number";
        debug("valid: " + isValid);
        return isValid;
    }
    
    convertToImperial() {
        debug("SensorDataModel.convertToImperial()");
        assert(this.isMetric == true, "this.isMetric == true")
        assert(this.isValidSet(), "this.isValidSet()");
        if (!this.isValidSet()) { return; }

        function convertVal(celsius) {
            assert(typeof celsius === "number", "typeof celsius === \"number\"");
            return ((celsius * (9 / 5)) + 32);
        }

        this.data.T1 = convertVal(this.data.T1);
        this.data.T2 = convertVal(this.data.T2);
        this.data.T3 = convertVal(this.data.T3);
        this.data.T4 = convertVal(this.data.T4);
        this.clean();
        this.isMetric = false;
    };

    convertToMetric() {
        debug("SensorDataModel.convertToImperial()");
        assert(this.isMetric == false, "this.isMetric == false")
        assert(this.isValidSet(), "this.isValidSet()");
        if (!this.isValidSet()) { return; }

        function convertVal(fahrenheit) {
            assert(typeof fahrenheit === "number", "typeof fahrenheit === \"number\"");
            return ((fahrenheit - 32) * (5 / 9));
        }

        this.data.T1 = convertVal(this.data.T1);
        this.data.T2 = convertVal(this.data.T2);
        this.data.T3 = convertVal(this.data.T3);
        this.data.T4 = convertVal(this.data.T4);
        this.clean();
        this.isMetric = true;
    };

    clean() {
        debug("SensorDataModel.clean()");
        if (!this.isValidSet()) { return; }

        function cleanVal(value, precision) {
            return Number(Math.round(value + "e" + precision) + "e-" + precision);
        }

        this.data.T1 = cleanVal(this.data.T1, this.precision);
        this.data.T2 = cleanVal(this.data.T2, this.precision);
        this.data.T3 = cleanVal(this.data.T3, this.precision);
        this.data.T4 = cleanVal(this.data.T4, this.precision);
        this.data.P  = cleanVal(this.data.P, this.precision);
    };

    printToConsoleLog() {
        console.log(this.data);
    };

    static parseRawData(raw) {
        debug("SensorDataModel.parseRawData()");
        assert(typeof raw === "string", "typeof raw === \"string\"")

        debug("raw data: \n" + raw + "\n");
        let content = raw.split("#")[1];
        if (!content) { return null; }
        debug("content in raw: " + content);
        let values = content.split(",");
        debug("values in content: " + values);

        // ASSUMPTION: data from Still is in Fahrenheit
        return new SensorDataModel(Number(values[0]), Number(values[1]), Number(values[2]), Number(values[3]), Number(values[4]), false);
    };
};

/**
 * @class view rendering for Picostill sensor data
 */
class SensorDataView {
    constructor(idT1, idT2, idT3, idT4, idP, idMetricCheckbox) {
        debug("SensorDataView.constructor()");
        assert(typeof idT1 === "string", "typeof idT1 === \"string\"");
        assert(typeof idT2 === "string", "typeof idT2 === \"string\"");
        assert(typeof idT3 === "string", "typeof idT3 === \"string\"");
        assert(typeof idT4 === "string", "typeof idT4 === \"string\"");
        assert(typeof idP === "string", "typeof idP === \"string\"");
        assert(typeof idMetricCheckbox === "string", "typeof idMetricCheckbox === \"string\"");
        this.idT1 = idT1;
        this.idT2 = idT2;
        this.idT3 = idT3;
        this.idT4 = idT4;
        this.idP  = idP;
        this.idMetricCheckbox = idMetricCheckbox;

        Object.freeze(this.idT1);
        Object.freeze(this.idT2);
        Object.freeze(this.idT3);
        Object.freeze(this.idT4);
        Object.freeze(this.idP);
        Object.freeze(this.idMetricCheckbox);
    };

    hasUserRequestedMetric() {
        debug("SensorDataView.hasUserRequestedMetric()");
        return document.getElementById(this.idMetricCheckbox).checked;
    };

    needConvertUnits(data) {
        debug("SensorDataView.needConvertUnits()");
        return (this.hasUserRequestedMetric() && !data.isMetric)
            || (!this.hasUserRequestedMetric() && data.isMetric)
    };

    convertUnits(data) {
        debug("SensorDataView.convertUnits()");
        if (this.hasUserRequestedMetric() && !data.isMetric) {
            debug("Converting to metric");
            data.convertToMetric();
        } else if (!this.hasUserRequestedMetric() && data.isMetric) {
            debug("Converting to fahrenheit");
            data.convertToImperial();
        }
    };

    unitCheck(data) {
        debug("SensorDataView.unitCheck()");
        if (this.needConvertUnits(data)) {
            console.log("converting units")
            this.convertUnits(data);
        }
    };

    cleanDecimals(data) {
        debug("SensorDataView.cleanDecimals()");
        data.clean();
    }

    populate(data) {
        debug("SensorDataView.populate()");
        assert(data instanceof SensorDataModel, "data instanceof SensorDataModel");

        let t1 = document.getElementById(this.idT1);
        let t2 = document.getElementById(this.idT2);
        let t3 = document.getElementById(this.idT3);
        let t4 = document.getElementById(this.idT4);
        let p  = document.getElementById(this.idP);

        debug("populating with: "); data.printToConsoleLog();

        if (data.isValidSet()) {
            this.unitCheck(data);
            this.cleanDecimals(data);

            let unit = data.isMetric ? "C" : "F";  // degrees C/F

            t1.innerHTML = data.data.T1 + " &deg;" + unit;
            t2.innerHTML = data.data.T2 + " &deg;" + unit;
            t3.innerHTML = data.data.T3 + " &deg;" + unit;
            t4.innerHTML = data.data.T4 + " &deg;" + unit;
            p.innerHTML  = data.data.P + " psi";
        } else {
            console.warn("Invalid data set ignored by SensorDataView");
            t1.innerHTML = "-";
            t2.innerHTML = "-";
            t3.innerHTML = "-";
            t4.innerHTML = "-";
            p.innerHTML  = "-";
        }
        
    };
};

/**
 * @class controller for syncing Picostill sensor data to page
 */
class SensorDataController {
    constructor(data, populator) {
        debug("SensorDataController.constructor()");
        assert(data instanceof SensorDataModel, "data instanceof SensorDataModel");
        assert(populator instanceof SensorDataView, "populator instanceof SensorDataView");
        this.data = data;
        this.populator = populator;
        Object.freeze(this.populator);
    };

    update() {
        debug("SensorDataController.update()");
        this.populator.populate(this.data);
    };

    setData(data) {
        debug("SensorDataController.setData()");
        assert(data instanceof SensorDataModel, "data instanceof SensorDataModel");
        if (!(data instanceof SensorDataModel)) { return; }
        this.data = data;
        // TODO validate data given here? data.isValidSet() ?
        this.update();
    };
};

/**
 * @class for graphing data
 * @class NOT IMPLEMENTED
 */
class StillDataGraph {
    constructor(canvasId) {
        assert(typeof canvasId === "string", "typeof canvasId === \"string\"");
        this.canvasId = canvasId;
        Object.freeze(this.canvasId);
        this.canvas      = null;
        this.context     = null;
        this.data        = {
                            time: [],
                            T1: [],
                            T2: [],
                            T3: [],
                            T4: [],
                            P: [],
                        };
        this.maxTemp = null;
        this.minTemp = null;
        this.maxPressure = null;
        this.minPressure = null;
    };

    init() {
        this.canvas = document.getElementById(this.canvasId);
        assert(this.canvas != null, "this.canvas != null");
        this.context = this.canvas.getContext('2d');
        // TODO
    };

    drawLine(sourceX, sourceY, destinationX, destinationY){
        this.context.beginPath();
        this.context.moveTo(sourceX, sourceY);
        this.context.lineTo(destinationX, destinationY);
        this.context.stroke();
    };

    updateMinMax(data) {
        assert(data.isValidSet(), "data.isValidSet()");
        if (this.maxTemp == null) {
            // haven't set max and mins yet
            this.maxTemp = Math.max([data.T1, data. T2, data.T3, data.T4 ]);
            this.minTemp = Math.min([data.T1, data. T2, data.T3, data.T4 ]);
            this.maxPressure = data.P;
            this.minPressure = data.P;
            return;
        }
        // else:
        let temps = [this.maxTemp, this.minTemp, data.T1, data. T2, data.T3, data.T4 ];
        let pressures = [this.maxPressure, this.minPressure, data.P ];
        
        this.maxTemp = Math.max(temps);
        this.minTemp = Math.min(temps);
        this.maxPressure = Math.max(pressures);
        this.minPressure = Math.min(pressures);
    };

    // add new data point. Does not redraw graph automatically.
    // returns true if data added, else false
    tryAddDataPoint(data) {
        assert(data instanceof SensorDataModel, "data instanceof SensorDataModel");
        if (!(data.isValidSet())) { console.warn("Invalid data set ignored by graph."); return false; }
        // TODO
    };

    // redraw the graph
    draw() {
        // TODO
    };
};

/*----- standalone methods -----*/
function setGetDataInterval() {
    debug("setGetDataInterval()");
    assert(intervalData === null, "intervalData === null");
    if (intervalData === null) {
        debug("setting data interval");
        intervalData = setInterval(trySensorDataModelUpdate, intervalDataTime);
    }
};

function clearGetDataInterval() {
    debug("clearGetDataInterval()");
    assert(!(intervalData === null), "intervalData === null");
    if (!(intervalData === null)) {
        debug("clearing data interval");
        clearInterval(intervalData);
        intervalData = null;
    }
};

function httpGet(hostIp, req, callback, errorMsg, interval=false) {
    debug("httpGet(hostIp=" + hostIp + "\n\t\t,req=\"" + req + "\"\n\t\t,cb=" + callback + "\n\t\t,err=\"" + errorMsg + "\n\t\t,interval=" + interval + "\")");
    var xhr = new XMLHttpRequest();

    function createCORSRequest(url) {
        if ("withCredentials" in xhr) {
            xhr.open("GET", `http://192.168.1.142/data`, true);
            xhr.withCredentials = true;
        } else if (typeof XDomainRequest != "undefined") {
            xhr = new XDomainRequest();
            xhr.open("GET", `http://192.168.1.142/data`);
        } else {
            xhr = null;
            console.log("CORS is not supported");
        }
        return xhr;
    }
    
    xhr = createCORSRequest();
    
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    //xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
        console.log(xhr);
            if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText !== "" || interval)) {
                callback(xhr.responseText);
            }
            else {
                console.error("HTTP error: " + errorMsg);
                debug("Received: " + xhr.responseText);
            }
        }
    };
    xhr.send();
};

/* ----- http response handlers ----- */
function eatHttpResponse(httpResponse) {
    // yeah we're just gonna eat it
    // some Still responses just confirm that connection was successful
    // http will tell us if the connection failed so these kinds of
    // responses are redundant.
    console.warn("Ate HTTP response: " + httpResponse);
};

function httpResponseHandlerPicostillState(httpResponse) {
    debug("httpResponseHandlerPicostillState()");
    debug(httpResponse);

    function parseResponse(reponse) {
        function getAsBoolean(propertyString) { return propertyString === "1" ? true : false; }

        parsed = JSON.parse(reponse);
        debug(parsed);
        let result = {}
        // convert booleans
        result.fan = getAsBoolean(parsed.fan);
        result.sensors = getAsBoolean(parsed.sensors);
        result.isWifiConnected = getAsBoolean(parsed.isWifiConnected);
        result.isProgramRunning = getAsBoolean(parsed.isProgramRunning);
        // copy strings
        result.version = parsed.version;
        result.ipRouter = parsed.ipRouter;
        result.networkSsid = parsed.networkSsid;
        result.programName = parsed.programName;

        debug(result);
        return result;
    }

    let newstate = parseResponse(httpResponse);
    let oldstate = picostillStateController.getStateObject();
    // start or stop getting data
    function needStartDataInterval(old, current, hasInterval) {
        if (!old.isProgramRunning && current.isProgramRunning) { return true; }
        if (!old.sensors && current.sensors) { return true; }
        if ((current.isProgramRunning || current.sensors) && !hasInterval) { return true; }
        return false;
    };
    function needStopDataInterval(old, current, hasInterval) {
        if (old.isProgramRunning && !current.isProgramRunning) { return true; }
        if (old.sensors && !current.sensors) { return true; }
        if (!(current.isProgramRunning || current.sensors) && hasInterval) { return true; }
        return false;
    };

    if (needStartDataInterval(oldstate, newstate, !(intervalData === null))) {
        setGetDataInterval();  // set interval for data retrieval
    } else if (needStopDataInterval(oldstate, newstate, !(intervalData === null))) {
        clearGetDataInterval();
    }
    picostillStateController.set(newstate);
};

function httpResponseHandlerFan(httpResponse) {
    console.log("Fan Http Response: " + httpResponse);
    StillHttp.GetStillState(ip, httpResponseHandlerPicostillState, "httpResponseHandlerStart failed to get response");
};

function httpResponseHandlerSensors(httpResponse) {
    console.log("Sensor Http Response: " + httpResponse);
    StillHttp.GetStillState(ip, httpResponseHandlerPicostillState, "httpResponseHandlerStart failed to get response");
};

function httpResponseHandlerRawData(httpResponse) {
    debug("httpResponseHandlerRawData()");
    assert(!(picostillSensorDataController === undefined), "!(picostillSensorDataController === undefined)");
    let data = SensorDataModel.parseRawData(httpResponse);
    if (!data) { console.warn("No data parsed"); return; }
    data.printToConsoleLog();
    picostillSensorDataController.setData(data);
};

function httpResponseHandlerStart(httpResponse) {
    console.log("Start Http Response: " + httpResponse);
    StillHttp.GetStillState(ip, httpResponseHandlerPicostillState, "httpResponseHandlerStart failed to get response");
};

function httpResponseHandlerStop(httpResponse) {
    console.log("Stop Http Response: " + httpResponse);
    StillHttp.GetStillState(ip, httpResponseHandlerPicostillState, "httpResponseHandlerStop failed to get response");
};

/* ---- methods accessed by html to trigger http calls ----- */
function fanToggle(turnOn) {
    debug("fanToggle()");
    turnOn ? StillHttp.PostFanOn(ip, httpResponseHandlerFan, "FanOn: failed to communicate with fan")
           : StillHttp.PostFanOff(ip, httpResponseHandlerFan, "FanOff: failed to communicate with fan");
};

function sensorToggle() {
    debug("sensorToggle()");
    StillHttp.PostSensorsOn(ip, httpResponseHandlerSensors, "failed to communicate with sensors");
};

function trySensorDataModelUpdate() {
    debug("trySensorDataModelUpdate()");
    // TODO Ip address? build into the page when creating.
    StillHttp.GetData(ip, httpResponseHandlerRawData, "trySensorDataModelUpdate() failed at " + ip);
};

function startProgram() {
    console.log("startProgram()");
    StillHttp.PostStartProgram(ip, httpResponseHandlerStart, "Start program failed");
};

function stopProgram() {
    console.log("stopProgram()");
    StillHttp.PostStopProgram(ip, httpResponseHandlerStop, "Stop program failed");
};

/* ----- methods for html element manipulation ----- */

function openTab(evt, tabName) {
    debug("openTab(" + tabName + ");");

    let i, tabcontent, tablinks;

    // hide all class="tabcontent"
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // deactivate all class="tablinks"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show and activate current tab
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
};

/* ---- methods run on page load ---- */
function init() {
    console.log("init()");
    assert(!(picostill === undefined), "!(picostill === undefined)");

    // intialize all our controllers
    picostillSensorDataController = new SensorDataController(new SensorDataModel(), new SensorDataView("T1", "T2", "T3", "T4", "P", "isMetric"));
    picostillStateController = new PicostillController(new PicostillModel(), new PicostillView());

    function openDefaultTab(id) {
        debug("opening default tab");
        let tab = document.getElementById(id);
        tab.click();
    }
    openDefaultTab(DocumentElementNames.defaultTabId);

    /* Render Picostill state properties that controller does not handle (these are expected to not change) */
    function setVersion(version) {
        debug("setting version element(s)");
        for(var i=0; i < DocumentElementNames.versionEntryIds.length; i++) {
            let id = DocumentElementNames.versionEntryIds[i];
            document.getElementById(id).innerHTML = version;
        }
    }
    setVersion(picostill.version);

    function setIPAddress(ipAddress) {
        debug("setting ip address element(s)");
        let ipElement = document.getElementById(DocumentElementNames.ipEntryId);
        ip = ipAddress;
        console.log("ip set: " + ip);
        Object.freeze(ip);
        ipElement.innerHTML = ip;
    }
    if (window.location.hostname) { setIPAddress(window.location.hostname); }

    /* Render Picostill state on page */
    picostillStateController.set(picostill);

    /* check if we need to turn on interval */
    if ((picostill.isProgramRunning || picostill.sensors) && (intervalData === null)) {
        setGetDataInterval();  // set interval for data retrieval
    } else if (!(picostill.isProgramRunning || picostill.sensors) && !(intervalData === null)) {
        clearGetDataInterval();
    }
};

document.addEventListener('DOMContentLoaded', init, false);
