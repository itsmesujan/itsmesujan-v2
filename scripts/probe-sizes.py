"""Probe which image sizes the Agnes endpoint actually honours.

The original gen-assets.py asked for 1200x900 and received 1152x864, i.e. the
`size` parameter is not honoured the way an OpenAI-compatible endpoint should.
This script measures the truth so the real prompts can be written against it.

Run:  python scripts/probe-sizes.py 3840x2160 2560x1440 1536x1024
"""

from __future__ import annotations

import base64
import json
import struct
import sys
import time
import urllib.request
from pathlib import Path

API = "https://apihub.agnes-ai.com/v1"
MODEL = "agnes-image-2.5-flash"
TMP = Path(__file__).resolve().parent.parent / ".probe"
DELAY = 30  # free-tier rate limit: be polite


def load_key() -> str:
    import os

    if os.environ.get("AGNES_API_KEY"):
        return os.environ["AGNES_API_KEY"]
    env_path = Path(os.path.expandvars(r"%LOCALAPPDATA%\hermes\.env"))
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if line.strip().startswith("AGNES_API_KEY"):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("AGNES_API_KEY not found")


def jpeg_size(raw: bytes) -> tuple[int, int] | None:
    if raw[:2] != b"\xff\xd8":
        return None
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
    return None


def png_size(raw: bytes) -> tuple[int, int] | None:
    return struct.unpack(">II", raw[16:24]) if raw[:8] == b"\x89PNG\r\n\x1a\n" else None


def fetch(key: str, size: str) -> bytes:
    payload = json.dumps(
        {
            "model": MODEL,
            "prompt": (
                "abstract dark monolith, single orange seam of light, "
                "cinematic studio render, no text, no watermark"
            ),
            "size": size,
            "n": 1,
        }
    ).encode()
    req = urllib.request.Request(
        f"{API}/images/generations",
        data=payload,
        method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=300) as res:
        body = json.loads(res.read().decode("utf-8", "ignore"))
    if "error" in body:
        raise RuntimeError(str(body["error"])[:160])
    item = body["data"][0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    with urllib.request.urlopen(item["url"], timeout=300) as img:
        return img.read()


def main() -> None:
    key = load_key()
    TMP.mkdir(exist_ok=True)
    sizes = sys.argv[1:] or ["2048x2048", "1536x1024"]
    for size in sizes:
        try:
            raw = fetch(key, size)
        except Exception as exc:  # noqa: BLE001 - report, do not crash the sweep
            print(f"{size:>12} -> ERROR {str(exc)[:150]}")
            time.sleep(DELAY)
            continue
        dims = jpeg_size(raw) or png_size(raw)
        (TMP / f"probe-{size}.bin").write_bytes(raw)
        if not dims:
            print(f"{size:>12} -> GOT unrecognised image format  {len(raw) // 1024} KB")
        else:
            print(f"{size:>12} -> GOT {dims[0]}x{dims[1]}  {len(raw) // 1024} KB")
            if f"{dims[0]}x{dims[1]}" != size:
                print(f"{'':>12}    !! size NOT honoured")
        time.sleep(DELAY)


if __name__ == "__main__":
    main()
