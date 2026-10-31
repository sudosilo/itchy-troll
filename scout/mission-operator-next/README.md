Mission Operator Next

Mission Operator Next is the rebuilt field scanner console. It is for anyone curious about what is in the air and on the airwaves nearby.

It uses the device location to scan nearby signals by type, with aircraft, ships, ports, cell towers, rail stations, Meshtastic nodes, weather stations, and satellites on a light map. Wi-Fi and Bluetooth finds come from the scan button. Each layer can be switched on or off, and a logbook keeps what was found. Feeds that need a server key say so plainly instead of failing quietly.

Live at mission-operator-next.vercel.app

Latest change. 2026-10-30, v2026.10.30. Every relay call now has a timeout, so a slow feed fails fast, and relays answer in one shape with a hint instead of a bare error. Feeds that need a server key say so plainly, and the app stops asking for a feed it knows it cannot get. API keys are now read from a key store instead of environment variables. Added labels for screen readers and handoff notes for the project.

Full history is in CHANGELOG.md.
