#!/usr/bin/env python3
"""Checks the shared list of links between the five Artiscope sites.

  python3 tools/check_artiscope_links.py <site> <built folder>

<site> is this site's key in the list: gam, sad, tac, tawr or war.
It reads artiscope-links.json (data/, or content/ on World Art Review)
and checks that every page the list gives for this site exists in the
built folder, so no other site links to a page that is not there. Run it
in each repository after a build whenever the list changes.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    site, built = sys.argv[1], sys.argv[2]
    path = next((p for p in (os.path.join(ROOT, d, "artiscope-links.json") for d in ("data", "content")) if os.path.exists(p)), None)
    if not path:
        sys.exit("artiscope-links.json was not found in data/ or content/.")
    links = json.load(open(path, encoding="utf-8"))
    if site not in links.get("sites", {}):
        sys.exit("Unknown site key: %s" % site)
    missing, count = [], 0
    for key, artist in links.get("artists", {}).items():
        value = artist.get(site)
        paths = [t.get("path") for t in value] if isinstance(value, list) else [value] if value else []
        for p in paths:
            count += 1
            if not os.path.isfile(os.path.join(built, p, "index.html")):
                missing.append("%s: %s" % (artist.get("name", key), p))
    if missing:
        sys.exit("These pages are in the list but not in the built site:\n  " + "\n  ".join(missing))
    print("All %d %s pages in the list exist." % (count, links["sites"][site]["name"]))


if __name__ == "__main__":
    main()
