import sys
from rembg import remove
from PIL import Image

def process():
    paths = [
        r"C:\Users\m3lib\Desktop\The Mystery Archive\public\assets\ufo-frame-{}.png".format(i)
        for i in range(1, 21)
    ]
    for path in paths:
        print(f"Processing {path}...")
        try:
            img = Image.open(path)
            output = remove(img)
            output.save(path)
            print("  Success")
        except Exception as e:
            print("  Error:", e)
            
if __name__ == "__main__":
    process()
