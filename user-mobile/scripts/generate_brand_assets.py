from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "assets"
SOURCE_LOGO = ASSETS_DIR / "logo-source.png"


def render_square(source: Image.Image, size: int) -> Image.Image:
    # Keep exact logo framing and center-crop only if source is non-square.
    src = source.convert("RGBA")
    side = min(src.width, src.height)
    left = (src.width - side) // 2
    top = (src.height - side) // 2
    cropped = src.crop((left, top, left + side, top + side))
    return cropped.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    if not SOURCE_LOGO.exists():
        raise FileNotFoundError(f"Logo source not found: {SOURCE_LOGO}")

    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    source = Image.open(SOURCE_LOGO)

    icon_1024 = render_square(source, 1024)
    icon_1024.save(ASSETS_DIR / "icon.png")
    icon_1024.save(ASSETS_DIR / "adaptive-icon.png")
    icon_1024.save(ASSETS_DIR / "splash-icon.png")

    favicon = render_square(source, 256)
    favicon.save(ASSETS_DIR / "favicon.png")

    print("Generated brand assets from logo-source.png:")
    for name in ("icon.png", "adaptive-icon.png", "splash-icon.png", "favicon.png"):
        print(ASSETS_DIR / name)


if __name__ == "__main__":
    main()
