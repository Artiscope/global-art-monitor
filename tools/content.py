"""Words for the site.

The words now live in data/content.json, so they can be edited from
Artiscope Digital Home. This file only loads them for the build.

In article bodies:
  @@            is replaced with the path back to the site root
  [[TIMELINE:artist-slug]]  drops in that artist's auction table

An article with "hidden": true is left off the site.
"""
import json
import os

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATA = json.load(open(os.path.join(_ROOT, "data", "content.json"), encoding="utf-8"))

PUBLISHED = _DATA["published"]
PUBLISHED_TEXT = _DATA["published_text"]
SITE = _DATA["site"]
SECTIONS = [tuple(s) for s in _DATA["sections"]]
BIOS = {
    slug: {**bio, "sources": [tuple(s) for s in bio.get("sources", [])]}
    for slug, bio in _DATA["bios"].items()
}
FEATURES = [f for f in _DATA["features"] if not f.get("hidden")]
GLOSSARY = [tuple(g) if isinstance(g, list) else g for g in _DATA["glossary"]]
