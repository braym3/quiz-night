# Avatars

Drop your avatar images in this folder, then list them in `manifest.json`.
They'll show up in the join-screen picker and across the player, master and
presenter views.

## Image spec

- **Format:** PNG or WebP (transparent background preferred)
- **Shape:** square (it's cropped to a circle in most views)
- **Size:** 256×256px is ideal (128px minimum)
- **Weight:** keep under ~150KB each so the join screen loads fast
- **Framing:** characters/faces that fill the frame with good contrast read
  best at small sizes

## Naming

Use lowercase, hyphenated, descriptive filenames, e.g.

```
cool-frog.png
party-cat.png
shades-dog.webp
```

## How to add them

1. Copy your images into this folder (`public/avatars/`).
2. Add each filename to the `avatars` array in `manifest.json`, with a short
   label shown as a tooltip:

```json
{
  "avatars": [
    { "file": "cool-frog.png",  "label": "Cool Frog" },
    { "file": "party-cat.png",  "label": "Party Cat" }
  ]
}
```

The app reads `manifest.json` at runtime, so no rebuild is needed — just add
the file and the entry.

> Tip: use the drag-and-drop previewer at `prototypes/avatar-tester.html` to
> check how an image looks as an avatar (and on light vs dark themes) before
> adding it here.

## A note on copyright

Memes and photos of celebrities are usually copyrighted. For a private game
with friends that's low risk, but avoid them if the quiz is ever public —
use your own images or properly licensed art.
