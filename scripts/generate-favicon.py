"""Generate favicon.ico from Lucide book-open icon in orange."""
from PIL import Image, ImageDraw
import os


# Orange color matching the app's primary theme (warm amber)
ORANGE = (232, 146, 42, 255)
ORANGE_FILL = (232, 146, 42, 50)
BG_COLOR = (34, 28, 20, 255)


def draw_book_open(size: int) -> Image.Image:
    """Draw the Lucide book-open icon at the given size."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Add rounded rect background
    padding = max(1, size // 16)
    radius = max(2, size // 5)
    draw.rounded_rectangle(
        [padding, padding, size - padding - 1, size - padding - 1],
        radius=radius,
        fill=BG_COLOR,
    )

    # Scale from 24x24 Lucide viewBox to our size
    icon_padding = size * 0.24
    scale = (size - 2 * icon_padding) / 24
    ox = icon_padding
    oy = icon_padding + size * 0.01

    def s(x, y):
        return (ox + x * scale, oy + y * scale)

    stroke_width = max(1, round(1.6 * scale))

    # Left page: M2,3 -> top to (8,3) -> curve to (12,7) -> down to (12,21) -> bottom
    left_outline = []
    # Top-left corner
    left_outline.append(s(2, 3))
    # Top edge to start of curve
    left_outline.append(s(8, 3))
    # Curve from (8,3) to (12,7) - quarter circle approximation
    steps = 10
    for i in range(1, steps + 1):
        t = i / steps
        # Quadratic bezier: (8,3) -> (12,3) -> (12,7)
        x = (1-t)**2 * 8 + 2*(1-t)*t * 12 + t**2 * 12
        y = (1-t)**2 * 3 + 2*(1-t)*t * 3 + t**2 * 7
        left_outline.append(s(x, y))
    # Down the spine
    left_outline.append(s(12, 21))
    # Bottom curve: (12,21) -> (9,18) -> (2,18) approximation
    # a3 3 0 0 0-3-3 means curve back
    left_outline.append(s(9, 18))
    left_outline.append(s(2, 18))
    # Close
    left_outline.append(s(2, 3))

    # Right page: M22,3 -> (16,3) -> curve to (12,7) -> (12,21) -> (15,18) -> (22,18)
    right_outline = []
    right_outline.append(s(22, 3))
    right_outline.append(s(16, 3))
    for i in range(1, steps + 1):
        t = i / steps
        x = (1-t)**2 * 16 + 2*(1-t)*t * 12 + t**2 * 12
        y = (1-t)**2 * 3 + 2*(1-t)*t * 3 + t**2 * 7
        right_outline.append(s(x, y))
    right_outline.append(s(12, 21))
    right_outline.append(s(15, 18))
    right_outline.append(s(22, 18))
    right_outline.append(s(22, 3))

    # Fill pages with subtle orange
    draw.polygon(left_outline, fill=ORANGE_FILL)
    draw.polygon(right_outline, fill=ORANGE_FILL)

    # Draw outlines
    draw.polygon(left_outline, outline=ORANGE, width=stroke_width)
    draw.polygon(right_outline, outline=ORANGE, width=stroke_width)

    # Spine line
    draw.line([s(12, 7), s(12, 21)], fill=ORANGE, width=stroke_width)

    return img


def main():
    os.makedirs("public", exist_ok=True)

    # Generate individual size images
    sizes = [16, 32, 48, 64, 128, 256]
    images = []
    for sz in sizes:
        img = draw_book_open(sz)
        images.append(img)

    # Save as multi-size ICO
    # Pillow needs the largest image as base, others as append
    largest = images[-1]  # 256x256
    largest.save(
        "public/favicon.ico",
        format="ICO",
        sizes=[(s, s) for s in sizes],
    )

    # Also save individual PNGs for each size to verify
    # and then combine into ICO manually
    ico_images = []
    for sz in [16, 32, 48]:
        img = draw_book_open(sz)
        ico_images.append(img)

    # Save proper ICO with all sizes embedded
    img_16 = draw_book_open(16)
    img_32 = draw_book_open(32)
    img_48 = draw_book_open(48)
    img_64 = draw_book_open(64)

    img_32.save(
        "public/favicon.ico",
        format="ICO",
        append_images=[img_16, img_48, img_64],
    )

    # PNG versions for web
    img_192 = draw_book_open(192)
    img_192.save("public/icon-192.png", format="PNG")

    img_512 = draw_book_open(512)
    img_512.save("public/icon-512.png", format="PNG")

    # Verify sizes
    ico_size = os.path.getsize("public/favicon.ico")
    print(f"✓ Generated public/favicon.ico ({ico_size} bytes)")
    print(f"✓ Generated public/icon-192.png ({os.path.getsize('public/icon-192.png')} bytes)")
    print(f"✓ Generated public/icon-512.png ({os.path.getsize('public/icon-512.png')} bytes)")


if __name__ == "__main__":
    main()
