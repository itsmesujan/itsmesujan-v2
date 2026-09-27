"""Generate every portfolio image at true 4K, then ship a correctly-sized web weight.

Why this rewrite
----------------
The previous version asked for sizes like `1200x900` and `1536x1024`. The
endpoint silently ignored every one of them: it has a whitelist, and anything
off it falls back to a small preset. Measured truth (scripts/probe-sizes.py):

    requested      actually returned
    4096x4096  ->  4096x4096   exact
    2048x2048  ->  2048x2048   exact
    3840x2160  ->  3845x2157   true 4K
    1200x900   ->  1152x864    downgraded
    1536x1024  ->  1248x832    downgraded
    1920x1080  ->  1312x736    downgraded
    2560x1440  ->  1312x736    downgraded
    1536x1536  ->  1024x1024   downgraded

So every image in the repo before this change was an under-resolution
fallback, and each was also far too heavy for the web (1.3 MB at 1152px).

This script therefore:
  1. generates at a whitelisted 4K size,
  2. centre-crops to the aspect the design actually uses,
  3. downscales to a sensible web weight with Pillow (LANCZOS),
  4. overwrites the shipped file and deletes the 4K master unless --keep.

Run:  python scripts/gen-assets.py            # only missing/wrong-sized files
      python scripts/gen-assets.py --force    # regenerate everything
      python scripts/gen-assets.py --keep     # also keep 4K masters
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import struct
import time
import urllib.request
from pathlib import Path

from PIL import Image

API = "https://apihub.agnes-ai.com/v1"
MODEL = "agnes-image-2.5-flash"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "media"
MASTERS = ROOT / ".masters"

# Free tier: the endpoint rate-limits hard. 30s between calls is polite and
# has proven reliable across the probe runs.
DELAY = 30

# ---- art direction -------------------------------------------------------
# One palette across the whole set: carbon black, bone white, one signal
# orange. Every image is a studio-lit object study, never a photo collage.
NEG = (
    "no text, no watermark, no logo, no people faces, no borders, "
    "no UI elements, hyper detailed, cinematic studio render, volumetric light, "
    "matte finish, editorial product photography"
)

PROMPTS: dict[str, str] = {
    # Poster painted before the WebGL scene initialises, and the permanent
    # static composition when a device never gets a context.
    "poster-hero": (
        "A colossal carbon-black monolith of stacked glass and brushed steel, "
        "sliced by a single warm orange seam of light, floating in a void of "
        "fine graphite dust. Extreme negative space, matte bone-white rim "
        "light from the left, deep shadow to the right. Abstract, "
        "architectural, product-photography lighting. " + NEG
    ),
    "cover-devpilot": (
        "Abstract data sculpture: a dense lattice of glowing routing paths "
        "converging into one bright node, dark graphite background, cold white "
        "lines with a single orange highlighted route, extreme close up, "
        "shallow depth of field. " + NEG
    ),
    "cover-agentx": (
        "Abstract self-repairing machine: concentric fracture rings healing "
        "themselves with light, dark void, thin white seams, one orange seam "
        "fully healed, macro studio render. " + NEG
    ),
    "cover-kotobax": (
        "Abstract speech waveform sculpture made of layered translucent glass "
        "slabs compressing into a single word-shaped void, charcoal background, "
        "warm orange inner glow, minimalist. " + NEG
    ),
    "cover-modelmesh": (
        "Abstract polygon mesh skin draped over an unseen form, wireframe "
        "edges glowing white, dark background, a few faces filled matte black, "
        "one cluster of faces lit orange, technical and clean. " + NEG
    ),
    "cover-filmmaker": (
        "Abstract film strip dissolving into a cloud of light particles, dark "
        "background, monochrome frames with one glowing orange frame, "
        "cinematic, clean, minimal. " + NEG
    ),
    "cover-nexgen": (
        "Abstract studio of floating glass panels arranged in a loose grid, each "
        "etched with faint circuitry, dark charcoal void, one panel lit warm "
        "orange, soft studio light, isometric. " + NEG
    ),
    "og-card": (
        "Wide dark charcoal abstract: a thin bright orange line cutting "
        "horizontally across a field of fine grey grain and a soft glow, "
        "extremely minimal, generous negative space. " + NEG
    ),
}

# name -> (generate_size, crop_aspect, shipped_size, quality)
SPECS: dict[str, tuple[str, float, tuple[int, int], int]] = {
    "poster-hero": ("4096x4096", 16 / 9, (2400, 1350), 82),
    "cover-devpilot": ("4096x4096", 4 / 3, (1600, 1200), 84),
    "cover-agentx": ("4096x4096", 4 / 3, (1600, 1200), 84),
    "cover-kotobax": ("4096x4096", 4 / 3, (1600, 1200), 84),
    "cover-modelmesh": ("4096x4096", 4 / 3, (1600, 1200), 84),
    "cover-filmmaker": ("4096x4096", 4 / 3, (1600, 1200), 84),
    "cover-nexgen": ("4096x4096", 4 / 3, (1600, 1200), 84),
    "og-card": ("4096x4096", 1200 / 630, (1200, 630), 88),
}


def load_key() -> str:
    if os.environ.get("AGNES_API_KEY"):
        return os.environ["AGNES_API_KEY"]
    env_path = Path(os.path.expandvars(r"%LOCALAPPDATA%\hermes\.env"))
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if line.startswith("AGNES_API_KEY"):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("AGNES_API_KEY not found")


def image_size(raw: bytes) -> tuple[int, int] | None:
    """Read intrinsic dimensions from raw bytes so we verify what arrived."""
    if raw[:2] == b"\xff\xd8":  # JPEG
        i = 2
        while i < len(raw) - 9:
            if raw[i] != 0xFF:
                i += 1
                continue
            marker = raw[i + 1]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3):
                h, w = struct.unpack(">HH", raw[i + 5 : i + 9])
                return w, h
            if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
                i += 2
                continue
            i += 2 + struct.unpack(">H", raw[i + 2 : i + 4])[0]
    if raw[:8] == b"\x89PNG\r\n\x1a\n":  # PNG
        return struct.unpack(">II", raw[16:24])
    return None


def generate(key: str, prompt: str, size: str, attempts: int = 3) -> bytes:
    payload = json.dumps(
        {"model": MODEL, "prompt": prompt, "size": size, "n": 1}
    ).encode()
    last = ""
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(
                f"{API}/images/generations",
                data=payload,
                method="POST",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
            )
            with urllib.request.urlopen(req, timeout=600) as res:
                body = json.loads(res.read().decode("utf-8", "ignore"))
            if "error" in body:
                raise RuntimeError(str(body["error"])[:180])
            item = body["data"][0]
            if item.get("b64_json"):
                return base64.b64decode(item["b64_json"])
            with urllib.request.urlopen(item["url"], timeout=600) as img:
                return img.read()
        except Exception as exc:  # noqa: BLE001 - retry any transport failure
            last = str(exc)[:200]
            time.sleep(12 * (attempt + 1))
    raise RuntimeError(f"generation failed after {attempts} tries: {last}")


def centre_crop(img: Image.Image, aspect: float) -> Image.Image:
    """Crop to the target aspect, centred."""
    w, h = img.size
    current = w / h
    if current > aspect:  # too wide -> trim sides
        new_w = int(round(h * aspect))
        left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    new_h = int(round(w / aspect))  # too tall -> trim top/bottom
    top = (h - new_h) // 2
    return img.crop((0, top, w, top + new_h))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="regenerate existing files")
    ap.add_argument("--keep", action="store_true", help="retain 4K masters")
    ap.add_argument("--only", nargs="*", help="restrict to these asset names")
    args = ap.parse_args()

    key = load_key()
    OUT.mkdir(parents=True, exist_ok=True)
    MASTERS.mkdir(exist_ok=True)

    names = [n for n in SPECS if not args.only or n in args.only]
    if not names:
        raise SystemExit("no matching asset names")

    for i, name in enumerate(names, 1):
        gen_size, aspect, out_size, quality = SPECS[name]
        dest = OUT / f"{name}.jpg"
        master = MASTERS / f"{name}-4k.jpg"

        if not args.force and dest.exists():
            with Image.open(dest) as im:
                current = im.size
            if current == out_size and dest.stat().st_size > 4096:
                print(
                    f"[{i}/{len(names)}] skip  {name}  already "
                    f"{out_size[0]}x{out_size[1]}",
                    flush=True,
                )
                continue
            print(
                f"[{i}/{len(names)}] regen {name}  existing is "
                f"{current[0]}x{current[1]}, need {out_size[0]}x{out_size[1]}",
                flush=True,
            )

        print(f"[{i}/{len(names)}] gen   {name}  requesting {gen_size} ...", flush=True)
        raw = generate(key, PROMPTS[name], gen_size)
        got = image_size(raw)
        if got is None:
            raise RuntimeError(f"{name}: unrecognised image format returned")
        print(f"        got  {got[0]}x{got[1]}  {len(raw) // 1024} KB", flush=True)
        if got[0] < 3000:
            print("        !! WARNING: below 4K master quality", flush=True)

        master.write_bytes(raw)
        with Image.open(master) as im:
            im = im.convert("RGB")
            cropped = centre_crop(im, aspect)
            # LANCZOS keeps edges clean going 4096 -> 1600.
            final = cropped.resize(out_size, Image.Resampling.LANCZOS)
            final.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)

        kb = dest.stat().st_size // 1024
        print(f"        ship {dest.name}  {out_size[0]}x{out_size[1]}  {kb} KB", flush=True)

        if i < len(names):
            time.sleep(DELAY)

    if not args.keep:
        for m in MASTERS.glob("*-4k.jpg"):
            m.unlink()
        print("masters removed (pass --keep to retain them)")


if __name__ == "__main__":
    main()
