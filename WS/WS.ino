#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <WebSocketsClient.h>
#include <Hash.h>
#include <PIDController.h>


PIDController pid; // Create an instance of the PID controller class, called "pid"

ESP8266WiFiMulti WiFiMulti;
WebSocketsClient webSocket;

const char* SSID = "";
const char* PASSWORD = "";

float currentTemp = 0;
float targetTemp = 0;
float difference = 0;

void webSocketEvent(WStype_t type, uint8_t *payload, size_t length)
{
  switch (type)
  {
  case WStype_DISCONNECTED:
    Serial.printf("[WSc] Disconnected!\n");
    break;
  case WStype_CONNECTED:
  {
    Serial.printf("[WSc] Connected to url: %s\n", payload);
    webSocket.sendTXT("Connected");
  }
  break;
  case WStype_TEXT:
    char data[100];
    sprintf(data, "%s", payload);
    String datastring = String(data);
    currentTemp = datastring.toFloat();

     if(currentTemp != 0){
      int output = pid.compute(currentTemp);    // Let the PID compute the value, returns the optimal output
      Serial.print("PID output: ");
      Serial.println(output);
      Serial.print("Current temp: ");
      Serial.println(currentTemp);
      analogWrite(16, output);           // Write the output to the output pin
  } else{
      analogWrite(16, 0);  
  }
//    difference = currentTemp - targetTemp;
//    Serial.print("Current temperature: ");
//    Serial.println(currentTemp);
//    Serial.print("Target temperature: ");
//    Serial.println(targetTemp);
//    Serial.print("Difference: ");
//    Serial.println(datastring);
    break;
  }
}

void setup()
{
  Serial.begin(115200);
  for (uint8_t t = 4; t > 0; t--)
  {
    Serial.printf("[SETUP] BOOT WAIT %d...\n", t);
    Serial.flush();
    delay(1000);
  }

  WiFiMulti.addAP(SSID, PASSWORD);

  //WiFi.disconnect();
  while (WiFiMulti.run() != WL_CONNECTED)
  {
    delay(100);
  }
  pinMode(16, OUTPUT);
  pid.begin();          // initialize the PID instance
  pid.setpoint(120);    // The "goal" the PID controller tries to "reach"
  pid.tune(3, 1, 1.5);    // Tune the PID, arguments: kP, kI, kD
  pid.limit(0, 255);    // Limit the PID output between 0 and 255, this is important to get rid of integral windup!
  webSocket.begin("192.168.1.138", 8080, "/arduino");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void loop()
{
 

  webSocket.loop();
}
