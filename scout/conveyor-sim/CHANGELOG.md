Conveyor Sim changelog

2026-11-22. Stack import. A Stack tab takes text pasted from the pipeline builder, and links can carry a stack as #stack= (base64url JSON) or #tools=frontend:Next.js,infra:Vercel. Each tool is matched to a machine and laid out as a factory: main line, side lines after a work splitter, and a showroom at the end. New machines: Showroom (frontend), Arcade Cabinet (game engine), Cash Register (payments), Holding Hopper (job queue), Pneumatic Tube (websocket), Doorbell (webhook), Vending Machine (CDN), Ticker Tape (monitoring), Oracle (AI), Cold Locker (file storage) and Unbuilt Machine for gaps. Hosts color the floor under the machines they run. Tools with no machine sit in a gap row and are listed as gaps. Example stack: Neopets-style virtual pet game.

2026-11-21, v2026.11.21. Built a packet factory, then rebuilt the whole site as a visual pipeline builder. Sixteen machine types stand for parts of a website and run a live simulation using Packet Baron's sauces, wrapper styles and 50/50 packets. The agent world is gone, so the site is now a static builder. There are four examples, a Build mode to place, connect, rename and delete machines, live counts, a build saved in the browser, and share links that hold the whole plan.

2026-10-28, v2026.10.28. First release. Started the conveyor simulation as a copy of the agent test bed.
