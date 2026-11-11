#!/usr/bin/env python3
"""Places photos sent from Artiscope Digital Home, straight away.

It only handles the simple, safe case: a photo sent for an EMPTY spot
that the page can already show. Everything else is left in inbox/ for
the website agent, which uses judgement and asks the owner when needed.

Handled here:
  World Art Review     artist main images and article images
  Global Art Monitor   artist profile images

Left for the agent:
  artwork photos, replacing an existing image, photos with only a
  description (note--...), and anything this script is unsure about.

Run from the repository root:  python3 .github/scripts/place_photos.py
Prints one line per photo saying what it did and why.
"""
import json
import os
import re
import subprocess
import sys

from PIL import Image

ROOT = os.getcwd()
INBOX = os.path.join(ROOT, "inbox")
SLOTS = os.path.join(ROOT, "image-slots.json")
IS_BUILT_SITE = os.path.exists(os.path.join(ROOT, "tools", "build.py"))
MAX_SIDE = 2000
MAX_BYTES = 400_000


def clean(text, limit):
    """Plain single-line text that is safe inside the page."""
    text = re.sub(r"[\r\n\t]+", " ", str(text or ""))
    text = re.sub(r"[<>`\\\\]", "", text)
    text = text.replace("—", ",").replace("–", "-")
    return re.sub(r" {2,}", " ", text).strip()[:limit]


def save_image(src, dest):
    im = Image.open(src)
    im.load()
    keep_png = dest.endswith(".png")
    if not keep_png:
        im = im.convert("RGB")
    scale = min(1.0, MAX_SIDE / max(im.size))
    if scale < 1.0:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if keep_png:
        im.save(dest, optimize=True)
        return
    for quality in (86, 82, 78, 74, 70):
        im.save(dest, quality=quality, optimize=True, progressive=True)
        if os.path.getsize(dest) <= MAX_BYTES:
            break


def js(text):
    """A JavaScript string literal."""
    return json.dumps(text, ensure_ascii=False)


# ---------- World Art Review: one file, content in lists ----------

def page_scripts_ok(html):
    """The page's own scripts must still parse after an edit."""
    blocks = re.findall(r"<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>", html, re.S)
    for i, (attrs, code) in enumerate(blocks):
        if not code.strip():
            continue
        kind = re.search(r'type="([^"]*)"', attrs)
        kind = kind.group(1).lower() if kind else ""
        if kind in ("importmap", "application/json", "application/ld+json"):
            try:
                json.loads(code)
            except ValueError:
                return False
            continue
        if kind not in ("", "text/javascript", "module"):
            continue
        path = f"/tmp/_check_{i}." + ("mjs" if kind == "module" else "js")
        with open(path, "w", encoding="utf-8") as f:
            f.write(code)
        if subprocess.run(["node", "--check", path], capture_output=True).returncode != 0:
            return False
    return True


def place_single_file(slot_id, rel_image, alt, caption):
    """Returns (new_html, reason). new_html is None if it should wait."""
    path = os.path.join(ROOT, "index.html")
    html = open(path, encoding="utf-8").read()
    lines = html.split("\n")

    if slot_id.startswith("artist-"):
        slug = slot_id[len("artist-"):]
        idx = next((i for i, l in enumerate(lines) if l.startswith(f'  slug:"{slug}", name:')), None)
        if idx is None:
            return None, "the artist was not found on the page"
        if 'image:null, alt:""' not in lines[idx]:
            return None, "the artist already has an image, so replacing it needs approval"
        lines[idx] = lines[idx].replace('image:null, alt:""', f"image:{js(rel_image)}, alt:{js(alt)}", 1)
        if caption:
            end = min(idx + 8, len(lines))
            hit = next((j for j in range(idx + 1, end) if lines[j].startswith("  heroCredit:")), None)
            if hit is not None:
                lines[hit] = f"  heroCredit:{js(caption)},"
            else:
                lines.insert(idx + 1, f"  heroCredit:{js(caption)},")
        return "\n".join(lines), "placed as the artist's main image"

    if slot_id.startswith("article-"):
        slug = slot_id[len("article-"):]
        idx = next((i for i, l in enumerate(lines) if l.startswith(f'  slug:"{slug}", section:')), None)
        if idx is None:
            return None, "the article was not found on the page"
        if "image:" in lines[idx]:
            return None, "the article already has an image, so replacing it needs approval"
        lines[idx] = lines[idx].rstrip()
        if not lines[idx].endswith(","):
            return None, "the article entry has an unexpected shape"
        lines[idx] += f" image:{js(rel_image)}, alt:{js(alt)},"
        end = min(idx + 8, len(lines))
        hit = next((j for j in range(idx + 1, end) if lines[j].startswith("  credit:")), None)
        if caption:
            if hit is not None:
                lines[hit] = f"  credit:{js(caption)},"
            else:
                lines.insert(idx + 1, f"  credit:{js(caption)},")
        elif hit is not None:
            lines[hit] = lines[hit].replace(" [Image to supply]", "")
        return "\n".join(lines), "placed as the article's image"

    return None, "this kind of spot is handled by the agent"


# ---------- Global Art Monitor: pages built by a script ----------

def place_built_site(slot_id, src, ext, alt, caption):
    if not slot_id.startswith("artist-"):
        return False, "this kind of spot is handled by the agent"
    slug = slot_id[len("artist-"):]
    data = json.load(open(os.path.join(ROOT, "data", "sales.json"), encoding="utf-8"))
    if slug not in data.get("artists", {}):
        return False, "the artist was not found in the site data"
    folder = os.path.join(ROOT, "assets", "images")
    for e in ("jpg", "jpeg", "png", "webp"):
        if os.path.exists(os.path.join(folder, f"{slug}.{e}")):
            return False, "the artist already has an image, so replacing it needs approval"
    save_image(src, os.path.join(folder, f"{slug}.{ext}"))
    notes_path = os.path.join(ROOT, "data", "images.json")
    notes = json.load(open(notes_path, encoding="utf-8")) if os.path.exists(notes_path) else {}
    notes[slug] = {"alt": alt, "caption": caption}
    json.dump(notes, open(notes_path, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    built = subprocess.run([sys.executable, os.path.join("tools", "build.py")], capture_output=True, text=True)
    if built.returncode != 0:
        os.remove(os.path.join(folder, f"{slug}.{ext}"))
        return False, "the site build failed, so nothing was changed"
    return True, "placed on the artist's profile page"


# ---------- the run ----------

def main():
    if not os.path.isdir(INBOX) or not os.path.exists(SLOTS):
        print("Nothing to do.")
        return 0
    slots = json.load(open(SLOTS, encoding="utf-8"))
    by_id = {s.get("id"): s for s in slots.get("slots", [])}
    placed = 0

    for name in sorted(os.listdir(INBOX)):
        m = re.fullmatch(r"slot--([a-z0-9][a-z0-9-]{1,90})\.(jpg|png)", name)
        if not m:
            continue
        slot_id, ext = m.group(1), m.group(2)
        src = os.path.join(INBOX, name)
        note_path = os.path.join(INBOX, f"slot--{slot_id}.json")
        slot = by_id.get(slot_id)
        if slot is None:
            print(f"LEFT   {name}: that spot is not on the list")
            continue
        if slot.get("filled") is True:
            print(f"LEFT   {name}: the spot already has an image, so replacing it needs approval")
            continue
        note = {}
        if os.path.exists(note_path):
            try:
                note = json.load(open(note_path, encoding="utf-8"))
            except ValueError:
                note = {}
        alt = clean(note.get("alt"), 240)
        caption = clean(note.get("caption"), 160)
        if not alt:
            print(f"LEFT   {name}: no description was given, so the agent will write one")
            continue
        try:
            Image.open(src).verify()
        except Exception:
            print(f"LEFT   {name}: the file could not be read as an image")
            continue

        if IS_BUILT_SITE:
            ok, reason = place_built_site(slot_id, src, ext, alt, caption)
        else:
            rel = f"images/{slot_id}.{ext}"
            new_html, reason = place_single_file(slot_id, rel, alt, caption)
            ok = new_html is not None
            if ok and not page_scripts_ok(new_html):
                ok, reason = False, "the page failed its safety check, so nothing was changed"
            if ok:
                save_image(src, os.path.join(ROOT, rel))
                with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
                    f.write(new_html)

        if not ok:
            print(f"LEFT   {name}: {reason}")
            continue
        slot["filled"] = True
        os.remove(src)
        if os.path.exists(note_path):
            os.remove(note_path)
        placed += 1
        print(f"PLACED {name}: {reason}")

    if placed:
        json.dump(slots, open(SLOTS, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"{placed} photo(s) placed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
