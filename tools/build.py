#!/usr/bin/env python3
"""Builds the Global Art Monitor site into the repository root.

Run from anywhere:  python3 tools/build.py
The pages are drawn by assets/render.js (the same code the page editor in
Artiscope Digital Home uses for its preview), run here with Node through
tools/build.mjs. Words live in data/content.json, sales in data/sales.json,
the sections of each page in data/pages.json.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.exit(subprocess.call(["node", os.path.join(HERE, "build.mjs")]))
