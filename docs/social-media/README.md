# Social media pack

Generated from the running application. No image is drawn by a model and
no figure is invented.

| File | What it is |
| --- | --- |
| `assets/` | Real captures of the built app, `npm run shots` |
| `composed/` | Four 1080×1350 images built from them, `npm run social` |
| `linkedin-post-en.md` / `.txt` | The post in English |
| `linkedin-post-pt.md` / `.txt` | The same post in Portuguese |
| `codex-posting-prompt.md` | Instructions for the agent that publishes it |

```bash
npm run build && npm run preview -- --port 5301
SHOT_URL=http://localhost:5301/ npm run shots
npm run social
```

The capture script types an example document in before shooting, because
the app opens empty — correctly, since it invents nothing. The business,
the client and the figures in it are made up.

The document appears whole in the composition, scaled down rather than
cropped: showing three quarters of the thing the slide is about would be
worse than showing all of it smaller.
