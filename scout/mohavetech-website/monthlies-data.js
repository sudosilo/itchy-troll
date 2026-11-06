// Monthly reviews for mohave.wtf. Add one object per month to the top of the list.
// Each month renders as a slide deck in monthlies.html and as a tab under Statistics.
var MONTHLIES = [
  {
    id: "2026-10",
    title: "October 2026",
    subtitle: "Monthly portfolio review",
    published: "2026-11-05",
    slides: [
      {
        type: "title",
        kicker: "Mohave Technology Group",
        heading: "October 2026 in review",
        body: "The strongest month on record for the portfolio. Sourced from mohave.wtf and its repository history."
      },
      {
        type: "stats",
        heading: "The month in four numbers",
        stats: [
          { value: "145", label: "apps listed, up from 71 on October 1" },
          { value: "84%", label: "of apps updated or freshly deployed since October 1 (122 of 145)" },
          { value: "92", label: "apps added to the index" },
          { value: "76", label: "commits to the site repository in October" }
        ]
      },
      {
        type: "bars",
        heading: "Portfolio size",
        note: "Apps listed on mohave.wtf.",
        bars: [
          { label: "Oct 1", value: 71 },
          { label: "Nov 5", value: 145 }
        ]
      },
      {
        type: "bars",
        heading: "When apps were last updated",
        note: "Apps whose most recent update fell in each week of October. The last week carried the big push.",
        bars: [
          { label: "Oct 1 to 7", value: 12 },
          { label: "Oct 8 to 14", value: 15 },
          { label: "Oct 15 to 21", value: 13 },
          { label: "Oct 22 to 31", value: 57 }
        ]
      },
      {
        type: "stack",
        heading: "Portfolio health by age",
        note: "Same colors as the index. As of November 5.",
        parts: [
          { label: "Under 7 days", value: 39, color: "#2e9d4f" },
          { label: "7 to 30 days", value: 72, color: "#d6b400" },
          { label: "30 to 60 days", value: 29, color: "#e07b1a" },
          { label: "60 to 90 days", value: 1, color: "#cc3333" },
          { label: "Over 90 days", value: 4, color: "#8a8a8a" }
        ],
        body: "The 72 yellow apps were mostly updated October 10 to 26 and start turning orange around November 22."
      },
      {
        type: "text",
        heading: "Added and retired",
        body: "92 apps were added and 18 were retired. Two of the retirements were duplicates caught and removed the same day. Retiring apps that no longer earn their slot keeps the index honest.",
        list: ["androids", "birthday-calendar", "db-stumbler-blue", "envelope", "final-vector", "frontend", "graceland-diagram", "gridmark", "infinite-centerpoint", "invoice-green", "irrigation-station", "legends", "open-pipeline", "red-spoor", "screensaver-musicfx", "spectral-engin", "tower-builder", "tunnelfx"],
        listLabel: "Retired in October"
      },
      {
        type: "text",
        heading: "Infrastructure",
        body: "Backends were put to sleep when idle to cut standing cost. One backend moved to its own server in Frankfurt. Control Troll went live with agents that test every app each morning, attempt fixes, review new commits every three hours, and write changelogs and releases each night. A shared score backend went live for the games, and an agent test bed ran automated updates through the month."
      },
      {
        type: "text",
        heading: "Throughput versus plan",
        body: "The month was planned at one app per three-hour block. Actual output ran several apps a day across four phones, with new builds alongside. The rotation planned for the whole month was cleared by October 25. The plan undercounted capacity by a wide margin."
      },
      {
        type: "text",
        heading: "Carryover",
        body: "23 apps have not been touched since September or earlier. Most are older music and visual pages and the virality and snapshot group.",
        list: ["welcome-to-the-madness", "tile-spinner", "hackercons", "beesim-green", "cypher-wars", "dronesim-blue", "polygon-arcade", "skyflow-orange", "threat-atlas", "engine-companion", "pancakes", "cabin-viewer", "circuit-musicfx", "campus-ebutuoy", "bitfield-synth", "chromatogram", "skwiggle", "spirits-atlas", "pipeline-builder", "snapshot-engine", "swh-sumbler", "virality-snapshot", "virality-trader"],
        listLabel: "Not updated since September"
      },
      {
        type: "text",
        heading: "November plan",
        body: "Decide what to keep before updating it: retire or merge the carryover apps first, starting with pipeline-builder and the virality and snapshot group. Refresh the 72 yellow apps in the week of November 16, before they turn orange. Keep mohave.wtf as the record of every update and deploy."
      },
      {
        type: "title",
        kicker: "Outlook",
        heading: "Throughput is no longer the limit",
        body: "At October's pace the whole portfolio stays green to yellow with two focused update pushes a month. The work now is choosing what to keep."
      }
    ]
  }
];
