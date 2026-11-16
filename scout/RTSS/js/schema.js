// RTSS survey schema. Every screen in the Survey tab is drawn from this data.
// A field's saved key is sectionId.fieldId. The old key on a field is the label the 2026 page saved it under,
// and the order of fields here matches that page, which is how old saves get carried over.

const CHK = (id, label) => ({ id, label, type: 'check', old: 'input' });

export const KDS_STATIONS = ['Expo / Expediter', 'Grill', 'Fryer', 'Drinks', 'Eggs / Breakfast', 'Bacon / Meat', 'Sandwich / Assembly',
  'Drive-Thru Expo', 'Lane 1', 'Lane 2', 'Prep', 'Salad / Cold Side', 'General Kitchen', 'TBD'];

export const ISP_BY_STATE = {
  AZ: ['Cox', 'CenturyLink / Lumen', 'T-Mobile Home', 'Starlink', 'Local WISP'],
  CA: ['AT&T', 'Comcast Xfinity', 'Spectrum', 'Sonic', 'Frontier'],
  TX: ['AT&T', 'Spectrum', 'Xfinity', 'Grande', 'Starlink'],
  FL: ['Xfinity', 'AT&T', 'Spectrum', 'Brightspeed'],
  NY: ['Spectrum', 'Verizon Fios', 'Optimum', 'RCN'],
  NV: ['Cox', 'CenturyLink', 'T-Mobile Home', 'Starlink'],
  CO: ['Xfinity', 'CenturyLink', 'Spectrum', 'Starlink'],
  WA: ['Xfinity', 'CenturyLink', 'Wave', 'Starlink'],
  OR: ['Xfinity', 'CenturyLink', 'Ziply Fiber'],
  IL: ['Xfinity', 'AT&T', 'RCN', 'Astound'],
  GA: ['Comcast', 'AT&T', 'Spectrum', 'Google Fiber'],
  NC: ['Spectrum', 'AT&T', 'Google Fiber', 'Brightspeed']
};

const REGISTER = {
  id: 'registers', type: 'list', noun: 'Terminal', addLabel: 'Add terminal', titleField: 'type', fields: [
    { id: 'type', label: 'Terminal Type', type: 'select', opts: ['Stationary Countertop', 'Drive-Thru Window', 'Mobile / Tablet', 'Kiosk'], old: 'Terminal Type' },
    { id: 'printer', label: 'Receipt Printer', type: 'select', opts: ['None', 'Thermal, new', 'Thermal, existing', 'Impact, new'], old: 'Receipt Printer' },
    { id: 'drawer', label: 'Cash Drawer Position', type: 'select', opts: ['None', 'Above counter', 'Below counter, bracket', 'Shelf mount'], old: 'Cash Drawer Position' },
    { id: 'display', label: 'Customer-Facing Display', type: 'select', opts: ['None', 'Pole display', 'Second screen / monitor'], old: 'Customer-Facing Display' },
    { id: 'scanner', label: 'QR / Barcode Scanner', type: 'select', opts: ['None', '1D barcode', '2D / QR reader', 'Combo 1D + 2D'], old: 'QR / Barcode Scanner' },
    { id: 'payTerm', label: 'Payment Terminal', type: 'select', opts: ['Integrated in POS', 'Standalone PIN pad', 'Contactless reader', 'None'], old: 'Payment Terminal' },
    CHK('runPos', 'Ethernet run needed, POS terminal'),
    CHK('runPin', 'Ethernet run needed, PIN pad (dedicated drop)'),
    CHK('runPrinter', 'Receipt printer, power and USB run needed'),
    CHK('runDrawer', 'Cash drawer, connection to printer needed'),
    CHK('runDisplay', 'Customer display, video cable run needed'),
    CHK('ups', 'UPS needed at this position'),
    CHK('obstructed', 'Obstructions present in cabling path')
  ]
};

const LABEL_PRINTER = {
  id: 'labelPrinters', type: 'list', noun: 'Label printer', addLabel: 'Add label printer', titleField: 'dept', fields: [
    { id: 'dept', label: 'Department', type: 'text', ph: 'Like Deli, Bakery, Prep, Kitchen', old: 'Department' },
    { id: 'kind', label: 'Printer Type', type: 'select', opts: ['Prep / date labels', 'Weight / deli labels', 'Barcode / UPC', 'Linerless', 'TBD'], old: 'Printer Type' },
    { id: 'model', label: 'Make / Model', type: 'select', opts: ['TBD / Unknown', 'Zebra ZD220', 'Zebra ZD230', 'Zebra ZD421', 'Zebra ZD620', 'Zebra GK420d', 'Brother QL-820NWB', 'Brother TD-4550DNWB', 'Dymo LabelWriter 4XL', 'Epson TM-L90', 'Custom / Other'], old: 'Make / Model' },
    { id: 'conn', label: 'Connection', type: 'select', opts: ['USB', 'Ethernet', 'WiFi', 'Bluetooth', 'Unknown'], old: 'Connection' },
    CHK('cable', 'Cable run needed to this location')
  ]
};

const KDS = {
  id: 'kds', type: 'list', noun: 'KDS', addLabel: 'Add KDS screen', titleField: 'desig', fields: [
    { id: 'desig', label: 'Primary Designation', type: 'select', opts: KDS_STATIONS, old: 'Primary Designation' },
    { id: 'split', label: 'Split Screen', type: 'select', opts: [['no', 'No, single station'], ['yes', 'Yes, split screen (dual station)']], old: 'Split Screen' },
    { id: 'desig2', label: 'Secondary Designation (split)', type: 'select', opts: KDS_STATIONS, whenItem: ['split', 'yes'], old: 'Secondary Designation (split)' },
    { id: 'input', label: 'Interaction Method', type: 'select', opts: ['Touchscreen', 'Bump bar (USB, not a network device)', 'Both'], old: 'Interaction Method' },
    { id: 'mount', label: 'Mount Type', type: 'select', opts: ['Wall mount', 'Overhead / hood mount', 'Countertop stand', 'Under-shelf mount', 'Ceiling / drop mount', 'Podium mount', 'TBD'], old: 'Mount Type' },
    { id: 'size', label: 'Screen Size', type: 'select', opts: ['TBD', '10" (tablet-based, e.g. Taco Bell Android)', '15"', '17"', '19"', '22"', '27"'], old: 'Screen Size' },
    { id: 'outlets', label: 'Outlets at This Position', type: 'select', opts: ['2 available (screen + brain)', '1 available, needs second', '0, full electrical needed', 'Unknown'], old: 'Outlets at This Position' },
    { id: 'bracket', label: 'Brain / Controller Bracket', type: 'select', opts: ['TBD', 'C-bracket, wall mount', 'Tab-mount to back of monitor', 'Standalone enclosure', 'N/A, integrated unit'], old: 'Brain / Controller Bracket' },
    CHK('run', 'Ethernet cable run needed'),
    CHK('mountHw', 'Mounting hardware needed'),
    CHK('obstructed', 'Obstructions present in cabling path')
  ]
};

const TV_ZONE = {
  id: 'tvZones', type: 'list', noun: 'TV zone', addLabel: 'Add TV zone', titleField: 'zone', fields: [
    { id: 'zone', label: 'Zone Name', type: 'select', opts: ['Bar', 'Dining Room', 'Patio', 'Lobby', 'Drive-Thru', 'Waiting Area', 'Private Dining', 'Other'], old: 'Zone Name' },
    { id: 'count', label: 'TV Count', type: 'number', ph: 'Count', old: 'TV Count' },
    { id: 'conn', label: 'Connection', type: 'select', opts: [['wired', 'Wired (HDMI / coax)'], ['wifi', 'WiFi stream'], ['mixed', 'Mixed']], old: 'Connection' },
    { id: 'content', label: 'Channel / Content', type: 'select', opts: ['Shared, same as all', 'Zone-specific channel', 'Individual per TV'], old: 'Channel / Content' },
    CHK('cable', 'Cable runs needed in this zone')
  ]
};

const CUSTOM_TECH = {
  id: 'customTech', type: 'list', noun: 'Custom technology', addLabel: 'Add technology', titleField: 'name', fields: [
    { id: 'name', label: 'Technology Name', type: 'text', ph: 'Like Facial recognition kiosk' },
    { id: 'cat', label: 'Category', type: 'text', ph: 'Like Guest engagement' },
    { id: 'status', label: 'Status', type: 'select', opts: ['Evaluate for this site', 'Include in proposal', 'Research needed'], old: 'select' }
  ]
};

const VISITS = {
  id: 'visits', type: 'list', noun: 'Visit', addLabel: 'Log a visit', titleField: 'date', fields: [
    { id: 'date', label: 'Date', type: 'date' },
    { id: 'role', label: 'Here As', type: 'select', opts: ['Survey', 'Install', 'Service call', 'Inspection', 'Drive by', 'Other'] },
    { id: 'notes', label: 'What Changed or What You Saw', type: 'area', ph: 'New equipment, things moved, problems found' }
  ]
};

const COUNT = (id, label, sub) => ({ id, label, sub, type: 'counter' });

export const SECTIONS = [
  { id: 'site', title: 'Site', fields: [
      { id: 'name', label: 'Restaurant / Business Name', type: 'text', ph: 'Like Dairy Queen #4471', link: 'business_name', old: 'Restaurant / Business Name' },
      { id: 'surveyDate', label: 'Survey Date', type: 'date', old: 'Survey Date' },
      { id: 'consultantName', label: 'Consultant Name', type: 'text', ph: 'Your name', old: 'Consultant Name' },
      { id: 'brand', label: 'Brand / Chain', type: 'text', ph: 'Like Dairy Queen, Independent', link: 'brand', old: 'Brand / Chain' },
      { id: 'ownership', label: 'Franchise or Independent', type: 'select', opts: [['', 'Select...'], 'Franchise', 'Independent', 'Corporate Owned'], old: 'Franchise or Independent' },
      { id: 'address', label: 'Address', type: 'text', ph: 'Street address', link: 'address', old: 'Address' },
      { id: 'city', label: 'City', type: 'text', ph: 'City', link: 'city', old: 'City' },
      { id: 'state', label: 'State', type: 'select', opts: [['', 'Select state...'], 'AZ', 'CA', 'TX', 'FL', 'NY', 'NV', 'CO', 'WA', 'OR', 'IL', 'GA', 'NC', 'Other'], link: 'state', old: 'stateSelect' },
      { type: 'sub', label: 'Location' },
      { id: 'lat', label: 'Latitude', type: 'number', ph: 'Like 36.1699' },
      { id: 'lon', label: 'Longitude', type: 'number', ph: 'Like -115.1398' },
      { id: 'locate', type: 'locate', label: 'Use my location', targets: ['lat', 'lon'] },
  ] },
  { id: 'venue', title: 'Venue Type', fields: [
      { id: 'buildingType', label: 'Building Type', type: 'select', opts: [['', 'Select...'], 'Standalone Building', 'Strip Mall / Inline', 'Food Court', 'Airport', 'Military Base / Government Facility', 'Hotel / Casino', 'Stadium / Arena', 'Healthcare Campus', 'College / University', 'Ghost Kitchen / Cloud Kitchen', 'Other'], old: 'Building Type' },
      { id: 'serviceModel', label: 'Service Model', type: 'select', opts: [['', 'Select...'], 'Quick Service (QSR)', 'Fast Casual', 'Full Service / Table Service', 'Bar & Grill', 'Fine Dining', 'Cafe / Coffee Shop', 'Food Truck', 'Hybrid'], old: 'Service Model' },
      { id: 'seatingCapacity', label: 'Seating Capacity', type: 'number', ph: 'Number of seats', old: 'Seating Capacity' },
      { id: 'sqFootage', label: 'Sq Footage (approx)', type: 'number', ph: 'Square feet', old: 'Sq Footage (approx)' },
      { type: 'sub', label: 'Zones Present' },
      { id: 'driveThru', label: 'Drive-Thru', type: 'toggle', sub: 'Single, double, or mobile lane', old: 'input' },
      { id: 'numberOfLanes', label: 'Number of Lanes', type: 'select', opts: ['1', '2', '3+'], when: 'venue.driveThru', old: 'Number of Lanes' },
      { id: 'laneType', label: 'Lane Type', type: 'select', opts: ['Standard', 'Double', 'Mobile Pre-Order'], when: 'venue.driveThru', old: 'Lane Type' },
      { id: 'estDistanceFromKitchen', label: 'Est. Distance from Kitchen (ft)', type: 'number', ph: 'feet', when: 'venue.driveThru', old: 'Est. Distance from Kitchen (ft)' },
      { id: 'bar', label: 'Bar Area', type: 'toggle', sub: 'Full bar, beer only, or wine service', old: 'input' },
      { id: 'barSeats', label: 'Bar Seats', type: 'number', ph: 'Count', when: 'venue.bar', old: 'Bar Seats' },
      { id: 'barType', label: 'Bar Type', type: 'select', opts: ['Full Liquor', 'Beer & Wine', 'Beer Only'], when: 'venue.bar', old: 'Bar Type' },
      { id: 'patio', label: 'Outdoor / Patio', type: 'toggle', sub: 'May require weatherproof hardware', old: 'input' },
      { id: 'catering', label: 'Catering / Event Space', type: 'toggle', sub: 'Separate room, portable POS needs', old: 'input' },
  ] },
  { id: 'infra', title: 'Physical Infrastructure', fields: [
      { id: 'dropCeilingForCable', label: 'Drop Ceiling for Cable Runs', type: 'select', opts: ['Yes, full coverage', 'Yes, partial', 'No, open ceiling', 'No, concrete/slab'], old: 'Drop Ceiling for Cable Runs' },
      { id: 'conduitAvailable', label: 'Conduit Available', type: 'select', opts: [['', 'Unknown'], 'Yes, existing runs', 'Partial', 'No, must run new'], old: 'Conduit Available' },
      { id: 'existingNetworkClosetIdf', label: 'Existing Network Closet / IDF', type: 'select', opts: ['Yes, dedicated room', 'Yes, wall mount only', 'No'], old: 'Existing Network Closet / IDF' },
      { id: 'upsBatteryBackupPresent', label: 'UPS / Battery Backup Present', type: 'select', opts: [['', 'Unknown'], 'Yes', 'No', 'Needed'], old: 'UPS / Battery Backup Present' },
      { id: 'powerOutletsAtRegister', label: 'Power Outlets at Register Positions', type: 'select', opts: ['Adequate', 'Partial, some positions need work', 'None, full electrical needed'], old: 'Power Outlets at Register Positions' },
      { id: 'adaAccessibilityConstraints', label: 'ADA / Accessibility Constraints', type: 'select', opts: [['', 'Not assessed'], 'Yes, must account for', 'No constraints noted'], old: 'ADA / Accessibility Constraints' },
  ] },
  { id: 'net', title: 'Connectivity', fields: [
      { id: 'isp', label: 'Current ISP', type: 'text', ph: 'ISP name', link: 'isp', old: 'ispField' },
      { skip: true, old: 'ispOptions' },
      { id: 'downloadSpeed', label: 'Download Speed (Mbps)', type: 'number', ph: 'Like 100', old: 'Download Speed (Mbps)' },
      { id: 'uploadSpeed', label: 'Upload Speed (Mbps)', type: 'number', ph: 'Like 20', old: 'Upload Speed (Mbps)' },
      { id: 'firewallVendor', label: 'Firewall / Router Vendor', type: 'select', opts: [['', 'Unknown / TBD'], 'Cisco Meraki', 'Fortinet FortiGate', 'Ubiquiti UniFi', 'pfSense / OPNsense', 'SonicWall', 'Netgear', 'TP-Link Omada', 'ISP-provided modem/router', 'Other'], link: 'firewall_vendor', old: 'Firewall / Router Vendor' },
      { id: 'firewallResponsibility', label: 'Firewall Responsibility', type: 'select', opts: [['', 'Unknown'], 'We are providing & installing', 'Client owned, we configure', 'ISP managed, hands off', 'Client IT managed', 'Needs replacement, we provide'], old: 'Firewall Responsibility' },
      { id: 'cellularBackupFailover', label: 'Cellular Backup / Failover', type: 'select', opts: ['Not present', 'Present, active', 'Recommended, add'], old: 'Cellular Backup / Failover' },
      { id: 'wifiCoverage', label: 'WiFi Coverage', type: 'select', opts: ['Full coverage', 'Partial, gaps noted', 'None, full deploy needed'], old: 'WiFi Coverage' },
      { id: 'pciComplianceStatus', label: 'PCI Compliance Status', type: 'select', opts: [['', 'Unknown'], 'Compliant', 'Non-compliant, needs remediation', 'In progress'], old: 'PCI Compliance Status' },
  ] },
  { id: 'pos', title: 'POS and Register Hardware', fields: [
      { id: 'software', label: 'POS Software (site-wide)', type: 'select', opts: [['', 'Unknown / TBD'], 'PAR Brink', 'Toast', 'Square for Restaurants', 'Lightspeed', 'Revel', 'NCR Aloha', 'Oracle MICROS', 'Heartland', 'Custom / Other'], link: 'pos_brand', old: 'POS Software (site-wide)' },
      { id: 'digitalScaleIntegration', label: 'Digital Scale Integration', type: 'select', opts: ['No', 'Yes, integrated to POS', 'Yes, standalone'], old: 'Digital Scale Integration' },
      { type: 'sub', label: 'Terminals' },
      REGISTER,
      { type: 'sub', label: 'Label Printers' },
      LABEL_PRINTER,
      { type: 'sub', label: 'Mobile Devices and Kiosks' },
      COUNT('tablet', 'Tablet POS (WiFi)', 'Roaming staff POS tablets'),
      COUNT('ogun', 'Ordering Guns / Handheld Scanners', 'Line-busting, drive-thru pre-order'),
      COUNT('invtab', 'Inventory Tablets', 'Back-of-house stock management'),
      COUNT('kiosk', 'Self-Checkout Kiosks', 'Freestanding or counter-mounted'),
      COUNT('chgdock', 'Tablet Charging Stations', 'Multi-bay dock / charging cradle'),
      { type: 'sub', label: 'Manager Workstation' },
      { id: 'mgrDevice', label: 'Device Type', type: 'select', opts: ['None', 'Laptop', 'Desktop', 'Tablet (back office)', 'Shared terminal'], old: 'Device Type' },
      { id: 'mgrConn', label: 'Connection', type: 'select', opts: ['WiFi', 'Wired (Ethernet)', 'N/A'], old: 'Connection' },
      { id: 'mgrCable', label: 'Cabling needed, run Ethernet to office/workstation location', type: 'check', old: 'Cabling needed \u2014 run Ethernet to office/workstation location' },
  ] },
  { id: 'kitchen', title: 'Kitchen Systems', fields: [
      { type: 'sub', label: 'KDS Screens' },
      KDS,
      { id: 'kdsHead', label: 'KDS Controller', type: 'select', opts: [['yes', 'Wired head unit'], ['wifi', 'WiFi head unit'], ['switch', 'No head unit, screens on the switch']] },
      COUNT('kprinter', 'Kitchen Printers', 'Station printers on the line'),
      COUNT('eprinter', 'Expo / Pass Printers', 'Printers at the pass'),
      { id: 'orderRoutingLogic', label: 'Order Routing Logic', type: 'select', opts: ['Single screen all items', 'Station-based routing', 'Course-based', 'TBD'], old: 'Order Routing Logic' },
      { id: 'pagerSystem', label: 'Pager System (pickup notification)', type: 'select', opts: ['No', 'Yes, existing', 'Yes, needs install'], old: 'Pager System (pickup notification)' },
  ] },
  { id: 'boards', title: 'Digital Menu Boards', fields: [
      COUNT('foh', 'Front of House Menu Boards', 'Indoor boards over the counter'),
      { id: 'displayHardwareStrategy', label: 'Display Hardware Strategy', type: 'select', opts: ['Redeploy existing (e.g. franchise boards)', 'Consumer display (Samsung, LG)', 'Commercial display (BrightSign, etc.)', 'TBD, assess on site'], old: 'Display Hardware Strategy' },
      { id: 'contentManagement', label: 'Content Management', type: 'select', opts: ['Remote push via internet (our system)', 'Vendor managed', 'On-site manual update', 'TBD'], old: 'Content Management' },
      { id: 'screenOrientation', label: 'Screen Orientation', type: 'select', opts: ['Landscape', 'Portrait', 'Mixed'], old: 'Screen Orientation' },
      { id: 'vendors', label: 'Signage Vendors', type: 'chips', opts: ['BrightSign', 'Mvix', 'STRATACACHE', 'Elo', 'In-House'] },
  ] },
  { id: 'dt', title: 'Drive-Thru Systems', note: 'The Drive-thru tab holds the full lane model. These are the site-wide answers.', fields: [
      { id: 'boardCount', label: 'Drive-Thru Menu Board Count', type: 'number', ph: 'Number of boards', old: 'Drive-Thru Menu Board Count' },
      { id: 'preSellPreviewBoard', label: 'Pre-sell / Preview Board', type: 'select', opts: ['No', 'Yes, existing', 'Yes, install needed'], old: 'Pre-sell / Preview Board' },
      { id: 'headsetSystem', label: 'Headset System', type: 'select', opts: [['', 'Unknown / TBD'], 'HME', 'Panasonic', '3M / Nexeo', 'PAX', 'Other'], old: 'Headset System' },
      { id: 'headsetSetsNeeded', label: 'Headset Sets Needed', type: 'number', ph: 'Count', old: 'Headset Sets Needed' },
      { id: 'rangeExtensionRequired', label: 'Range Extension Required', type: 'select', opts: ['No, standard range OK', 'Yes, Bluetooth extender', 'Yes, in-house build (BeagleBone/RPi)', 'Yes, vendor solution needed', 'Assess on site'], old: 'Range Extension Required' },
      { id: 'driveThruTimerSystem', label: 'Drive-Thru Timer System', type: 'select', opts: ['Not needed', 'Yes, existing', 'Yes, install needed', 'HME ZOOM', 'Delphi'], old: 'Drive-Thru Timer System' },
      { id: 'licensePlateRecognition', label: 'License Plate Recognition', type: 'select', opts: ['No', 'Yes, existing', 'Emerging, evaluate'], old: 'License Plate Recognition' },
      { id: 'driveThruPosTerminal', label: 'Drive-Thru POS Terminal', type: 'select', opts: ['Shared with interior', 'Dedicated terminal', 'Tablet on window'], old: 'Drive-Thru POS Terminal' },
  ] },
  { id: 'bar', title: 'Bar Technology', fields: [
      { id: 'tabManagementSystem', label: 'Tab Management System', type: 'select', opts: [['', 'Not applicable / TBD'], 'Integrated to POS', 'Standalone tab system', 'Tablet-based (e.g. Revel Bar)'], old: 'Tab Management System' },
      { id: 'liquorInventoryIntegration', label: 'Liquor Inventory Integration', type: 'select', opts: ['No', 'Yes, PourMyBeer', 'Yes, Berg Controls', 'Yes, Other', 'Recommended, add'], old: 'Liquor Inventory Integration' },
      { id: 'ageVerificationHardware', label: 'Age Verification Hardware', type: 'select', opts: ['No', 'Yes, ID scanner', 'Yes, integrated to POS'], old: 'Age Verification Hardware' },
      { id: 'tvCountInBar', label: 'TV Count in Bar Area', type: 'number', ph: 'Count', old: 'TV Count in Bar Area' },
      { id: 'bartoothAudioStreamingTo', label: 'BarTooth / Audio Streaming to Phone', type: 'select', opts: ['No', 'Yes, BarTooth ESP system', 'Evaluate, emerging'], old: 'BarTooth / Audio Streaming to Phone' },
      { id: 'tableEmbeddedGamingSlots', label: 'Table-Embedded Gaming / Slots', type: 'select', opts: ['No', 'Yes, licensed gaming', 'Yes, Ziosk-style tablet games'], old: 'Table-Embedded Gaming / Slots' },
      { id: 'barLedSpecialtyLighting', label: 'Bar LED / Specialty Lighting', type: 'select', opts: ['Standard', 'Custom LED, existing', 'Custom LED, design needed'], old: 'Bar LED / Specialty Lighting' },
  ] },
  { id: 'table', title: 'Table Service and Guest Engagement', fields: [
      { id: 'qrCodeAtTables', label: 'QR Code at Tables', type: 'select', opts: ['Not needed', 'Yes, menu viewing only', 'Yes, ordering enabled', 'Yes, ordering + tipping'], old: 'QR Code at Tables' },
      { id: 'tablesideOrderingTablets', label: 'Tableside Ordering Tablets', type: 'select', opts: ['No', 'Yes, Ziosk', 'Yes, Presto', 'Yes, Custom', 'Evaluate'], old: 'Tableside Ordering Tablets' },
      { id: 'tableCount', label: 'Table Count', type: 'number', ph: 'Count', old: 'Table Count' },
      { id: 'reservationSystem', label: 'Reservation System', type: 'select', opts: ['None', 'OpenTable', 'Resy', 'Toast Tables', 'Phone only', 'Other'], old: 'Reservation System' },
      { id: 'guestPagerSystem', label: 'Guest Pager System', type: 'select', opts: ['No', 'Yes, existing', 'Yes, install', 'App-based notification'], old: 'Guest Pager System' },
      { id: 'robotDelivery', label: 'Robot Delivery', type: 'select', opts: ['No', 'Yes, Servi (Bear Robotics)', 'Yes, Keenon', 'Evaluate, emerging'], old: 'Robot Delivery' },
  ] },
  { id: 'av', title: 'TV Management and A/V', fields: [
      COUNT('tv', 'Total TVs on Site', 'Every screen that is not a menu board'),
      { id: 'tvDistributionSystem', label: 'TV Distribution System', type: 'select', opts: [['', 'Unknown / TBD'], 'Cable box per TV', 'Centralized headend (IPTV)', 'Streaming sticks (Roku, Fire)', 'Commercial IPTV (Sonifi, etc.)', 'None, needs design'], old: 'TV Distribution System' },
      { id: 'channelParsingZoneControl', label: 'Channel Parsing / Zone Control', type: 'select', opts: ['Not needed, all same channel', 'Yes, zones needed', 'Yes, individual control per TV', 'TBD'], old: 'Channel Parsing / Zone Control' },
      { id: 'audioSystem', label: 'Audio System', type: 'select', opts: ['No in-house audio', 'Yes, background music only', 'Yes, full zoned audio', 'Yes, tied to TV audio'], old: 'Audio System' },
      { id: 'digitalSignage', label: 'Digital Signage (non-menu)', type: 'select', opts: ['No', 'Yes, promotional content', 'Yes, social media feed', 'Yes, sports / event data'], old: 'Digital Signage (non-menu)' },
      { id: 'musicServiceVendor', label: 'Music Service Vendor', type: 'select', opts: ['None / no licensed music', 'Mood Media', 'Stingray Business', 'Rockbot', 'PlayNetwork', 'Soundtrack Your Brand', 'Pandora for Business', 'Self-managed (Spotify, etc.)', 'Unknown'], old: 'Music Service Vendor' },
      { id: 'musicHardware', label: 'Music Hardware', type: 'select', opts: ['Not applicable', 'Vendor-provided player (existing)', 'Vendor-provided player (needs install)', 'Streaming via existing device', 'Unknown'], old: 'Music Hardware' },
  ] },
  { id: 'pay', title: 'Payment Processing', fields: [
      { id: 'processingRateKnown', label: 'Processing Rate Known', type: 'select', opts: ['Unknown', 'Yes, below 2.5%', 'Yes, 2.5 to 3%', 'Yes, above 3%'], old: 'Processing Rate Known' },
      { id: 'processorSwapFlag', label: 'Processor Swap Flag', type: 'select', opts: ['Locked, cannot swap', 'Open, evaluate options', 'Actively shopping'], old: 'Processor Swap Flag' },
      { id: 'paymentHardware', label: 'Payment Hardware', type: 'select', opts: ['Integrated (PIN pad in POS)', 'Standalone terminal', 'Mobile / tap reader', 'Mixed'], old: 'Payment Hardware' },
      { id: 'contactlessNfcTap', label: 'Contactless / NFC / Tap', type: 'select', opts: ['Yes, enabled', 'Hardware capable but disabled', 'Not capable, needs upgrade'], old: 'Contactless / NFC / Tap' },
      { id: 'tipScreenAtTerminal', label: 'Tip Screen at Terminal', type: 'select', opts: ['Yes, on device', 'No', 'QR-based tip only'], old: 'Tip Screen at Terminal' },
      { id: 'processors', label: 'Processors', type: 'chips', opts: ['GlobalPay', 'Heartland', 'Square', 'Stripe', 'Elavon', 'TSYS', 'Chase Paymentech', 'Unknown'] },
  ] },
  { id: 'atm', title: 'ATM', fields: [
      { id: 'status', label: 'ATM Present or Planned', type: 'select', opts: ['Not applicable', 'Present, 3rd party managed', 'Present, self managed', 'Planned, install needed'], old: 'ATM Present or Planned' },
      { id: 'atmPlacement', label: 'ATM Placement', type: 'select', opts: ['Inside, lobby area', 'Inside, near entrance', 'Outside, freestanding', 'Drive-up ATM'], old: 'ATM Placement' },
      { id: 'networkDropAvailableAt', label: 'Network Drop Available at Location', type: 'select', opts: ['Yes', 'No, run needed', 'Cellular modem instead'], old: 'Network Drop Available at Location' },
      { id: 'atmVendorModel', label: 'ATM Vendor / Model', type: 'text', ph: 'Like Nautilus Hyosung, NCR, Genmega', old: 'ATM Vendor / Model' },
  ] },
  { id: 'emerging', title: 'Emerging and Specialty Technology', fields: [
      { id: 'bartoothEspAudioStreaming', label: 'BarTooth, ESP Audio Streaming', type: 'select', opts: ['Not applicable', 'Evaluate for this site', 'Include in proposal', 'Already planned'], old: 'select' },
      { id: 'robotDelivery', label: 'Robot Delivery (Servi / Keenon)', type: 'select', opts: ['Not applicable', 'Evaluate for this site', 'Include in proposal'], old: 'select' },
      { id: 'tableEmbeddedGaming', label: 'Table-Embedded Gaming (Ziosk / Licensed Slots)', type: 'select', opts: ['Not applicable', 'Tablet games only, evaluate', 'Licensed gaming, flag for legal review', 'Include in proposal'], old: 'select' },
      { id: 'specialtyFeatureLightingSmart', label: 'Specialty Feature Lighting / Smart LED', type: 'select', opts: ['Not applicable', 'Client interest, note in proposal', 'Design consultation needed'], old: 'select' },
      { type: 'sub', label: 'Custom Entries' },
      CUSTOM_TECH,
      { skip: true, old: 'customName' },
      { skip: true, old: 'customCat' },
  ] },
  { id: 'tvd', title: 'TV Distribution', fields: [
      { id: 'tvHeadType', label: 'Head Unit / Distribution Type', type: 'select', opts: [['iptv', 'Centralized IPTV headend'], ['cable', 'Cable box per TV'], ['stream', 'Streaming sticks (Roku / Fire)'], ['commercial', 'Commercial IPTV (Sonifi, etc.)']], old: 'tvHeadType' },
      { id: 'tvWifi', label: 'WiFi Streaming to TVs', type: 'select', opts: [['no', 'No, all wired HDMI / coax'], ['some', 'Some TVs on WiFi'], ['all', 'All TVs on WiFi']], old: 'tvWifi' },
      { type: 'sub', label: 'TV Zones' },
      TV_ZONE,
  ] },
  { id: 'notes', title: 'Notes and Site Observations', fields: [
      { id: 'generalSiteNotes', label: 'General Site Notes', type: 'area', ph: 'Anything unusual about the site, layout challenges, client priorities, red flags...', old: 'General Site Notes' },
      { id: 'recommendedFollowUpActions', label: 'Recommended Follow-Up Actions', type: 'area', ph: 'What needs to happen before proposal, quotes needed, access issues, callbacks...', old: 'Recommended Follow-Up Actions' },
      { id: 'estimatedProjectComplexity', label: 'Estimated Project Complexity', type: 'select', opts: ['Low, standard install, no surprises', 'Medium, a few custom elements', 'High, significant integration or infrastructure work', 'High+, requires engineering'], old: 'Estimated Project Complexity' },
      { id: 'proposalPriority', label: 'Proposal Priority', type: 'select', opts: ['Standard', 'Urgent, client ready to move', 'On hold'], old: 'Proposal Priority' },
      { type: 'sub', label: 'Visit Log' },
      VISITS,
  ] }
];

// Walk every saved field. Lists hand back their item fields with the list id.
export function eachField(fn) {
  SECTIONS.forEach(sec => sec.fields.forEach(f => {
    if (f.type === 'sub' || f.skip) return;
    fn(f, sec.id + '.' + f.id, sec);
  }));
}
export const LISTS = {};
SECTIONS.forEach(sec => sec.fields.forEach(f => { if (f.type === 'list') LISTS[f.id] = f; }));
