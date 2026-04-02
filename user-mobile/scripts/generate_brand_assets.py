from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "assets"

# Mirrors frontend/public/favicon.svg exactly.
SVG_SIZE = 64.0
BG_START = (207, 141, 50)  # #cf8d32
BG_END = (28, 104, 87)  # #1c6857
MARK_FILL = (255, 249, 239, 255)  # #fff9ef
BASE_FILL = (255, 249, 239, 217)  # #fff9ef with 0.85 opacity


def _mix_rgb(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(round(a[0] + (b[0] - a[0]) * t)),
        int(round(a[1] + (b[1] - a[1]) * t)),
        int(round(a[2] + (b[2] - a[2]) * t)),
    )


def _scale(points: list[tuple[float, float]], ratio: float) -> list[tuple[float, float]]:
    return [(x * ratio, y * ratio) for x, y in points]


def _create_background(size: int) -> Image.Image:
    gradient = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pixels = gradient.load()

    denom = max((size - 1) * 2, 1)
    for y in range(size):
        for x in range(size):
            t = (x + y) / denom
            r, g, b = _mix_rgb(BG_START, BG_END, t)
            pixels[x, y] = (r, g, b, 255)

    mask = Image.new("L", (size, size), 0)
    draw_mask = ImageDraw.Draw(mask)
    radius = round(14 * size / SVG_SIZE)
    draw_mask.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)

    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(gradient, (0, 0), mask)
    return icon


def _draw_mark(image: Image.Image) -> None:
    ratio = image.size[0] / SVG_SIZE
    draw = ImageDraw.Draw(image)

    # Path: M14 43V27h5v16z
    left_stroke = _scale(
        [
            (14, 43),
            (14, 27),
            (19, 27),
            (19, 43),
        ],
        ratio,
    )

    # Path: m8 0V21h5l4 8 4-8h5v22h-5V30l-4 8h-1l-4-8v13z
    right_stroke = _scale(
        [
            (22, 43),
            (22, 21),
            (27, 21),
            (31, 29),
            (35, 21),
            (40, 21),
            (40, 43),
            (35, 43),
            (35, 30),
            (31, 38),
            (30, 38),
            (26, 30),
            (26, 43),
        ],
        ratio,
    )

    draw.polygon(left_stroke, fill=MARK_FILL)
    draw.polygon(right_stroke, fill=MARK_FILL)

    draw.rounded_rectangle(
        (
            12 * ratio,
            47 * ratio,
            52 * ratio,
            50 * ratio,
        ),
        radius=1.5 * ratio,
        fill=BASE_FILL,
    )


def create_icon(size: int) -> Image.Image:
    icon = _create_background(size)
    _draw_mark(icon)
    return icon


def main() -> None:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    icon_1024 = create_icon(1024)
    icon_1024.save(ASSETS_DIR / "icon.png")
    icon_1024.save(ASSETS_DIR / "adaptive-icon.png")
    icon_1024.save(ASSETS_DIR / "splash-icon.png")

    favicon = create_icon(256)
    favicon.save(ASSETS_DIR / "favicon.png")

    print("Generated brand assets from website favicon style:")
    for name in ("icon.png", "adaptive-icon.png", "splash-icon.png", "favicon.png"):
        print(ASSETS_DIR / name)


if __name__ == "__main__":
    main()
