

var picostill = {
version : "0.0.30",
ipRouter : "192.168.1.142",
networkSsid : "MonkeyHouse5",
programName : "None",
isProgramRunning : false,
isWifiConnected : false,
sensors : false,
fan : false,
};
const ssid_options = ["MonkeyHouse5_EXT",
"DIRECT-roku-139-D02F47",
"PS4-9B06CA5A6182",
"MonkeyHouse5",
"MH5VI"];
/*--- Static ---*/
const isDebug = true;
var ipPage = null;  // current IP

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

function httpGet(ip, req, callback, errorMsg, interval = false) {
   debug("httpGet(ip=" + ip + "\n\t\t,req=\"" + req + "\"\n\t\t,cb=" + callback + "\n\t\t,err=\"" + errorMsg + "\")");
   var xhr = new XMLHttpRequest();

   function createCORSRequest(method, url) {
       if ("withCredentials" in xhr) {
           xhr.open(method, url, true);
           xhr.withCredentials = true;
       } else if (typeof XDomainRequest != "undefined") {
           xhr = new XDomainRequest();
           xhr.open(method, url);
       } else {
           xhr = null;
           console.log("CORS is not supported");
       }
       return xhr;
   }
   
   xhr = createCORSRequest("GET", "http://" + ip + req);
   
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
           }
       }
   };
   xhr.send();
};

function eatHttpResponse(httpResponse) {
   // yeah we're just gonna eat it
   // some Still responses just confirm that connection was successful
   // http will tell us if the connection failed so these kinds of
   // responses are redundant.
   console.warn("Ate HTTP response: " + httpResponse);
};

const no_ssid_text = "Could not find any networks. Please make sure your home router is in range and turned on."

function showNoConfirmationWarning() {
   debug("showNoConfirmationWarning");
   let elem = document.getElementById("noConfirmationWarning");
   elem.hidden = false;
};

var showPassChecked = function(e) {
   debug("showPassChecked = function(e)");
   let pass = document.getElementById("pass");
   pass.setAttribute("type", document.getElementById("enable-show").checked ? "text" : "password");
};

function displayConnectingToLanWarning() {
   let elem = document.getElementById("connectingToLanWarning");
   elem.hidden = false;
};

function sendConnectToLan() {
   debug("sendConnectToLan()");
   assert(picostill.ipRouter != ipPage, "picostill.ipRouter != ipPage");
   if (picostill.ipRouter == ipPage) { debug("already connected to lan"); return; }
   httpGet(ipPage, "/connecttolan", eatHttpResponse, "Error could not communicate with Still");  // TODO: DON'T EAT THIS. Should check this.
   displayConnectingToLanWarning();
};

function goToDataPage() {
   window.location.assign("/data-page");
}

function factoryReset() {
   debug("tryFactoryReset()");
   let userTxt = document.getElementById("reset-input").value.toLowerCase();
   debug("received from user: " + userTxt);
   if (userTxt == "reset") {
       httpGet(ipPage, "/factoryreset", eatHttpResponse, "Error could not communicate with Still");
       document.getElementById("resetting-text").hidden = false;
   }
}

function init() {
   debug("The page has loaded!");
   assert(!(picostill === undefined), "!(picostill === undefined)");
   assert(!(picostill.networkSsid === undefined), "!(picostill.networkSsid === undefined)");
   assert(!(picostill.ipRouter === undefined), "!(picostill.ipRouter === undefined)");
   assert(!(ssid_options === undefined), "!(ssid_options === undefined)");
   ipPage = window.location.hostname;
   Object.freeze(ipPage);

   /* first check for redirect */
   function ifHomePageAndWifiConnectedRedirectToDataPage(iprouter, ippage) {
       if (iprouter == ippage && window.location.pathname != "/wifi") {
           debug("Redirecting to data page");
           goToDataPage();
       };
   };
   ifHomePageAndWifiConnectedRedirectToDataPage(picostill.ipRouter, ipPage);  // TODO this is gross? is there a better way to handle this? (Not priority)

   /* did not redirect so set up the page */
   function SetSSIDOptions(ssid_list) {
       debug("Setting SSID Options");
       function noSsidFound() {
           let submitButton = document.getElementById("submit");
           submitButton.disabled = true;
           let credInstructionsParagraph = document.getElementById("credentialInstructions");
           credInstructionsParagraph.innerHTML = no_ssid_text;
           credInstructionsParagraph.removeAttribute("hidden");
       };

       function populateSsidDropDown() {
           let ssid_dropdown = document.getElementById("ssid")
           ssid_list.forEach(function(ssid) {
           let option = document.createElement("option");
               option.text = ssid;
               option.value = ssid;
               ssid_dropdown.appendChild(option);
           });
       };

       if (ssid_list.length == 0) {
           noSsidFound();
       } else {
           populateSsidDropDown();
       }
   };
   SetSSIDOptions(ssid_options);

   function setVersion(version) {
       debug("Setting version");
       debug("version = " + version);
       let vNumElement = document.getElementById("versionNumber");
       vNumElement.innerHTML = version;
   };
   setVersion(picostill.version);
   // if router IP available (should be if still has credentials)
   // show IP to user
   function setNetworkInDocument(ssid, ip) {
       debug("Setting ssid ip pair");
       debug("ssid = " + ssid);
       debug("ip = " + ip);
       if (ssid != null && ip != null) {
           debug("ssid ip pair found");
           // ASSUMPTION Still will either send null or a correctly formatted ip address
           let infoElement = document.getElementById("network-info");
           let routerElement = document.getElementById("router-ip");
           let ssidElement = document.getElementById("network-ssid");
           routerElement.innerHTML = ip;
           ssidElement.innerHTML = ssid;
           infoElement.hidden = false;
       } else {
           let infoElement = document.getElementById("network-info");
           infoElement.hidden = true;
       }
   };
   setNetworkInDocument(picostill.networkSsid, picostill.ipRouter);

   function wifiConnectedDocumentDependencies(iprouter, ippage) {
       debug("ifConnectedToWifiDocAdjustments");
       let needConnectRow = document.getElementById("need-connect-to-wifi");
       let divLinks = document.getElementById("page-links");
       let setupElement = document.getElementById("network-setup");

       if (iprouter != ippage) {
           debug("Not connected to router");
           divLinks.hidden = true;
           setupElement.hidden = false;

       } else {
           debug("Already connected to router");
           divLinks.hidden = false;
           setupElement.hidden = true;  // already online so don't allow new setup
       }
       needConnectRow.hidden = false;
   };
   wifiConnectedDocumentDependencies(picostill.ipRouter, ipPage);
};

document.addEventListener('DOMContentLoaded', init, false);
