from PIL import Image
import os

try:
    img = Image.open("tsl_icon.png")
    # Windows icons typically include these sizes
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save("tsl_icon.ico", format='ICO', sizes=icon_sizes)
    print("Successfully converted tsl_icon.png to tsl_icon.ico with multiple sizes.")
except Exception as e:
    print(f"Error converting icon: {e}")
