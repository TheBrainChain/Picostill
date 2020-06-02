
#include <ESP8266WiFi.h>

#ifndef STASSID
#define STASSID ""
#define STAPSK  ""
#endif

const char* ssid = STASSID;
const char* password = STAPSK;

WiFiServer server(80);

void setup() {
  Serial.begin(115200);

  pinMode(16, OUTPUT);

  Serial.print(F("Connecting to "));
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(F("."));
  }
  Serial.println();
  Serial.println(F("WiFi connected"));
  server.begin();
  Serial.println(F("Server started"));

  Serial.println(WiFi.localIP());
}

void loop() {
  WiFiClient client = server.available();
  if (!client) {
    return;
  }
  Serial.println(F("new client"));

  client.setTimeout(5000); // default is 1000

  String req = client.readStringUntil('\r');
  Serial.println(F("request: "));
  Serial.println(req);
  int val;
  if (req.indexOf(F("/pot/0")) != -1) {
    val = 0;
  } else if (req.indexOf(F("/pot/1")) != -1) {
    val = 1;
  } else if (req.indexOf(F("/coinin/0")) != -1) {
    val = 0;
  } else if (req.indexOf(F("/coinin/1")) != -1) {
    val = 1;
  } else {
    Serial.println("Invalid request");
  }

  digitalWrite(16, val);

  while (client.available()) {
    client.read();
  }
  client.print(F("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<!DOCTYPE HTML>\r\n<html>\r\nGPIO is now "));
  client.print((val) ? F("high") : F("low"));
  client.print(F("<br><br>Click <a href='http://"));
  client.print(WiFi.localIP());
  client.print(F("/pot/1'>here</a> to switch LED GPIO on, or <a href='http://"));
  client.print(WiFi.localIP());
  client.print(F("/pot/0'>here</a> to switch LED GPIO off.</html>"));
  Serial.println(F("Disconnecting from client"));
}
