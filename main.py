import time
import network
import ujson
from machine import Pin, SPI
from mfrc522 import MFRC522
from umqtt.simple import MQTTClient

# === CONFIGURATION (Edit These) ===
WIFI_SSID = "EdNet"
WIFI_PASS = "Huawei@123"
TEAM_ID = "Darius_Divine_Louise"
MQTT_BROKER = "broker.benax.rw"

# Hardware Pins (Standard for ESP8266)
# SCK: D5, MOSI: D7, MISO: D6, RST: D3, SDA(CS): D4
reader = MFRC522(sck=14, mosi=13, miso=12, rst=0, cs=2)

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print('Connecting to WiFi...')
        wlan.connect(WIFI_SSID, WIFI_PASS)
        while not wlan.isconnected():
            pass
    print('WiFi Connected. IP:', wlan.ifconfig()[0])

def main():
    connect_wifi()
    client = MQTTClient("esp8266_pos", MQTT_BROKER)
    client.connect()
    print("MQTT Connected. Ready for orders...")

    last_uid = ""
    last_time = 0

    while True:
        (stat, tag_type) = reader.request(reader.REQIDL)
        if stat == reader.OK:
            (stat, uid) = reader.anticoll()
            if stat == reader.OK:
                # Convert UID list to a readable string
                uid_str = "-".join([hex(i)[2:] for i in uid])
                current_time = time.ticks_ms()
                
                # Debounce: Prevent double scanning within 3 seconds
                if uid_str != last_uid or (current_time - last_time) > 3000:
                    payload = ujson.dumps({"uid": uid_str})
                    topic = "rfid/" + TEAM_ID + "/card/status"
                    client.publish(topic, payload)
                    print("Card Scanned & Sent:", uid_str)
                    
                    last_uid = uid_str
                    last_time = current_time
        
        time.sleep(0.1)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("Error:", e)
        time.sleep(5)
        import machine
        machine.reset()