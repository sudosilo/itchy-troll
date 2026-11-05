// Game rules. Every price, timer and rate lives here so tuning never touches code.
const CONFIG = {
  timeScale: 1,                 // 1 means real time. Raise it to speed up testing.
  startGrant: 100000,
  roadFactor: 1.35,             // straight line distance times this equals road distance
  returnRadiusM: 200,           // a crew within this distance of you counts as back
  spawnKm: [1.5, 9],            // tickets appear between these distances from you
  jobsPerUnitHour: 0.6,
  baseTickets: 3,
  ticketsPerUnit: 2,
  latePay: 0.5,                 // share of pay earned when the SLA is missed
  dividend: { amount: 20000, cooldownH: 24, minJobs: 3, belowUnits: 3, belowCash: 20000 },
  locationEveryMs: 20000,       // how often to read the phone's cached location
  fixMaxAgeMs: 30000,           // only accept cached fixes younger than this
  driveMph: 25,                 // driving counts only above this speed
  driveConfirmS: 120,           // and only after holding it this many seconds
  fallbackCenter: [36.1716, -115.1391],
  camMaxKm: 25,                 // camera install tickets only use real cameras within this distance
  camBreakPerHour: 0.02,        // chance per installed camera per hour that it breaks
  passMinElevDeg: 30,           // a satellite counts as overhead above this angle
  passSearchH: 3                // how far ahead to look for the next pass
};

// Theme pack. Swap this object to turn the same engine into a different trade.
const THEME = {
  units: {
    device:    { label: "Device repair tech",  icon: "🚗", price: 18000, wage: 28, kmh: 45, tags: ["device"],
      kit: { screen: 10, battery: 6, port: 6, lcd: 2, lbat: 2, hdmi_port: 3, props: 8, charger: 10, protector: 20, case: 10, usb: 15 } },
    network:   { label: "Network installer",   icon: "🚐", price: 42000, wage: 38, kmh: 42, tags: ["network", "device"],
      kit: { router: 4, switch: 3, ap: 4, spool: 2, keystone: 50, panel: 2 } },
    pos:       { label: "Point of sale tech",  icon: "🚙", price: 38000, wage: 36, kmh: 45, tags: ["pos", "device"],
      kit: { pinpad: 6, drawer: 4, printer: 3, scanner: 4, paper: 50 } },
    av:        { label: "AV crew",             icon: "🚚", price: 55000, wage: 52, kmh: 40, tags: ["av", "camera"],
      kit: { camera: 6, nvr: 1, mount: 6, hdmi: 20, receiver: 2, tv: 2, mic: 4 } },
    satellite: { label: "Satellite installer", icon: "🛻", price: 60000, wage: 44, kmh: 42, tags: ["satellite"],
      kit: { dish: 4, lnb: 6, coax: 3, modem: 4 } }
  },
  // Parts catalog. cost is what the company pays, sell is the retail price for add on sales, leadMin is order latency.
  parts: {
    screen: { label: "Phone screen", cost: 95, leadMin: 120 },        battery: { label: "Phone battery", cost: 25, leadMin: 90 },
    port: { label: "Charging port", cost: 15, leadMin: 90 },          lcd: { label: "Laptop screen", cost: 120, leadMin: 240 },
    lbat: { label: "Laptop battery", cost: 70, leadMin: 180 },        hdmi_port: { label: "Console HDMI port", cost: 20, leadMin: 120 },
    props: { label: "Drone propeller", cost: 9, leadMin: 120 },
    charger: { label: "Charger", cost: 8, sell: 25, leadMin: 60 },    protector: { label: "Screen protector", cost: 2, sell: 15, leadMin: 60 },
    case: { label: "Phone case", cost: 5, sell: 25, leadMin: 60 },    usb: { label: "USB cable", cost: 3, sell: 15, leadMin: 60 },
    router: { label: "Router", cost: 90, leadMin: 120 },              switch: { label: "Network switch", cost: 180, leadMin: 180 },
    ap: { label: "Wireless access point", cost: 140, leadMin: 180 },  spool: { label: "Cat6 spool, 1000 ft", cost: 160, leadMin: 240 },
    keystone: { label: "Keystone jack", cost: 3, leadMin: 60 },       panel: { label: "Patch panel", cost: 60, leadMin: 180 },
    pinpad: { label: "Pen pad", cost: 280, leadMin: 240 },            drawer: { label: "Cash drawer", cost: 120, leadMin: 240 },
    printer: { label: "Receipt printer", cost: 220, leadMin: 240 },   scanner: { label: "Barcode scanner", cost: 160, leadMin: 180 },
    paper: { label: "Receipt paper roll", cost: 1, leadMin: 60 },
    camera: { label: "Camera", cost: 350, leadMin: 240 },             nvr: { label: "Video recorder", cost: 600, leadMin: 360 },
    mount: { label: "Mount", cost: 60, leadMin: 120 },                hdmi: { label: "HDMI cable", cost: 12, leadMin: 60 },
    receiver: { label: "AV receiver", cost: 450, leadMin: 360 },      tv: { label: "TV", cost: 600, leadMin: 360 },
    mic: { label: "Microphone", cost: 150, leadMin: 180 },
    dish: { label: "Dish", cost: 180, leadMin: 240 },                 lnb: { label: "LNB", cost: 45, leadMin: 180 },
    coax: { label: "Coax spool", cost: 90, leadMin: 180 },            modem: { label: "Satellite modem", cost: 150, leadMin: 240 }
  },
  // use: parts taken at dispatch. extra: chance each part turns out to be needed on site. upsell: items the tech may sell.
  jobs: [
    { key: "phone",   label: "Phone screen repair",     icon: "📱", needs: "device",    mins: 25,  pay: 140,  slaH: 3,  w: 5,
      use: { screen: 1 }, extra: { battery: 0.25, port: 0.15 }, upsell: ["protector", "case", "charger", "usb"] },
    { key: "laptop",  label: "Laptop repair",           icon: "💻", needs: "device",    mins: 45,  pay: 220,  slaH: 6,  w: 4,
      extra: { lbat: 0.35, lcd: 0.25 }, upsell: ["charger", "usb"] },
    { key: "console", label: "Game console repair",     icon: "🎮", needs: "device",    mins: 40,  pay: 180,  slaH: 8,  w: 3,
      extra: { hdmi_port: 0.5 }, upsell: ["usb"] },
    { key: "drone",   label: "Drone repair",            icon: "🛸", needs: "device",    mins: 50,  pay: 260,  slaH: 8,  w: 2,
      use: { props: 2 }, extra: { battery: 0.2 } },
    { key: "router",  label: "Router install",          icon: "📶", needs: "network",   mins: 60,  pay: 380,  slaH: 8,  w: 4,
      use: { router: 1 }, extra: { ap: 0.2 } },
    { key: "cable",   label: "Office cable run",        icon: "🔌", needs: "network",   mins: 150, pay: 950,  slaH: 24, w: 2,
      use: { spool: 1, keystone: 6 }, extra: { panel: 0.3, switch: 0.2 } },
    { key: "lane",    label: "Register lane down",      icon: "🧾", needs: "pos",       mins: 50,  pay: 420,  slaH: 4,  w: 4,
      use: { paper: 2 }, extra: { pinpad: 0.4, printer: 0.3, drawer: 0.2, scanner: 0.2 } },
    { key: "selfco",  label: "Self checkout fault",     icon: "🛒", needs: "pos",       mins: 90,  pay: 700,  slaH: 4,  w: 2,
      use: { scanner: 1 }, extra: { pinpad: 0.3, printer: 0.3 } },
    { key: "camera",  label: "Camera install",          icon: "📷", needs: "camera",    mins: 105, pay: 1400, slaH: 24, w: 3,
      use: { camera: 1, mount: 1 }, extra: { nvr: 0.1 } },
    { key: "camfix",  label: "Camera repair",           icon: "🔧", needs: "device",    mins: 40,  pay: 300,  slaH: 24, w: 0 },
    { key: "alpr",    label: "Plate reader service",    icon: "🔍", needs: "camera",    mins: 75,  pay: 2400, slaH: 24, w: 2,
      extra: { camera: 0.2, mount: 0.1 } },
    { key: "confav",  label: "Conference room AV",      icon: "🎤", needs: "av",        mins: 150, pay: 1800, slaH: 24, w: 2,
      use: { tv: 1, receiver: 1, hdmi: 3, mount: 1 }, extra: { mic: 0.5 } },
    { key: "dish",    label: "Satellite dish install",  icon: "📡", needs: "satellite", mins: 120, pay: 1100, slaH: 24, w: 3,
      use: { dish: 1, lnb: 1, coax: 1, modem: 1 } }
  ]
};

