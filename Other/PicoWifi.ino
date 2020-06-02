#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

ESP8266WiFiMulti WiFiMulti;
WiFiClient client;

float setTemp;
String pot;

unsigned long lastConnectionTime = 0;
const unsigned long postingInterval = 750;
char server[] = "192.168.1.185";

void setup()
{

  Serial.begin(115200);
  pinMode(16, OUTPUT);

  Serial.println();
  Serial.println();
  Serial.println();

  for (uint8_t t = 4; t > 0; t--)
  {
    Serial.printf("[SETUP] WAIT %d...\n", t);
    Serial.flush();
    delay(1000);
  }

  WiFi.mode(WIFI_STA);
  WiFiMulti.addAP("", "");
}

String getValue(String data, char separator, int index)
{
  int found = 0;
  int strIndex[] = {0, -1};
  int maxIndex = data.length() - 1;

  for (int i = 0; i <= maxIndex && found <= index; i++)
  {
    if (data.charAt(i) == separator || i == maxIndex)
    {
      found++;
      strIndex[0] = strIndex[1] + 1;
      strIndex[1] = (i == maxIndex) ? i + 1 : i;
    }
  }
  return found > index ? data.substring(strIndex[0], strIndex[1]) : "";
}
int count = 0;
void loop()
{

  if (Serial.available() > 0)
  {
    setTemp = Serial.parseFloat();
  }
  if (pot.toFloat() < setTemp-2)
  {
    digitalWrite(16, 1);
  }
  else
  {
    digitalWrite(16, 0);
  }

  if ((WiFiMulti.run() == WL_CONNECTED))
  {
    while (client.available())
    {

      String line = client.readStringUntil('\r');
      String val1 = getValue(line, '#', 1);
      String payload = getValue(val1, '#', 0);
      // String payload = getValue(line, ',',0);
      if (payload.length() > 2)
      {
        Serial.print("Coil input: ");
        String coilIn = getValue(payload, ',', 0);
        Serial.println(coilIn);
        String coilOut = getValue(payload, ',', 1);
        Serial.print("Coil output: ");
        Serial.println(coilOut);
        pot = getValue(payload, ',', 2);
        Serial.println();
        Serial.println();
        Serial.print("Current pot temperature: ");
        Serial.println(pot);
        Serial.print("Target pot temperature: ");
        Serial.println(setTemp);
        Serial.println();
        Serial.println();
        String ambient = getValue(payload, ',', 3);
        Serial.print("Ambient: ");
        Serial.println(ambient);
        String psi = getValue(payload, ',', 4);
        Serial.print("PSI: ");
        Serial.println(psi);
      }
    }

    if (millis() - lastConnectionTime > postingInterval)
    {
      client.stop();
      if (client.connect(server, 80))
      {
        client.println("GET /data HTTP/1.1");
        client.print("Host: ");
        client.println("192.168.1.185");
        client.println("Connection: Keep-Alive");
        client.println("Keep-Alive: timeout=30, max=100");
        client.println();
        lastConnectionTime = millis();
      }
      else
      {
        Serial.println("connection failed");
      }
    }
  }
}
