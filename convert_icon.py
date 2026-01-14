from PIL import Image
import os

try:
    img = Image.open("tsl_icon.png")
    img.save("tsl_icon.ico", format='ICO', sizes=[(256, 256)])
    print("Successfully converted tsl_icon.png to tsl_icon.ico")
except Exception as e:
    print(f"Error converting icon: {e}")
