// RDSS survey schema. Build plans a new concept, Survey audits one that is open.
// A field's saved key is sectionId.fieldId. The old key is where the 2026 page saved it.

const CHK = (id, label, sub, old) => ({ id, label, sub, type: 'toggle', old });
const BLANK = ['', 'Not set'];
const CONCEPTS = [['', 'Not set'], 'BBQ / Smokehouse', 'Smoothie / Juice Bar', 'Coffee Shop', 'Fast Casual', 'Ghost Kitchen', 'Food Truck', 'Fine Dining', 'Bar / Gastropub', 'Bakery', 'Other'];

// one status pick and one address per listing
function listing(id, label, statuses, ph, oldSel, oldUrl) {
  return [
    { id: id + 'Status', label: label, type: 'select', opts: [BLANK].concat(statuses), old: oldSel },
    { id: id + 'Url', label: label + ', Address', type: 'text', ph, old: oldUrl }
  ];
}
const LIVE = ['LIVE', 'PENDING', 'SKIPPED'];

export const MODES = [['build', 'Build'], ['survey', 'Survey']];

export const SECTIONS = [
  { id: 'bId', mode: 'build', title: 'Identity', fields: [
    { id: 'name', label: 'Business Name', type: 'text', ph: 'Name of the concept', link: 'business_name', old: '#tab-build:b-name#1' },
    { id: 'concept', label: 'Concept Type', type: 'select', opts: CONCEPTS, link: 'concept', old: '#tab-build:b-concept#1' },
    { id: 'domain', label: 'Website', type: 'text', ph: 'Web address', link: 'website', old: '#tab-build:b-domain#1' },
    { id: 'phone', label: 'Phone Number', type: 'text', ph: 'Phone', link: 'phone', old: '#tab-build:b-phone#1' },
    { id: 'address', label: 'Physical Address', type: 'text', ph: 'Street, city, state', link: 'address', full: true, old: '#tab-build:b-address#1' },
    { id: 'market', label: 'Target City / Market', type: 'text', ph: 'City and state', old: '#tab-build:b-market#1' },
    { id: 'desc', label: 'Concept Description / Pitch', type: 'area', ph: 'The concept, the look and the story', old: '#tab-build:b-desc#1' }
  ] },
  { id: 'bVis', mode: 'build', title: 'Visual Presence', fields: [
    CHK('logo', 'Logo Created', 'Generated or designed', '#tab-build:check-logo#1'),
    CHK('photos', 'Establishment Photos', 'Exterior and interior', '#tab-build:check-photos#1'),
    CHK('menuDesign', 'Menu Designed', 'Items named and priced', '#tab-build:check-menu-design#1'),
    CHK('menuPdf', 'Menu PDF Hosted', 'Linked from the website', '#tab-build:check-menu-pdf#1'),
    CHK('video', 'Video Content Live', 'Promo or reel', '#tab-build:check-video#1'),
    CHK('schema', 'Schema Markup on Site', 'Structured data for search', '#tab-build:check-schema#1')
  ] },
  { id: 'bFoot', mode: 'build', title: 'Digital Footprint', fields: [
    ...listing('maps', 'Map Listing', LIVE, 'Profile address', '#tab-build:select#1', '#tab-build:Profile URL#1'),
    ...listing('fb', 'Facebook Page', LIVE, 'Page address', '#tab-build:select#2', '#tab-build:Page URL#1'),
    ...listing('ig', 'Instagram', LIVE, 'Profile address', '#tab-build:select#3', '#tab-build:Profile URL#2'),
    ...listing('yelp', 'Yelp', LIVE, 'Listing address', '#tab-build:select#4', '#tab-build:Listing URL#1'),
    ...listing('ta', 'TripAdvisor', LIVE, 'Listing address', '#tab-build:select#5', '#tab-build:Listing URL#2'),
    ...listing('video', 'Video Channel', LIVE, 'Channel address', '#tab-build:select#6', '#tab-build:Channel URL#1'),
    ...listing('dir', 'Directory Citations', LIVE, 'Count or notes', '#tab-build:select#7', '#tab-build:Count or notes#1')
  ] },
  { id: 'bOps', mode: 'build', title: 'Operations Stack', fields: [
    CHK('aiPhone', 'AI Phone Relay Active', 'Calls answered by an agent', '#tab-build:check-ai-phone#1'),
    CHK('ordering', 'Online Ordering Functional', 'Delivery apps or self hosted', '#tab-build:check-ordering#1'),
    CHK('receipts', 'Receipt Capability', 'Digital or printed', '#tab-build:check-receipts#1'),
    CHK('coupons', 'Coupon Capability', 'Promo codes work', '#tab-build:check-coupons#1'),
    CHK('loyalty', 'Loyalty Program', 'Active and working', '#tab-build:check-loyalty#1'),
    CHK('backend', 'Backend Database', 'Where orders and customers live', '#tab-build:check-backend#1'),
    CHK('email', 'Email Capture Active', 'List building in place', '#tab-build:check-email-capture#1'),
    CHK('pos', 'POS System Configured', 'Set up and taking orders', '#tab-build:check-pos#1'),
    { id: 'orderingPlatform', label: 'Ordering Platform', type: 'text', ph: 'Delivery or ordering service', old: '#tab-build:b-ordering-platform#1' },
    { id: 'posName', label: 'POS System', type: 'text', ph: 'POS brand', old: '#tab-build:b-pos#1' },
    { id: 'backendTool', label: 'Backend Tool', type: 'text', ph: 'Database or sheet tool', old: '#tab-build:b-backend-tool#1' },
    { id: 'phoneProvider', label: 'AI Phone Provider', type: 'text', ph: 'Phone agent service', old: '#tab-build:b-phone-provider#1' }
  ] },
  { id: 'bAds', mode: 'build', title: 'Paid Traffic', fields: [
    CHK('searchAds', 'Search Ads Active', 'Campaign running', '#tab-build:check-google-ads#1'),
    CHK('socialAds', 'Social Ads Active', 'Campaign running', '#tab-build:check-fb-ads#1'),
    CHK('geofence', 'Geofence Defined', 'Local radius targeting set', '#tab-build:check-geofence#1'),
    CHK('reviewsSeeded', 'Reviews Seeded', 'First reviews in place', '#tab-build:check-reviews-seeded#1'),
    { id: 'budget', label: 'Monthly Ad Budget', type: 'text', ph: 'Dollars a month', old: '#tab-build:b-budget#1' },
    { id: 'reviews', label: 'Review Count', type: 'text', ph: 'Count', old: '#tab-build:b-reviews#1' },
    { id: 'rating', label: 'Average Rating', type: 'text', ph: 'Stars', old: '#tab-build:b-rating#1' },
    { id: 'photoReviews', label: 'Photo Reviews', type: 'select', opts: [BLANK, 'Yes', 'No'], old: '#tab-build:b-photo-reviews#1' }
  ] },
  { id: 'bNotes', mode: 'build', title: 'Notes', fields: [
    { id: 'notes', label: 'Open Notes', type: 'area', ph: 'Anything else about this concept', old: '#tab-build:b-notes#1' }
  ] },

  { id: 'sId', mode: 'survey', title: 'Identity', fields: [
    { id: 'name', label: 'Restaurant Name', type: 'text', ph: 'Name of the place', link: 'business_name', old: '#tab-survey:s-name#1' },
    { id: 'concept', label: 'Concept Type', type: 'select', opts: CONCEPTS, link: 'concept', old: '#tab-survey:s-concept#1' },
    { id: 'domain', label: 'Website', type: 'text', ph: 'Web address', link: 'website', old: '#tab-survey:s-domain#1' },
    { id: 'phone', label: 'Phone Number', type: 'text', ph: 'Phone', link: 'phone', old: '#tab-survey:s-phone#1' },
    { id: 'address', label: 'Physical Address', type: 'text', ph: 'Street, city, state', link: 'address', full: true, old: '#tab-survey:s-address#1' },
    { id: 'date', label: 'Survey Date', type: 'date', old: '#tab-survey:s-date#1' },
    { type: 'sub', label: 'Location' },
    { id: 'lat', label: 'Latitude', type: 'number', ph: 'Like 36.1699' },
    { id: 'lon', label: 'Longitude', type: 'number', ph: 'Like -115.1398' },
    { id: 'locate', type: 'locate', label: 'Use my location', targets: ['lat', 'lon'] }
  ] },
  { id: 'sAudit', mode: 'survey', title: 'Digital Audit', fields: [
    ...listing('maps', 'Map Listing', ['CONFIRMED', 'UNVERIFIED', 'MISSING'], 'Address if found', '#tab-survey:select#1', '#tab-survey:URL if found#1'),
    ...listing('fb', 'Facebook Page', ['CONFIRMED', 'INACTIVE', 'MISSING'], 'Address if found', '#tab-survey:select#2', '#tab-survey:URL if found#2'),
    ...listing('ig', 'Instagram', ['CONFIRMED', 'INACTIVE', 'MISSING'], 'Address if found', '#tab-survey:select#3', '#tab-survey:URL if found#3'),
    ...listing('yelp', 'Yelp Listing', ['CONFIRMED', 'UNCLAIMED', 'MISSING'], 'Address if found', '#tab-survey:select#4', '#tab-survey:URL if found#4'),
    ...listing('ta', 'TripAdvisor', ['CONFIRMED', 'UNCLAIMED', 'MISSING'], 'Address if found', '#tab-survey:select#5', '#tab-survey:URL if found#5'),
    ...listing('order', 'Online Ordering Platform', ['CONFIRMED', 'PARTIAL', 'MISSING'], 'Which services', '#tab-survey:select#6', '#tab-survey:DoorDash / UE / Toast...#1')
  ] },
  { id: 'sTech', mode: 'survey', title: 'Tech Stack', fields: [
    CHK('aiPhone', 'Phone Answered / AI Relay', 'Call tested and confirmed', '#tab-survey:check-s-ai-phone#1'),
    CHK('pos', 'POS System Identified', 'Brand and model seen', '#tab-survey:check-s-pos#1'),
    CHK('loyalty', 'Loyalty Program Active', 'Working, not just a sign', '#tab-survey:check-s-loyalty#1'),
    CHK('receipts', 'Receipt Capability', 'Digital or printed confirmed', '#tab-survey:check-s-receipts#1'),
    CHK('coupons', 'Coupon / Promo System', 'Discounts work', '#tab-survey:check-s-coupons#1'),
    CHK('kiosk', 'Self-Service Kiosk', 'Customer order screen', '#tab-survey:check-s-kiosk#1'),
    CHK('kds', 'Kitchen Display System', 'Seen in the kitchen', '#tab-survey:check-s-kds#1'),
    CHK('wifi', 'Customer WiFi Available', 'Public network offered', '#tab-survey:check-s-wifi#1'),
    { id: 'posBrand', label: 'POS Brand / Model', type: 'text', ph: 'Brand and model', link: 'pos_brand', old: '#tab-survey:s-pos-brand#1' },
    { id: 'ordering', label: 'Ordering Platform', type: 'text', ph: 'Delivery or ordering service', link: 'ordering_platform', old: '#tab-survey:s-ordering#1' },
    { id: 'reviews', label: 'Review Count', type: 'text', ph: 'Count and where', old: '#tab-survey:s-reviews#1' },
    { id: 'rating', label: 'Average Rating', type: 'text', ph: 'Stars', old: '#tab-survey:s-rating#1' }
  ] },
  { id: 'sOpps', mode: 'survey', title: 'Opportunities', fields: [
    { id: 'gaps', label: 'Gaps and Opportunities', type: 'area', ph: 'What is missing, weak or could be better', old: '#tab-survey:s-gaps#1' },
    { id: 'notes', label: 'Field Notes', type: 'area', ph: 'What you saw on the visit', old: '#tab-survey:s-notes#1' }
  ] }
];

export function eachField(fn) {
  SECTIONS.forEach(sec => sec.fields.forEach(f => {
    if (f.type === 'sub' || f.type === 'locate') return;
    fn(f, sec.id + '.' + f.id, sec);
  }));
}
