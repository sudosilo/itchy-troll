# DRONESIM // Operator Console

Pixel-art drone show simulator. ~100 drones, DAW-style timeline, single-point
perspective from the ground.

## Run

```
npm install
npm run dev      # local
npm run build    # production
```

## Deploy (Vercel CLI, Termux flow)

```
git init && git add -A && git commit -m "init"
gh repo create dronesim --public --source=. --push
vercel --prod
```

Vite preset auto-detected; no config needed.

## Structure

- `src/App.jsx` — main shell, sky canvas, transport, timeline view
- `src/formations.js` — shape generators + `shapeFromImage(file, N)` raster-to-formation
- `src/index.css` — global styles, operator console aesthetic

## Concepts

- Drones live in normalized space `x,y ∈ [-1, 1]`. Sky canvas projects to pixels.
- Formations are arrays of N points. Each clip references one.
- Transitions: random-order greedy nearest-target assignment on clip change.
  Drones ease toward target with exponential decay.
- Timeline: single horizontal track. Drag clips to move, edge-grab to resize.
- Audio is optional. If loaded, its duration overrides the show length.
- Sky transitions afternoon → dusk over the show; stars fade in past 30%.

## Things to add next

- Multiple tracks (color-only, motion-only)
- Snap-to-beat via Web Audio analyser
- Export to MP4 via canvas capture
- Save/load show JSON
- Keyframe interpolation between formations

Maintained by the scribe

Dronesim is a drone show simulator with a pixel art look. It is for anyone who wants to plan a light show on a timeline.

About one hundred drones fly in formation over a night sky seen from the ground. A timeline lets clips be dragged and resized, and each clip sets a formation. Formations can be built from shapes or from an uploaded image. Audio is optional, and a loaded track sets the show length. The sky shifts from afternoon to dusk as the show plays.

Live at dronesim-blue.vercel.app

This app is checked every morning by Control Troll.

Latest change. First release. Dronesim is an operator console for drone shows with a timeline, formations, and optional audio.

See CHANGELOG.md for the full history.
