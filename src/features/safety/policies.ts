export const COMMUNITY_RULES = [
  'Use your own verified Waterloo account. Do not impersonate anyone or manipulate ratings.',
  'Sell only items you own or are authorized to sell. Use current photos and disclose defects, repairs, missing parts and compatibility limits.',
  'State the real price in Canadian dollars. No bait pricing, duplicate spam or artificial urgency.',
  'No stolen or counterfeit goods, weapons, explosives, drugs, medication, cannabis, alcohol, tobacco or vaping products.',
  'No recalled or unsafe products, dangerous batteries, unauthorized medical products, opened consumables or homemade or unpackaged food.',
  'No accounts, passwords, access credentials, personal databases, academic cheating, financial schemes, animals, sexual services or exploitative content.',
  'This is an item marketplace. Housing deposits, sublets, jobs, tutoring and unrelated commercial services are not supported.',
  'Keep messages respectful. No harassment, threats, discrimination, malicious links, spam or requests for login codes, identification or banking credentials.',
  'Use a public meetup point. Never publish room numbers, access codes or private schedules.',
  'Mark completed listings sold. Rate only a seller with whom you completed a genuine transaction.',
] as const;

export const PROHIBITED_ITEMS_SCOPE =
  'These are Trovun marketplace rules, even where an item might be lawful elsewhere. They apply to sales, giveaways, swaps, wanted posts, bundles, listing photos and descriptions, and offers made through messages. Examples are not exhaustive. Do not list anything illegal, stolen, counterfeit, recalled, unsafe, exploitative, privacy-invasive, or requiring a licence, prescription or authorization that Trovun cannot verify. Disguising an offer, calling it a collectible, selling its packaging, or offering a prohibited item as a free extra does not create an exception.';

export const PROHIBITED_ITEM_GROUPS = [
  {
    title: 'Sexual content, adult products and exploitation',
    description:
      'No pornography or explicit sexual media, sexual services, escort or paid sexual arrangements, sex toys, fetish products, used underwear or intimate garments, or bodily items marketed for sexual purposes. No non-consensual intimate content, sexual deepfakes, trafficking, or any sexualized content involving minors. Ordinary non-explicit books, art, and clean everyday clothing are not prohibited merely because they discuss relationships or depict the human body.',
  },
  {
    title: 'Food and drinks',
    description:
      'No homemade, unpackaged, opened, repackaged, expired, spoiled or recalled food or drinks; meal preparation, catering, leftovers, food samples, or products requiring refrigeration, freezing or other temperature control. Only shelf-stable food and non-alcoholic drinks in intact original manufacturer-sealed packaging, within the labelled date and with original ingredient and allergen labels, may be listed. Packaging does not make alcohol, drugs or other prohibited ingredients acceptable.',
  },
  {
    title: 'Alcohol, nicotine, drugs and drug equipment',
    description:
      'No alcohol, tobacco, nicotine pouches, cigarettes, cigars, vaping devices, e-liquids, cannabis, edibles, controlled drugs, intoxicants, drug precursors, or equipment marketed for consuming or manufacturing drugs. This includes empty vape devices, drug samples, and substances described as research chemicals, herbal highs or legal alternatives.',
  },
  {
    title: 'Medication, supplements and medical products',
    description:
      'No prescription or over-the-counter medication, vitamins, dietary or bodybuilding supplements, steroids, hormones, injectable products, diagnostic tests, contact lenses, used medical supplies, needles, or medical devices requiring professional fitting, prescription or authorization. No products promoted with unverified treatment or cure claims.',
  },
  {
    title: 'Cosmetics and personal hygiene',
    description:
      'No homemade, opened, used, decanted, expired, recalled or unlabelled cosmetics, skincare, perfume or hygiene consumables. No used toothbrushes, razors, menstrual products or other intimate hygiene products. Factory-sealed, properly labelled, in-date ordinary cosmetics and hygiene products may be listed if they are not otherwise prohibited.',
  },
  {
    title: 'Weapons, explosives and offensive equipment',
    description:
      'No firearms, ammunition, firearm parts or conversion kits, silencers, explosive devices, fireworks, stun guns, pepper spray, or weapons designed or marketed to injure people. No replica guns, airsoft guns, BB guns, pellet guns, crossbows or weapon-making kits. Ordinary kitchen knives and tools may be listed for their normal household use; disguised weapons and offers promoting violence are prohibited.',
  },
  {
    title: 'Hazardous materials and unsafe products',
    description:
      'No poisons, pesticides, toxic or corrosive chemicals, fuels, compressed-gas cylinders, radioactive materials, biological cultures, infectious materials, asbestos, mercury, or hazardous waste. No swollen, leaking or damaged batteries; unsafe electrical products; goods with defeated safety protections; or products subject to a safety recall. Disclosing a defect does not permit selling an unsafe item. Safe non-working electronics may be listed for parts with clear disclosure and personal data removed.',
  },
  {
    title: 'Stolen, counterfeit and unauthorized property',
    description:
      'No stolen or found property you are not authorized to sell, borrowed or rented goods, university or employer property without permission, counterfeit or replica branded goods, fake authenticity certificates, pirated media, unauthorized software copies, or goods with ownership locks or identifying serial numbers deliberately removed. Calling a counterfeit a replica does not make it acceptable.',
  },
  {
    title: 'Accounts, credentials and access',
    description:
      'No social, gaming, email, banking or university accounts; passwords, login codes, API keys, software licence keys, subscriptions, SIM cards or eSIM access, access cards, copied keys, building codes, parking permits, university IDs, or other access rights. No activation-lock bypass services, account rentals or devices bundled with someone else’s logged-in account.',
  },
  {
    title: 'Personal data, surveillance and cyber abuse',
    description:
      'No identity documents, student records, mailing lists, private photos, financial or health records, location data, or other personal information. No malware, phishing kits, stolen data, hacking services, signal jammers, covert surveillance devices, or trackers marketed for monitoring people without consent. Ordinary cameras and trackers may be listed for legitimate use after removing all previous-owner data and account links.',
  },
  {
    title: 'Academic misconduct and forged documents',
    description:
      'No completed assignments for submission, exam answers, leaked assessments, impersonation, contract cheating, forged transcripts, diplomas, certificates, receipts, prescriptions or IDs. Legitimately owned textbooks and study materials may be listed only where sharing them is authorized and does not facilitate cheating or violate intellectual-property rights.',
  },
  {
    title: 'Money, financial products and gambling',
    description:
      'No cash or currency exchange, cryptocurrency, securities, investments, loans, credit, debt collection, bank accounts, payment instruments, gift cards, store credit, coupons, lottery tickets, betting, raffles, pyramid schemes or get-rich-quick offers. No requests for donations, fundraising, deposits for speculative offers, or money-transfer services.',
  },
  {
    title: 'Animals, wildlife and restricted natural materials',
    description:
      'No live animals, pets, insects, animal adoption or breeding, animal remains, taxidermy, ivory, wildlife parts, or products from protected species. No invasive or restricted plants, seeds, organisms or illegally collected natural materials. Ordinary lawful houseplants and clean pet accessories may be listed if safe and otherwise permitted.',
  },
  {
    title: 'Human remains and biological materials',
    description:
      'No human remains, bones, organs, tissue, blood, bodily fluids, breast milk, eggs, sperm, biological samples, used specimen containers, or human waste. No medical or research specimens, or offers to collect or supply them. Clean commercially manufactured wigs and hair extensions are permitted; personal bodily materials are not.',
  },
  {
    title: 'Hate, violence and abusive content',
    description:
      'No items or content promoting hate, terrorism, violent extremism, self-harm, abuse or exploitation; threats; targeted harassment; or graphic depictions of real abuse. No merchandise celebrating perpetrators or organizations responsible for such acts. Contextual educational or historical material must not promote those harms.',
  },
  {
    title: 'Housing, jobs, services and non-physical offers',
    description:
      'No property sales, rentals, sublets, housing deposits, jobs, internships, tutoring, paid companionship, professional or commercial services, transport or delivery services, digital downloads, NFTs, or advertising-only listings. No tickets, reservations, memberships or transferable booking rights. Trovun is for eligible physical items, not brokering these arrangements.',
  },
  {
    title: 'Vehicles and safety-critical equipment',
    description:
      'No cars, motorcycles, other registered motor vehicles, vehicle titles or registration plates. No used child car seats, used protective helmets, used climbing safety equipment, or safety equipment with unknown history, expired certification, missing essential parts or damage. Ordinary bicycles and compliant personal mobility devices may be listed only if safe, owned by the seller and free of dangerous battery defects.',
  },
  {
    title: 'Unhygienic, concealed and deceptive offers',
    description:
      'No pest-infested, mouldy, contaminated or unsanitary items; used intimate garments; mystery boxes or undisclosed bundles; empty packaging presented as the product; nonexistent stock; deceptive preorder or dropshipping offers; fake reviews; or listings created to collect payments or personal information. Clean used furniture, bedding and ordinary clothing may be listed with honest condition details. Every item in a bundle must independently follow these rules.',
  },
] as const;

export const MEETUP_ADVICE =
  'Meet in a familiar, well-lit public place. Tell a friend. Inspect and test the item before paying. Confirm payment in your own banking app; screenshots and emails can be forged. Trovun does not process payments, provide escrow, insure items or guarantee refunds. Call 911 for immediate danger.';
