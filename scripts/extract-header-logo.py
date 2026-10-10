"""Build the public AURIUS brand lockup from the supplied CorelDRAW SVG."""

from __future__ import annotations

from pathlib import Path
from xml.etree import ElementTree


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_SVG = PROJECT_ROOT.parent / "AURIUS网站(1)22(2).svg"
OUTPUT_SVG = PROJECT_ROOT / "frontend" / "public" / "brand" / "aurius-logo.svg"
VIEW_BOX = "600 850 11750 3710"
WORDMARK_COLOUR = "#0da19f"
TAGLINE_COLOUR = "#333333"


def source_paths() -> list[str]:
    root = ElementTree.parse(SOURCE_SVG).getroot()
    paths = [
        element.get("d", "").strip()
        for element in root.iter()
        if element.tag.rsplit("}", 1)[-1] == "path"
    ]
    if len(paths) != 3 or not all(paths):
        raise RuntimeError(f"Expected exactly three non-empty paths in {SOURCE_SVG}, found {len(paths)}")
    return paths


def build_svg() -> str:
    wordmark, registered_mark, tagline = source_paths()
    svg = "\n".join(
        (
            '<?xml version="1.0" encoding="UTF-8"?>',
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{VIEW_BOX}" role="img" aria-label="AURIUS — Smart Toilet | Whole House Water Filtration">',
            f'  <path fill="{WORDMARK_COLOUR}" fill-rule="evenodd" d="{wordmark}"/>',
            f'  <path fill="{WORDMARK_COLOUR}" fill-rule="evenodd" d="{registered_mark}"/>',
            f'  <path fill="{TAGLINE_COLOUR}" fill-rule="nonzero" d="{tagline}"/>',
            "</svg>",
            "",
        )
    )
    if any(marker in svg.lower() for marker in ("<image", "<text", "font-family")):
        raise RuntimeError("Generated SVG must contain vector paths only")
    return svg


def main() -> None:
    OUTPUT_SVG.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_SVG.write_text(build_svg(), encoding="utf-8", newline="\n")
    print(f"Wrote three-path brand lockup to {OUTPUT_SVG} with viewBox={VIEW_BOX}")


if __name__ == "__main__":
    main()
