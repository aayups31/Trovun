export type SearchCategory = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  introduction: string;
  image: string;
  imagePosition: string;
  checklist: readonly string[];
};

export type ItemSearchTarget = {
  slug: string;
  category: SearchCategory['slug'];
  name: string;
  query: string;
  title: string;
  description: string;
  summary: string;
  examples: readonly string[];
};

export const SEARCH_CATEGORIES: readonly SearchCategory[] = [
  {
    slug: 'electronics',
    name: 'Electronics',
    shortName: 'Tech',
    description:
      'Used electronics for Waterloo classes, study setups, gaming, and the next co-op term.',
    introduction:
      'Find the practical tech students use every day: monitors for a residence desk, calculators for class, chargers that went missing during a move, and complete work-from-home setups.',
    image: '/waterloo/category-electronics-photo-v3.webp',
    imagePosition: '62% 54%',
    checklist: [
      'Test power, ports, speakers, cameras, and batteries before exchanging.',
      'Check the model number against the seller’s photos and description.',
      'For devices, confirm they are reset and no activation lock remains.',
    ],
  },
  {
    slug: 'books',
    name: 'Books & textbooks',
    shortName: 'Books',
    description:
      'Used textbooks, course readers, lab manuals, and books passed between Waterloo terms.',
    introduction:
      'Search by course, title, author, or subject to find books already close to campus. Edition and access-code details matter, so confirm both with the seller before meeting.',
    image: '/waterloo/category-books-photo-v3.webp',
    imagePosition: '56% 57%',
    checklist: [
      'Match the ISBN and edition to the course outline before buying.',
      'Ask whether access codes are included and unused when the course requires one.',
      'Check photos for highlighting, missing pages, water damage, or loose binding.',
    ],
  },
  {
    slug: 'household-items',
    name: 'Household essentials',
    shortName: 'Home',
    description: 'Furniture, kitchenware, storage, and apartment essentials near Waterloo campus.',
    introduction:
      'Furnish a student room without moving everything across the province. Find compact desks, chairs, lamps, kitchen basics, storage, and appliances suited to Waterloo student housing.',
    image: '/waterloo/category-household-photo-v3.webp',
    imagePosition: '61% 52%',
    checklist: [
      'Confirm dimensions before arranging pickup, especially for residences and elevators.',
      'Test appliances and inspect furniture joints, fabric, and moving parts.',
      'Plan safe transportation and meet in a well-lit, public or shared building area.',
    ],
  },
  {
    slug: 'clothing',
    name: 'Clothing',
    shortName: 'Clothing',
    description:
      'Waterloo layers, co-op clothing, shoes, and accessories with another term left in them.',
    introduction:
      'Shop for winter layers, interview clothing, everyday campus wear, and accessories from people nearby. Confirm the tagged size and ask for measurements when fit matters.',
    image: '/waterloo/category-clothing-photo-v3.webp',
    imagePosition: '54% 50%',
    checklist: [
      'Confirm tagged size, measurements, condition, and material with the seller.',
      'Inspect zippers, soles, seams, cuffs, and high-wear areas.',
      'Clean second-hand clothing according to its care label before wearing.',
    ],
  },
] as const;

export const ITEM_SEARCH_TARGETS: readonly ItemSearchTarget[] = [
  {
    slug: 'monitors',
    category: 'electronics',
    name: 'Monitors',
    query: 'monitor',
    title: 'Used monitors near the University of Waterloo',
    description:
      'Find used computer monitors from verified Waterloo students for study desks, gaming setups, and co-op work.',
    summary:
      'A second screen can transform a compact study setup. Compare size, resolution, refresh rate, ports, stand adjustments, and whether the power or display cable is included.',
    examples: ['computer monitors', 'gaming monitors', 'USB-C monitors', 'monitor arms'],
  },
  {
    slug: 'laptops',
    category: 'electronics',
    name: 'Laptops',
    query: 'laptop',
    title: 'Used laptops near the University of Waterloo',
    description:
      'Browse used laptops offered within the verified University of Waterloo student marketplace.',
    summary:
      'For school or co-op use, confirm the exact processor, memory, storage, battery health, charger, keyboard layout, and operating-system status before you exchange.',
    examples: ['Windows laptops', 'MacBooks', 'Chromebooks', 'laptop stands'],
  },
  {
    slug: 'calculators',
    category: 'electronics',
    name: 'Calculators',
    query: 'calculator',
    title: 'Used calculators for Waterloo students',
    description:
      'Search scientific, graphing, and financial calculators offered by University of Waterloo students.',
    summary:
      'The right calculator depends on the course and exam rules. Check the approved model for your class, then confirm the screen, keypad, battery compartment, and case.',
    examples: ['scientific calculators', 'graphing calculators', 'financial calculators'],
  },
  {
    slug: 'keyboards-and-mice',
    category: 'electronics',
    name: 'Keyboards & mice',
    query: 'keyboard mouse',
    title: 'Used keyboards and mice in Waterloo',
    description:
      'Find keyboards, mice, and desk accessories from verified students near Waterloo campus.',
    summary:
      'Build a comfortable desk setup for assignments or co-op. Look for the preferred switch type, layout, connectivity, receiver, cable, charging condition, and visible key wear.',
    examples: ['mechanical keyboards', 'wireless mice', 'ergonomic mice', 'desk mats'],
  },
  {
    slug: 'headphones',
    category: 'electronics',
    name: 'Headphones',
    query: 'headphones',
    title: 'Used headphones near Waterloo campus',
    description:
      'Search headphones, earbuds, and headsets in the University of Waterloo student marketplace.',
    summary:
      'For study, calls, or gaming, compare comfort, microphone quality, noise cancellation, battery life, cables, charging cases, and replacement ear pads.',
    examples: ['noise-cancelling headphones', 'earbuds', 'gaming headsets', 'USB headsets'],
  },
  {
    slug: 'chargers-and-cables',
    category: 'electronics',
    name: 'Chargers & cables',
    query: 'charger cable',
    title: 'Laptop and phone chargers near UWaterloo',
    description:
      'Find replacement chargers, adapters, docks, and cables from students near the University of Waterloo.',
    summary:
      'Match the connector and power rating before buying. For USB-C charging, confirm wattage and cable capability; for laptop adapters, verify the model and tip.',
    examples: ['USB-C chargers', 'laptop adapters', 'HDMI cables', 'docking stations'],
  },
  {
    slug: 'printers',
    category: 'electronics',
    name: 'Printers',
    query: 'printer',
    title: 'Used printers for Waterloo student housing',
    description:
      'Browse compact printers, scanners, ink, and accessories offered by verified Waterloo students.',
    summary:
      'A student printer should fit the space and connect reliably. Ask for a test page and check Wi-Fi support, duplex printing, page count, ink or toner levels, and cable inclusion.',
    examples: ['laser printers', 'inkjet printers', 'scanners', 'printer ink'],
  },
  {
    slug: 'tablets',
    category: 'electronics',
    name: 'Tablets',
    query: 'tablet iPad',
    title: 'Used tablets and iPads near UWaterloo',
    description:
      'Search used tablets, iPads, styluses, and cases in the Waterloo student marketplace.',
    summary:
      'For digital notes or media, confirm storage, battery condition, screen and port quality, compatible stylus generation, charger, and that any device lock is removed.',
    examples: ['iPads', 'Android tablets', 'Apple Pencils', 'tablet keyboards'],
  },
  {
    slug: 'webcams',
    category: 'electronics',
    name: 'Webcams',
    query: 'webcam',
    title: 'Used webcams for classes and co-op in Waterloo',
    description:
      'Find webcams, microphones, and video-call accessories from verified University of Waterloo students.',
    summary:
      'For interviews and remote work, test autofocus, microphone, mounting clip, privacy cover, cable, and compatibility with the computer you plan to use.',
    examples: ['1080p webcams', 'USB microphones', 'ring lights', 'webcam stands'],
  },
  {
    slug: 'computer-accessories',
    category: 'electronics',
    name: 'Computer accessories',
    query: 'computer accessories',
    title: 'Used computer accessories near Waterloo campus',
    description:
      'Browse docks, stands, hubs, speakers, storage, and computer accessories around UWaterloo.',
    summary:
      'Complete a setup without paying to replace every small part. Confirm ports, power requirements, operating-system support, cables, and the exact model number.',
    examples: ['USB hubs', 'laptop docks', 'external drives', 'computer speakers'],
  },
  {
    slug: 'used-textbooks',
    category: 'books',
    name: 'Used textbooks',
    query: 'textbook',
    title: 'Used textbooks at the University of Waterloo',
    description:
      'Find used textbooks by title, author, course, or ISBN from verified University of Waterloo students.',
    summary:
      'Buying from another student can keep a course book in circulation near campus. Match the ISBN and edition first, especially when homework platforms or access codes are involved.',
    examples: ['course textbooks', 'international editions', 'study guides', 'reference books'],
  },
  {
    slug: 'math-textbooks',
    category: 'books',
    name: 'Math textbooks',
    query: 'math textbook',
    title: 'Used math textbooks at Waterloo',
    description:
      'Search calculus, algebra, statistics, and mathematics textbooks near the University of Waterloo.',
    summary:
      'Search with the course code, book title, author, or ISBN. Ask about annotation and edition changes when problem numbering needs to match assignments.',
    examples: ['calculus books', 'linear algebra books', 'statistics books', 'actuarial texts'],
  },
  {
    slug: 'computer-science-textbooks',
    category: 'books',
    name: 'Computer science textbooks',
    query: 'computer science textbook',
    title: 'Used computer science textbooks at UWaterloo',
    description:
      'Find algorithms, programming, systems, and computer science books from Waterloo students.',
    summary:
      'Technical books can remain useful across several terms. Compare the course outline and edition, then inspect code formatting, binding, annotations, and any included companion material.',
    examples: [
      'algorithms books',
      'programming books',
      'systems books',
      'software engineering books',
    ],
  },
  {
    slug: 'engineering-textbooks',
    category: 'books',
    name: 'Engineering textbooks',
    query: 'engineering textbook',
    title: 'Used engineering textbooks near Waterloo campus',
    description:
      'Search engineering textbooks, handbooks, and references in the Waterloo student marketplace.',
    summary:
      'Look by discipline, course code, title, author, or ISBN. Confirm the required edition and whether tables, reference sheets, or digital components are included.',
    examples: ['mechanics books', 'circuits books', 'materials books', 'engineering handbooks'],
  },
  {
    slug: 'business-textbooks',
    category: 'books',
    name: 'Business textbooks',
    query: 'business textbook',
    title: 'Used business and economics textbooks in Waterloo',
    description:
      'Find accounting, economics, finance, and business books offered by verified Waterloo students.',
    summary:
      'Business titles frequently bundle online homework access. Match the edition and ISBN, then ask whether any access code has already been redeemed.',
    examples: ['accounting books', 'economics books', 'finance books', 'case books'],
  },
  {
    slug: 'science-textbooks',
    category: 'books',
    name: 'Science textbooks',
    query: 'science textbook',
    title: 'Used science textbooks near UWaterloo',
    description:
      'Search biology, chemistry, physics, and earth science books from University of Waterloo students.',
    summary:
      'Confirm the edition, ISBN, and course fit. For laboratory or reference texts, inspect diagrams, tables, binding, annotations, and any missing supplementary pages.',
    examples: ['biology books', 'chemistry books', 'physics books', 'earth science books'],
  },
  {
    slug: 'course-notes',
    category: 'books',
    name: 'Course notes',
    query: 'course notes',
    title: 'Course notes and readers near Waterloo campus',
    description:
      'Find eligible printed course readers, study materials, and reference notes around UWaterloo.',
    summary:
      'Only exchange materials you are allowed to share. Confirm the course, term, instructor, completeness, and whether the content still matches the current outline.',
    examples: ['course readers', 'printed notes', 'study guides', 'reference sheets'],
  },
  {
    slug: 'lab-manuals',
    category: 'books',
    name: 'Lab manuals',
    query: 'lab manual',
    title: 'Used lab manuals near the University of Waterloo',
    description:
      'Search eligible laboratory manuals and course workbooks from verified Waterloo students.',
    summary:
      'Confirm that a used manual is permitted for the course and that no required submission pages are missing. Compare the course, term, edition, and page condition.',
    examples: ['laboratory manuals', 'course workbooks', 'field guides', 'reference manuals'],
  },
  {
    slug: 'novels',
    category: 'books',
    name: 'Novels',
    query: 'novel',
    title: 'Used novels and literature books in Waterloo',
    description:
      'Browse novels, plays, poetry, and literature books offered near the University of Waterloo.',
    summary:
      'Search the title or author and confirm the assigned edition when page numbers matter. Photos should show the cover, spine, annotations, and overall page condition.',
    examples: ['novels', 'plays', 'poetry collections', 'literature anthologies'],
  },
  {
    slug: 'course-readers',
    category: 'books',
    name: 'Course readers',
    query: 'course reader',
    title: 'Course readers near the University of Waterloo',
    description:
      'Find eligible course readers and printed anthologies offered by Waterloo students.',
    summary:
      'Check that resale is permitted, then match the course, instructor, term, table of contents, and edition. Confirm that every assigned section is present.',
    examples: ['printed anthologies', 'reading packages', 'case readers', 'course packs'],
  },
  {
    slug: 'desks',
    category: 'household-items',
    name: 'Desks',
    query: 'desk',
    title: 'Used student desks near the University of Waterloo',
    description:
      'Find compact desks and study tables for Waterloo residences and student apartments.',
    summary:
      'Measure the room, doorway, elevator, and vehicle before pickup. Confirm desktop dimensions, height, leg stability, scratches, disassembly, and included hardware.',
    examples: ['study desks', 'computer desks', 'folding desks', 'standing desks'],
  },
  {
    slug: 'desk-chairs',
    category: 'household-items',
    name: 'Desk chairs',
    query: 'desk chair',
    title: 'Used desk chairs near Waterloo campus',
    description:
      'Browse used office and study chairs offered by verified University of Waterloo students.',
    summary:
      'Test height adjustment, tilt, wheels, armrests, back support, and seat condition. Confirm the chair fits both your desk and transportation plan.',
    examples: ['office chairs', 'ergonomic chairs', 'task chairs', 'folding chairs'],
  },
  {
    slug: 'lamps',
    category: 'household-items',
    name: 'Lamps',
    query: 'lamp',
    title: 'Used desk and floor lamps near UWaterloo',
    description:
      'Find desk lamps, floor lamps, and lighting for Waterloo student rooms and apartments.',
    summary:
      'Check the switch, plug, shade, joints, bulb type, brightness settings, and stability. Ask whether a working bulb or power adapter is included.',
    examples: ['desk lamps', 'floor lamps', 'reading lights', 'LED lamps'],
  },
  {
    slug: 'mini-fridges',
    category: 'household-items',
    name: 'Mini fridges',
    query: 'mini fridge',
    title: 'Used mini fridges near the University of Waterloo',
    description: 'Search compact fridges offered near Waterloo residences and student housing.',
    summary:
      'Confirm residence rules and measure the available space. Ask the seller to demonstrate cooling, seals, controls, shelves, noise level, and cable condition.',
    examples: ['compact fridges', 'bar fridges', 'mini freezers', 'beverage fridges'],
  },
  {
    slug: 'microwaves',
    category: 'household-items',
    name: 'Microwaves',
    query: 'microwave',
    title: 'Used microwaves for Waterloo student housing',
    description:
      'Find compact microwaves and small kitchen appliances near the University of Waterloo.',
    summary:
      'Check residence or lease rules first. Confirm dimensions, wattage, turntable, door latch, controls, interior condition, ventilation clearance, and a live heating test.',
    examples: ['compact microwaves', 'countertop microwaves', 'small kitchen appliances'],
  },
  {
    slug: 'kitchenware',
    category: 'household-items',
    name: 'Kitchenware',
    query: 'kitchenware',
    title: 'Used kitchenware near Waterloo campus',
    description: 'Browse pots, pans, dishes, utensils, and kitchen basics from Waterloo students.',
    summary:
      'Build a kitchen gradually or buy a matched bundle. Inspect coating, handles, chips, cracks, rust, warping, cleanliness, and compatibility with the stove type.',
    examples: ['pots and pans', 'dishes', 'cutlery', 'cooking utensils'],
  },
  {
    slug: 'storage',
    category: 'household-items',
    name: 'Storage',
    query: 'storage',
    title: 'Student storage and organizers near UWaterloo',
    description: 'Find shelves, bins, drawers, and compact organizers for Waterloo student rooms.',
    summary:
      'Measure the intended space and confirm assembled dimensions. Inspect rails, hinges, fabric, wheels, stacking features, missing hardware, and whether the item comes apart.',
    examples: ['storage bins', 'drawer units', 'closet organizers', 'under-bed storage'],
  },
  {
    slug: 'fans',
    category: 'household-items',
    name: 'Fans',
    query: 'fan',
    title: 'Used fans near Waterloo student housing',
    description: 'Search desk, tower, and window fans offered by verified Waterloo students.',
    summary:
      'Test every speed and oscillation setting. Check noise, grille, base stability, remote control, timer, cable condition, and whether the size suits the room.',
    examples: ['desk fans', 'tower fans', 'window fans', 'air circulators'],
  },
  {
    slug: 'shelving',
    category: 'household-items',
    name: 'Shelving',
    query: 'shelf shelving',
    title: 'Used shelving near the University of Waterloo',
    description:
      'Find bookcases, cube shelves, and compact shelving for Waterloo student apartments.',
    summary:
      'Confirm height, width, depth, weight limit, wall-anchor needs, and transportation. Inspect each panel, connector, shelf support, and included piece.',
    examples: ['bookcases', 'cube storage', 'wall shelves', 'utility shelving'],
  },
  {
    slug: 'vacuums',
    category: 'household-items',
    name: 'Vacuums',
    query: 'vacuum',
    title: 'Used vacuums near Waterloo campus',
    description:
      'Browse compact vacuums and cleaning equipment for student housing near UWaterloo.',
    summary:
      'Test suction, brush roll, battery or cable, filters, hose, attachments, bin, and charging dock. Ask when the filter was last cleaned or replaced.',
    examples: ['stick vacuums', 'handheld vacuums', 'canister vacuums', 'steam mops'],
  },
  {
    slug: 'winter-jackets',
    category: 'clothing',
    name: 'Winter jackets',
    query: 'winter jacket',
    title: 'Used winter jackets near the University of Waterloo',
    description:
      'Find winter coats and cold-weather layers from verified students around Waterloo campus.',
    summary:
      'Waterloo winter calls for practical warmth. Confirm measurements, insulation, shell condition, zipper, hood, cuffs, pockets, stains, repairs, and cleaning instructions.',
    examples: ['parkas', 'puffer jackets', 'wool coats', 'waterproof shells'],
  },
  {
    slug: 'hoodies',
    category: 'clothing',
    name: 'Hoodies',
    query: 'hoodie',
    title: 'Used hoodies and sweatshirts near UWaterloo',
    description: 'Browse hoodies, crewnecks, and comfortable campus layers from Waterloo students.',
    summary:
      'Confirm the tagged size and ask for chest and length measurements. Inspect cuffs, waistband, drawstrings, zipper, print, pilling, stains, and shrinkage.',
    examples: ['hoodies', 'crewnecks', 'zip hoodies', 'sweatshirts'],
  },
  {
    slug: 'boots',
    category: 'clothing',
    name: 'Boots',
    query: 'boots',
    title: 'Used winter boots near Waterloo campus',
    description:
      'Search winter, rain, and everyday boots offered by verified University of Waterloo students.',
    summary:
      'Ask for the tagged size and insole length. Inspect tread, heel wear, lining, seams, waterproofing, salt marks, laces, zippers, and interior condition.',
    examples: ['winter boots', 'rain boots', 'hiking boots', 'Chelsea boots'],
  },
  {
    slug: 'co-op-clothing',
    category: 'clothing',
    name: 'Co-op clothing',
    query: 'co-op clothing',
    title: 'Co-op and interview clothing for Waterloo students',
    description:
      'Find interview-ready and workplace clothing within the Waterloo student marketplace.',
    summary:
      'Prepare for interviews or a work term with pieces already nearby. Confirm garment measurements, fabric, alterations, care instructions, wear, and whether matching pieces are included.',
    examples: ['blazers', 'dress shirts', 'dress pants', 'interview outfits'],
  },
  {
    slug: 'business-casual',
    category: 'clothing',
    name: 'Business casual',
    query: 'business casual',
    title: 'Business casual clothing near the University of Waterloo',
    description:
      'Browse business-casual shirts, pants, skirts, dresses, and layers from Waterloo students.',
    summary:
      'For a versatile co-op wardrobe, prioritize accurate measurements and condition. Inspect collars, cuffs, closures, hems, lining, fabric wear, and alteration history.',
    examples: ['button-down shirts', 'trousers', 'skirts', 'work dresses'],
  },
  {
    slug: 'shoes',
    category: 'clothing',
    name: 'Shoes',
    query: 'shoes',
    title: 'Used shoes near Waterloo campus',
    description:
      'Find everyday, athletic, and dress shoes offered by University of Waterloo students.',
    summary:
      'Sizing varies by brand, so ask for the tagged size and insole length. Inspect tread, heel, toe, seams, lining, insoles, odour, and repair history.',
    examples: ['sneakers', 'running shoes', 'dress shoes', 'casual shoes'],
  },
  {
    slug: 'backpacks',
    category: 'clothing',
    name: 'Backpacks',
    query: 'backpack',
    title: 'Used backpacks near the University of Waterloo',
    description:
      'Search school, laptop, travel, and everyday backpacks from verified Waterloo students.',
    summary:
      'Check laptop sleeve dimensions, capacity, straps, padding, zippers, seams, lining, water resistance, stains, and whether every buckle works.',
    examples: ['laptop backpacks', 'school bags', 'travel backpacks', 'messenger bags'],
  },
  {
    slug: 'waterproof-layers',
    category: 'clothing',
    name: 'Waterproof layers',
    query: 'waterproof jacket',
    title: 'Used rain jackets and waterproof layers in Waterloo',
    description:
      'Find rain shells and waterproof outerwear for walking or cycling around Waterloo campus.',
    summary:
      'Inspect seam tape, shell wear, coating, hood, zippers, cuffs, vents, and delamination. Ask how the garment was washed and whether it still beads water.',
    examples: ['rain jackets', 'waterproof shells', 'windbreakers', 'rain pants'],
  },
  {
    slug: 'sweaters',
    category: 'clothing',
    name: 'Sweaters',
    query: 'sweater',
    title: 'Used sweaters near Waterloo campus',
    description:
      'Browse knitwear, cardigans, and warm layers offered by verified Waterloo students.',
    summary:
      'Confirm measurements and fibre content. Inspect pilling, cuffs, collar, seams, pulls, repairs, stains, shrinkage, and the recommended washing method.',
    examples: ['knit sweaters', 'cardigans', 'quarter-zips', 'fleece layers'],
  },
  {
    slug: 'athletic-wear',
    category: 'clothing',
    name: 'Athletic wear',
    query: 'athletic wear',
    title: 'Used athletic clothing near UWaterloo',
    description:
      'Find workout clothing and sports layers from students around the University of Waterloo.',
    summary:
      'Confirm tagged size and measurements. Inspect stretch, elastic, seams, zippers, reflective details, pilling, stains, and fabric wear in high-friction areas.',
    examples: ['running layers', 'training tops', 'athletic pants', 'sports jackets'],
  },
] as const;

export function getSearchCategory(slug: string) {
  return SEARCH_CATEGORIES.find((category) => category.slug === slug);
}

export function getItemSearchTarget(slug: string) {
  return ITEM_SEARCH_TARGETS.find((item) => item.slug === slug);
}

export function getItemsForCategory(category: string) {
  return ITEM_SEARCH_TARGETS.filter((item) => item.category === category);
}

export function categoryHref(slug: string) {
  return `/waterloo-marketplace/${slug}`;
}

export function itemHref(slug: string) {
  return `/waterloo-marketplace/items/${slug}`;
}
