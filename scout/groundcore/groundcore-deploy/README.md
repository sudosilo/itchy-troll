# GroundCore
**Mohave Valley Horticulture Platform**

Plant spacing calculator, species database, and sandbox planner for the Kingman / Mohave Valley, AZ region.

## Stack
- Single-file HTML/CSS/JS app
- Vite as build tool
- Deployed on Vercel via GitHub

## Local Dev
```bash
npm install
npm run dev
```
Opens at http://localhost:5173

## Deploy
Push to `main` branch. Vercel auto-deploys.

## Adding Plants
Edit the `PLANTS` array in `index.html`. Each plant needs:
- Basic info (name, sci, emoji, category, tags)
- Spacing recommendation (min, max, unit, note)
- Meter values 1-5 (water, sun, fertilizer, heat)
- Text fields (waterNeeds, nutrition, notes, mohaveNotes)
