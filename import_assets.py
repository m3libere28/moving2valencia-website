import os
import shutil
import re

source_dir = r"C:\Users\m3lib\Desktop\The Mystery Archive\Animated UFO"
dest_dir = r"C:\Users\m3lib\Desktop\The Mystery Archive\public\assets"

os.makedirs(dest_dir, exist_ok=True)
files = [f for f in os.listdir(source_dir) if f.endswith('.png')]

def parse_file(f):
    m1 = re.search(r'(\d{2}_\d{2}_\d{2} [AP]M)', f)
    time_str = m1.group(1) if m1 else ""
    m2 = re.search(r'\((\d+)\)', f)
    num = int(m2.group(1)) if m2 else 99
    return (time_str, num)

files.sort(key=parse_file)

for i, f in enumerate(files):
    src = os.path.join(source_dir, f)
    dst = os.path.join(dest_dir, f'ufo-frame-{i+1}.png')
    shutil.copy2(src, dst)
    print(f"Copied {f} -> ufo-frame-{i+1}.png")
