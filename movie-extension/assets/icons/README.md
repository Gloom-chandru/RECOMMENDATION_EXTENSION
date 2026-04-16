<!-- Icon Placeholder Information -->

The following icon files should be placed in this directory:

1. icon-16.png (16x16 pixels)
   - Used for extension menu
   - Should be clear and recognizable at small size
   - Suggested: Movie reel or film strip icon

2. icon-48.png (48x48 pixels)
   - Used in extension management page
   - Medium size representation

3. icon-128.png (128x128 pixels)
   - Used in Chrome Web Store
   - High resolution promotional icon
   - Most important for store listing

Icon Guidelines:
- Use transparent background (PNG)
- Ensure visibility in both light and dark modes
- Consider the brand: movies, recommendations, AI
- Modern flat design preferred
- Test readability at all sizes

Suggested Color Palette:
- Primary: Deep blue (#6366f1) or purple
- Accent: Vibrant orange or gold
- Background: Dark for light mode contrast

You can create these icons using:
- Figma (free tier)
- Photoshop
- GIMP (free)
- Online icon creators
- AI image generators (Midjourney, DALL-E)

Quick SVG-to-PNG conversion:
```bash
# Install imagemagick
brew install imagemagick  # macOS
apt install imagemagick   # Linux

# Convert
convert icon-128.svg -resize 16x16 icon-16.png
convert icon-128.svg -resize 48x48 icon-48.png
convert icon-128.svg icon-128.png
```

Sample Icon Concept:
A stylized "M" for Movie/Recommendations with:
- Film strip or reel element
- Sparkle or star for "smart" recommendations
- Modern, clean aesthetic
- Recognizable at all sizes
