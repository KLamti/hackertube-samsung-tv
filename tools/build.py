#!/usr/bin/env python3
"""Build an unsigned WGT for signing/installing with Apps2Samsung."""
from pathlib import Path
import hashlib
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'hackertube'
# Explicit file list keeps local signing artifacts and credentials out of releases.
FILES = [
    'index.html', 'config.xml', 'css/app.css', 'js/core.js', 'js/api.js',
    'js/tizen.js', 'js/player.js', 'js/main.js', 'img/icon.png', 'fonts/InterVariable.woff2',
    'fonts/OFL.txt',
]
version = ET.parse(APP / 'config.xml').getroot().attrib['version']
output = ROOT / 'dist' / ('HackerTube-' + version + '-unsigned.wgt')
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for name in FILES:
        info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, (APP / name).read_bytes())
digest = hashlib.sha256(output.read_bytes()).hexdigest()
(output.parent / 'SHA256SUMS.txt').write_text(digest + '  ' + output.name + '\n')
print(output)
print('Unsigned: sign for your own TV before installing.')
