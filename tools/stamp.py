#!/usr/bin/env python3
"""Stamp a fresh version on every file index.html loads, so visitors never see a stale copy.
Run it right before you commit:  python3 tools/stamp.py"""
import os, re, time

index = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'index.html')
v = time.strftime('%Y%m%d%H%M')
html = open(index).read()
html = re.sub(r'((?:href|src)="(?:css|js|data)/[^"?]+\.(?:css|js))(?:\?v=\w+)?"', rf'\1?v={v}"', html)
open(index, 'w').write(html)
print('stamped', v)
