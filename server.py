import json
from flask import Flask, request, send_from_directory, Response
from tinydb import TinyDB, Query
import speech_recognition as sr
from rpi_ws281x import PixelStrip, Color
import sounddevice as sd
import soundfile as sf
import threading
import random
import RPi.GPIO as GPIO
import time
import threading

# LED strip configuration:
LED_COUNT = 300       
LED_PIN = 21          
LED_FREQ_HZ = 800000  
LED_DMA = 10          
LED_BRIGHTNESS = 255  
LED_INVERT = False    
LED_CHANNEL = 0       

# Define functions which animate LEDs
def colorWipe(strip, color, wait_ms=50):
    for i in range(strip.numPixels()):
        strip.setPixelColor(i, color)
        strip.show()
        time.sleep(wait_ms / 1000.0)

def solid(strip, color):
    for i in range(strip.numPixels()):
        strip.setPixelColor(i, color)
    strip.show()


strip = PixelStrip(LED_COUNT, LED_PIN, LED_FREQ_HZ, LED_DMA, LED_INVERT, LED_BRIGHTNESS, LED_CHANNEL)
strip.begin()

# wheel and rainbow cycle are from https://github.com/rpi-ws281x/rpi-ws281x-python/blob/master/examples/strandtest.py#L56
def wheel(pos):
# Generate rainbow colors across 0-255 positions
    if pos < 85:
        return Color(pos * 3, 255 - pos * 3, 0)
    elif pos < 170:
        pos -= 85
        return Color(255 - pos * 3, 0, pos * 3)
    else:
        pos -= 170
        return Color(0, pos * 3, 255 - pos * 3)

stopEverything = False
def rainbowCycle(strip, wait_ms=20):
    global stopEverything
    while not stopEverything:
        for j in range(256):
            if stopEverything:
                break
            for i in range(strip.numPixels()):
                if stopEverything:
                    break
                strip.setPixelColor(i, wheel(
                    (int(i * 256 / strip.numPixels()) + j) & 255))
            strip.show()
            time.sleep(wait_ms / 1000.0)

    stopEverything = False


# based on the color passed, random LED lights turn on and off to create matrix/rain effect
def togglePixelRandomly(strip, i, color):
    time.sleep(random.uniform(0, 2))
    strip.setPixelColor(i, color)
    strip.show()

    time.sleep(random.uniform(0, 2))
    strip.setPixelColor(i, Color(0, 0, 0))
    strip.show()

# flickers LED lights at random positions
def randomPosition(strip, color):
    solid(strip, color)
    indices = list(range(strip.numPixels()))
    random.shuffle(indices)
    for i in indices:
        pixelThread = threading.Thread(target=togglePixelRandomly, args=(strip, i, color))
        pixelThread.start()

# testing:
# colorWipe(strip, Color(65, 76, 23))

app = Flask(__name__)

# server endpoints
@app.route('/', methods=['GET'])
def home():
    return app.send_static_file('index.html')

@app.route('/<path:path>', methods=['GET'])
def index_get(path):
    return send_from_directory('static', path)

@app.route('/wipe', methods=['GET'])
def wipe_color():
    global stopEverything
    stopEverything = True
    rgb = [int(color) for color in request.args.get("rgb").split(":")]
    colorWipe(strip, Color(rgb[0], rgb[1], rgb[2]))
    return Response(json.dumps({"code": 200}), mimetype='application/json')

@app.route('/matrix', methods=['GET'])
def matrix():
    global stopEverything
    stopEverything = True
    rgb = [int(color) for color in request.args.get("rgb").split(":")]
    randomPosition(strip, Color(rgb[0], rgb[1], rgb[2]))
    return Response(json.dumps({"code": 200}), mimetype='application/json')

@app.route('/rainbow', methods=['GET'])
def rainbow():
    rainbowThread = threading.Thread(target=rainbowCycle, args=(strip,))
    rainbowThread.start()
    return Response(json.dumps({"code": 200}), mimetype='application/json')


@app.route('/solid', methods=['GET'])
def solid_color():
    global stopEverything
    stopEverything = True
    rgb = [int(color) for color in request.args.get("rgb").split(":")]
    solid(strip, Color(rgb[0], rgb[1], rgb[2]))
    return Response(json.dumps({"code": 200}), mimetype='application/json')

colorWipe(strip, Color(255, 255, 255))
app.run(host='0.0.0.0', ssl_context='adhoc', port=5001)
