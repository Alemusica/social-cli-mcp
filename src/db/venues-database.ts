/**
 * Comprehensive Venue Database
 * Real venues for booking outreach - Tier 1-5
 * Last updated: 2026-01-21
 */

export interface VenueData {
  name: string;
  city: string;
  country: string;
  region?: string;
  type: string;
  tier: number; // 1=dream, 2=priority, 3=good fit, 4=worth trying, 5=backup
  website?: string;
  instagram?: string;
  email?: string;
  notes?: string;
  vibe?: string[];
}

// ═══════════════════════════════════════════════════════════════
// PORTUGAL
// ═══════════════════════════════════════════════════════════════

export const PORTUGAL_VENUES: VenueData[] = [
  // LISBON - Rooftop Bars
  { name: 'SEEN Sky Bar', city: 'Lisbon', country: 'Portugal', type: 'rooftop_bar', tier: 1,
    website: 'https://seenlx.com/en/seen-sky-bar-lisbon/', instagram: '@seen_skybar_lisboa',
    notes: 'Tivoli Hotel rooftop, Mediterranean-Japanese cuisine, chic vibes', vibe: ['upscale', 'sunset', 'cocktails'] },
  { name: 'Rooftop Bar Mundial', city: 'Lisbon', country: 'Portugal', type: 'rooftop_bar', tier: 2,
    website: 'https://www.rooftopmundial.com/en/', instagram: '@rooftopbarmundial',
    notes: 'Best rooftop views in Lisbon', vibe: ['panoramic', 'cocktails'] },
  { name: 'Park Bar', city: 'Lisbon', country: 'Portugal', type: 'rooftop_bar', tier: 2,
    instagram: '@parklisboa', notes: 'Hip rooftop on parking garage', vibe: ['indie', 'sunset'] },
  { name: 'Topo', city: 'Lisbon', country: 'Portugal', type: 'rooftop_bar', tier: 3,
    notes: 'Martim Moniz location', vibe: ['casual', 'views'] },
  { name: 'Lumi Rooftop Bar', city: 'Lisbon', country: 'Portugal', type: 'rooftop_bar', tier: 2,
    notes: 'The Lumiares Hotel, Bairro Alto', vibe: ['boutique', 'intimate'] },
  { name: 'Silk Club', city: 'Lisbon', country: 'Portugal', type: 'rooftop_club', tier: 3,
    notes: 'Chiado area', vibe: ['nightlife', 'electronic'] },

  // ALGARVE - Beach Clubs
  { name: 'NoSoloAgua Portimao', city: 'Portimao', country: 'Portugal', region: 'Algarve', type: 'beach_club', tier: 1,
    website: 'https://nosoloagua.com/nsaptm/en/homeen/', instagram: '@nosoloaguaportimao',
    notes: 'Beach & pool club', vibe: ['party', 'pool', 'sunset'] },
  { name: 'The Shack', city: 'Quinta do Lago', country: 'Portugal', region: 'Algarve', type: 'beach_bar', tier: 2,
    website: 'https://www.quintadolago.com/en/restaurants/the-shack/', instagram: '@theshackbarqdl',
    notes: 'Lakeside bar', vibe: ['chill', 'nature'] },
  { name: 'Duna Beach Club', city: 'Lagos', country: 'Portugal', region: 'Algarve', type: 'beach_club', tier: 2,
    notes: 'Bohemian vibe, ambient music', vibe: ['bohemian', 'ambient'] },
  { name: 'Well Beach Club', city: 'Vale do Lobo', country: 'Portugal', region: 'Algarve', type: 'beach_club', tier: 2,
    notes: 'Balinese-inspired, lounge house music', vibe: ['balinese', 'lounge'] },

  // COMPORTA - Beach Venues
  { name: 'Comporta Cafe Beach Club', city: 'Comporta', country: 'Portugal', type: 'beach_club', tier: 1,
    website: 'https://comportacafe.pt/en/home/', instagram: '@comportacafe_beachclub',
    notes: 'Iconic Comporta spot', vibe: ['bohemian', 'chic', 'sunset'] },
  { name: 'Sublime Comporta Beach Club', city: 'Comporta', country: 'Portugal', type: 'beach_club', tier: 1,
    website: 'https://sublimecomportabeachclub.com/', instagram: '@sublimecomportabeachclub',
    email: 'groups@sublimehotels.pt',
    notes: 'Luxury beach club - PERFECT for organic/ambient sunset sessions', vibe: ['luxury', 'organic', 'wellness'] },
  { name: 'JNcQUOI Beach Club', city: 'Comporta', country: 'Portugal', type: 'beach_club', tier: 1,
    website: 'https://www.jncquoibeachclub.com/en/', instagram: '@jncquoi.beachclub',
    notes: 'High-end beach experience', vibe: ['upscale', 'design'] },
  { name: 'Ilha do Arroz', city: 'Comporta', country: 'Portugal', type: 'beach_club', tier: 2,
    notes: 'DJ sets, live music, laid-back', vibe: ['chill', 'live_music'] },

  // ALGARVE - Boutique Venues
  { name: 'Casa Fuzetta', city: 'Olhao', country: 'Portugal', region: 'Algarve', type: 'boutique_hotel', tier: 1,
    website: 'https://www.casafuzetta.com/', instagram: '@casafuzetta',
    notes: 'Design boutique, rooftop with Ria Formosa views, intimate events', vibe: ['design', 'intimate', 'rooftop'] },

  // PORTUGAL - Transformational Festivals
  { name: 'Waking Life Festival', city: 'Crato', country: 'Portugal', region: 'Alentejo', type: 'festival', tier: 1,
    website: 'https://wakinglife.pt/', instagram: '@wakinglifefestival',
    notes: 'Conscious/transformational music festival - PERFECT for Flutur', vibe: ['conscious', 'transformational', 'organic_house'] },
  { name: 'Boom Festival Area', city: 'Idanha-a-Nova', country: 'Portugal', type: 'festival_area', tier: 2,
    notes: 'Psytrance heartland, but Liminal Village = ambient/world music stage', vibe: ['festival', 'ambient', 'world_music'] },

  // PORTO - Sunset Spots
  { name: 'Terrace Lounge 360', city: 'Vila Nova de Gaia', country: 'Portugal', type: 'rooftop_bar', tier: 2,
    website: 'https://en.espacoportocruz.pt/space/terrace-lounge-360-', instagram: '@espacoportocruz',
    notes: 'Porto Cruz space', vibe: ['wine', 'sunset', 'views'] },
  { name: 'Graca Rooftop Bar', city: 'Porto', country: 'Portugal', type: 'rooftop_bar', tier: 3,
    notes: 'Live music Wed-Sun', vibe: ['live_music', 'casual'] },
  { name: 'Mirajazz', city: 'Porto', country: 'Portugal', type: 'rooftop_bar', tier: 2,
    notes: 'Jazz music, river views', vibe: ['jazz', 'intimate'] },
];

// ═══════════════════════════════════════════════════════════════
// CANARY ISLANDS
// ═══════════════════════════════════════════════════════════════

export const CANARY_VENUES: VenueData[] = [
  // TENERIFE - Wellness Retreats
  { name: 'Purple Valley Yoga Tenerife', city: 'Adeje', country: 'Spain', region: 'Canary Islands', type: 'wellness_retreat', tier: 1,
    website: 'https://yogagoa.com/tenerife-retreats/', instagram: '@purplevalleyyogatenerife',
    notes: 'Yoga retreat, perfect for sound baths', vibe: ['yoga', 'meditation', 'healing'] },
  { name: 'CanaryWell', city: 'Tenerife', country: 'Spain', region: 'Canary Islands', type: 'wellness_retreat', tier: 2,
    website: 'https://www.canarywell.com/', notes: 'Wellness programs', vibe: ['wellness', 'retreat'] },
  { name: 'Wanderlust Yoga', city: 'Tenerife Mountains', country: 'Spain', region: 'Canary Islands', type: 'wellness_retreat', tier: 2,
    website: 'https://www.wanderlustyoga.info', notes: 'Yoga & hiking retreat', vibe: ['nature', 'yoga'] },

  // LANZAROTE - Boutique Hotels (Volcanic!)
  { name: 'Hotel Cesar Lanzarote', city: 'La Asomada', country: 'Spain', region: 'Lanzarote', type: 'boutique_hotel', tier: 1,
    website: 'https://annuahotels.com/en/boutique-hotels-lanzarote/hotel-cesar-lanzarote', instagram: '@cesar_lanzarote',
    notes: 'Volcanic landscape, perfect for field recording content', vibe: ['volcanic', 'design', 'intimate'] },
  { name: 'Buenavista Lanzarote', city: 'La Geria', country: 'Spain', region: 'Lanzarote', type: 'boutique_hotel', tier: 1,
    website: 'https://www.buenavistalanzarote.es/en/', instagram: '@buenavistalanzarote',
    notes: 'Wine country, volcanic views', vibe: ['wine', 'volcanic', 'organic'] },
  { name: 'Finca Isolina Hotel Boutique', city: 'Lanzarote', country: 'Spain', region: 'Lanzarote', type: 'boutique_hotel', tier: 2,
    notes: 'Yoga & meditation focus', vibe: ['yoga', 'meditation'] },
  { name: 'La Isla y El Mar', city: 'Lanzarote', country: 'Spain', region: 'Lanzarote', type: 'boutique_hotel', tier: 2,
    notes: 'Adults-only, UNESCO Biosphere', vibe: ['adults_only', 'nature'] },

  // FUERTEVENTURA - Beach Clubs
  { name: 'Sunset Lounge', city: 'Corralejo', country: 'Spain', region: 'Fuerteventura', type: 'beach_bar', tier: 2,
    website: 'https://sunsetloungelifestyle.com/', instagram: '@sunset_lounge_fuerteventura',
    notes: 'Sunset vibes', vibe: ['sunset', 'chill'] },
  { name: 'The Rooftop Lounge', city: 'Caleta de Fuste', country: 'Spain', region: 'Fuerteventura', type: 'rooftop_bar', tier: 3,
    notes: 'Cocktails, sunset views', vibe: ['cocktails', 'sunset'] },

  // GRAN CANARIA - Sunset Venues
  { name: 'Blue Marlin Ibiza Sky Lounge', city: 'Meloneras', country: 'Spain', region: 'Gran Canaria', type: 'sky_lounge', tier: 1,
    website: 'https://www.bluemarlinibizaskylounge-gc.com/', instagram: '@bluemarlinibizaskylounge',
    notes: 'Ibiza vibes, rooftop infinity pool, sushi & cocktails', vibe: ['ibiza', 'luxury', 'electronic'] },
  { name: 'Amadores Beach Club', city: 'Mogan', country: 'Spain', region: 'Gran Canaria', type: 'beach_club', tier: 2,
    instagram: '@amadoresbeachclub', notes: 'Trendy beach club with spa', vibe: ['beach', 'spa'] },
  { name: 'Mumbai Sunset Bar', city: 'Las Palmas', country: 'Spain', region: 'Gran Canaria', type: 'sunset_bar', tier: 2,
    instagram: '@mumbai_sunset', notes: 'Live music Saturdays, Playa Canteras', vibe: ['live_music', 'sunset'] },
  { name: 'Club Maroa', city: 'Anfi Island', country: 'Spain', region: 'Gran Canaria', type: 'beach_club', tier: 2,
    notes: 'Largest chill-out terrace in Canaries', vibe: ['chill', 'massive'] },
];

// ═══════════════════════════════════════════════════════════════
// IBIZA - Conscious/Organic House Scene
// ═══════════════════════════════════════════════════════════════

export const IBIZA_VENUES: VenueData[] = [
  // CONSCIOUS/ORGANIC HOUSE VENUES (Perfect for Flutur)
  { name: 'WooMooN / Cova Santa', city: 'Sant Josep', country: 'Spain', region: 'Ibiza', type: 'conscious_venue', tier: 1,
    website: 'https://woomoon.com/', instagram: '@woomoon_ibiza',
    notes: 'Conscious clubbing, full moon events, transformational dance - PERFECT FIT', vibe: ['conscious', 'spiritual', 'organic_house', 'moon'] },
  { name: 'Beachouse Ibiza', city: 'Playa d\'en Bossa', country: 'Spain', region: 'Ibiza', type: 'beach_club', tier: 1,
    website: 'https://www.beachouseibiza.com/', instagram: '@beachouseibiza',
    notes: 'Balinese-inspired, wellness events, yoga sunset sessions, organic house', vibe: ['wellness', 'yoga', 'sunset', 'organic'] },
  { name: 'Sunset Ashram', city: 'Cala Conta', country: 'Spain', region: 'Ibiza', type: 'beach_club', tier: 1,
    website: 'https://sunsetashram.com/', instagram: '@sunsetashramibiza',
    notes: 'Spiritual vibe, sunset ceremonies, perfect for ambient/RAV sets', vibe: ['spiritual', 'sunset', 'ceremony', 'ambient'] },
  { name: 'Babylon Beach', city: 'Santa Eulalia', country: 'Spain', region: 'Ibiza', type: 'beach_club', tier: 1,
    website: 'https://www.babylonbeachbar.com/', instagram: '@babylonbeach',
    notes: 'Bohemian vibes, conscious community, organic house', vibe: ['bohemian', 'conscious', 'organic_house'] },
  { name: 'Kumharas', city: 'San Antonio', country: 'Spain', region: 'Ibiza', type: 'sunset_bar', tier: 2,
    website: 'https://kumharas.com/', instagram: '@kumharas',
    notes: 'Legendary sunset bar since 1999, chillout music', vibe: ['sunset', 'chillout', 'legendary'] },
  { name: 'Las Dalias', city: 'San Carlos', country: 'Spain', region: 'Ibiza', type: 'cultural_venue', tier: 2,
    website: 'https://lasdalias.es/', instagram: '@lasdalias',
    notes: 'Hippy market, live music, 50+ years history, world music stage', vibe: ['hippie', 'world_music', 'cultural'] },
];

// ═══════════════════════════════════════════════════════════════
// GREECE
// ═══════════════════════════════════════════════════════════════

export const GREECE_VENUES: VenueData[] = [
  // ATHENS - Rooftops
  { name: 'A for Athens', city: 'Athens', country: 'Greece', type: 'rooftop_bar', tier: 1,
    website: 'https://aforathens.com/', instagram: '@aforathens',
    email: 'info@aforathens.com', notes: 'Iconic Acropolis view, Monastiraki', vibe: ['acropolis', 'iconic', 'cocktails'] },
  { name: 'GB Roof Garden', city: 'Athens', country: 'Greece', type: 'rooftop_bar', tier: 1,
    notes: 'Grande Bretagne Hotel, ultra-luxury', vibe: ['luxury', 'fine_dining'] },
  { name: 'Couleur Locale', city: 'Athens', country: 'Greece', type: 'rooftop_bar', tier: 2,
    notes: 'Hip rooftop, artistic crowd', vibe: ['artistic', 'alternative'] },
  { name: 'Six d.o.g.s', city: 'Athens', country: 'Greece', type: 'cultural_venue', tier: 2,
    notes: 'Live music, cultural events, garden', vibe: ['live_music', 'cultural', 'garden'] },

  // THESSALONIKI
  { name: 'Orizontes Rooftop', city: 'Thessaloniki', country: 'Greece', type: 'rooftop_bar', tier: 1,
    notes: 'Best view of White Tower and sea, Makedonia Palace Hotel', vibe: ['panoramic', 'luxury', 'sunset'] },
  { name: 'Ladadika District', city: 'Thessaloniki', country: 'Greece', type: 'cultural_venue', tier: 2,
    notes: 'Historic district with live music bars', vibe: ['live_music', 'historic', 'nightlife'] },
  { name: 'Thermaikos Bar', city: 'Thessaloniki', country: 'Greece', type: 'seaside_bar', tier: 2,
    notes: 'Waterfront bar, sunset views', vibe: ['waterfront', 'sunset', 'chill'] },
  { name: 'The Excelsior Hotel Rooftop', city: 'Thessaloniki', country: 'Greece', type: 'rooftop_bar', tier: 2,
    notes: 'Elegant rooftop, city views', vibe: ['elegant', 'cocktails'] },
  { name: 'Vogatsikou 3', city: 'Thessaloniki', country: 'Greece', type: 'cultural_venue', tier: 3,
    notes: 'Live music venue, alternative scene', vibe: ['alternative', 'live_music'] },

  // PATRAS
  { name: 'Palazzo Castelletti', city: 'Patras', country: 'Greece', type: 'boutique_hotel', tier: 2,
    notes: 'Historic palazzo, events space', vibe: ['historic', 'events', 'boutique'] },
  { name: 'Primavera', city: 'Patras', country: 'Greece', type: 'seaside_bar', tier: 3,
    notes: 'Beach bar on Rio waterfront', vibe: ['beach', 'sunset'] },
  { name: 'Skala Bar', city: 'Patras', country: 'Greece', type: 'rooftop_bar', tier: 3,
    notes: 'City center rooftop', vibe: ['urban', 'cocktails'] },

  // PAROS
  { name: 'CRIOS Beach Bar', city: 'Parikia', country: 'Greece', region: 'Paros', type: 'beach_club', tier: 1,
    notes: 'Upscale dining + DJ sets at sunset, 3.5km from Parikia', vibe: ['sunset', 'dj', 'upscale'] },
  { name: 'Santa Maria Beach Bar', city: 'Naoussa', country: 'Greece', region: 'Paros', type: 'beach_bar', tier: 2,
    notes: 'Non-stop DJ rotation, east coast', vibe: ['party', 'beach'] },
  { name: 'Kastro\'s Lounge Bar', city: 'Parikia', country: 'Greece', region: 'Paros', type: 'lounge', tier: 2,
    notes: 'Live jazz performances select nights', vibe: ['jazz', 'intimate'] },

  // MYKONOS
  { name: 'Scorpios', city: 'Paraga', country: 'Greece', region: 'Mykonos', type: 'beach_club', tier: 1,
    website: 'https://www.scorpios.com/', instagram: '@scorpiosmykonos',
    email: 'bookings.mykonos@scorpios.com',
    notes: 'Legendary sunset ritual, world-class DJs - PERFECT FIT for organic house/ambient', vibe: ['sunset_ritual', 'organic_house', 'spiritual'] },
  { name: 'Principote', city: 'Panormos', country: 'Greece', region: 'Mykonos', type: 'beach_club', tier: 1,
    email: 'info@principote.com',
    notes: 'Luxury beach club, organic vibes', vibe: ['luxury', 'organic', 'sunset'] },

  // PELOPONNESE - Wellness Resort
  { name: 'W Costa Navarino', city: 'Messinia', country: 'Greece', region: 'Peloponnese', type: 'wellness_resort', tier: 1,
    website: 'https://www.costanavarino.com/', instagram: '@costanavarino',
    notes: 'Sound Wellness Week program, Euphoria Retreat nearby - PERFECT for wellness music', vibe: ['wellness', 'sound_healing', 'luxury', 'retreat'] },

  // SANTORINI
  { name: 'PK Cocktail Bar', city: 'Fira', country: 'Greece', region: 'Santorini', type: 'cocktail_bar', tier: 1,
    notes: 'Caldera views, sunset cocktails', vibe: ['caldera', 'sunset', 'romantic'] },
  { name: 'Tropical Bar', city: 'Perissa', country: 'Greece', region: 'Santorini', type: 'beach_bar', tier: 2,
    notes: 'Black sand beach vibes', vibe: ['beach', 'chill'] },
];

// ═══════════════════════════════════════════════════════════════
// ITALY
// ═══════════════════════════════════════════════════════════════

export const ITALY_VENUES: VenueData[] = [
  // LAKE MAGGIORE (Home base!)
  { name: 'Grand Hotel Des Iles Borromees', city: 'Stresa', country: 'Italy', region: 'Lake Maggiore', type: 'luxury_hotel', tier: 1,
    notes: 'Historic luxury hotel, perfect for ambient sets', vibe: ['luxury', 'historic', 'lake'] },
  { name: 'Villa Aminta', city: 'Stresa', country: 'Italy', region: 'Lake Maggiore', type: 'boutique_hotel', tier: 2,
    notes: '5-star boutique on the lake', vibe: ['boutique', 'lake', 'intimate'] },

  // MILAN
  { name: 'Terrazza Aperol', city: 'Milan', country: 'Italy', type: 'rooftop_bar', tier: 2,
    notes: 'Duomo views, iconic aperitivo', vibe: ['aperitivo', 'iconic'] },
  { name: 'Radio Rooftop', city: 'Milan', country: 'Italy', type: 'rooftop_bar', tier: 2,
    notes: 'ME Milan hotel', vibe: ['design', 'cocktails'] },
  { name: 'Ceresio 7', city: 'Milan', country: 'Italy', type: 'rooftop_pool', tier: 1,
    notes: 'Pool club on rooftop, fashion crowd', vibe: ['pool', 'fashion', 'sunset'] },

  // AMALFI COAST
  { name: 'Borgo Santandrea', city: 'Amalfi', country: 'Italy', region: 'Amalfi Coast', type: 'luxury_hotel', tier: 1,
    website: 'https://borgosantandrea.it/', instagram: '@borgosantandreaamalfi',
    notes: 'Private beach, terrace bar, 3 restaurants', vibe: ['luxury', 'cliffside', 'exclusive'] },
  { name: 'Hotel Santa Caterina', city: 'Amalfi', country: 'Italy', region: 'Amalfi Coast', type: 'luxury_hotel', tier: 1,
    notes: 'Best sunset terrace in town', vibe: ['sunset', 'historic', 'romantic'] },
  { name: 'Monastero Santa Rosa', city: 'Conca dei Marini', country: 'Italy', region: 'Amalfi Coast', type: 'spa_hotel', tier: 1,
    website: 'https://www.monasterosantarosa.com/',
    email: 'info@monasterosantarosa.com',
    notes: 'Former monastery, exceptional spa - PERFECT for spiritual/healing music', vibe: ['spa', 'spiritual', 'peaceful'] },

  // SICILY
  { name: 'Tao Beach Club', city: 'Taormina', country: 'Italy', region: 'Sicily', type: 'beach_club', tier: 1,
    website: 'https://www.taobeachclub.com/en/taormina-beach-club/', instagram: '@taobeachclubtaormina',
    notes: 'Exclusive, Etna views, international DJ sets', vibe: ['exclusive', 'etna', 'nightlife'] },
  { name: 'Lido La Pigna', city: 'Taormina', country: 'Italy', region: 'Sicily', type: 'beach_club', tier: 2,
    website: 'http://www.lidolapigna.com/', notes: 'Historic lido', vibe: ['classic', 'beach'] },

  // SARDINIA
  { name: 'Phi Beach', city: 'Porto Cervo', country: 'Italy', region: 'Sardinia', type: 'beach_club', tier: 1,
    website: 'https://phibeach.com/', instagram: '@phibeach',
    email: 'booking@phibeach.com',
    notes: 'Legendary sunset sessions, Costa Smeralda - PERFECT for organic/ambient sets', vibe: ['sunset', 'organic_house', 'luxury'] },
  { name: 'Nikki Beach', city: 'Porto Cervo', country: 'Italy', region: 'Sardinia', type: 'beach_club', tier: 3,
    email: 'entertainment@nikkibeach.com',
    notes: 'International chain, jet-set crowd - MORE PARTY than Flutur style', vibe: ['party', 'luxury'] },

  // PUGLIA
  { name: 'Masseria Torre Maizza', city: 'Savelletri', country: 'Italy', region: 'Puglia', type: 'masseria', tier: 1,
    website: 'https://www.roccofortehotels.com/hotels-and-resorts/masseria-torre-maizza/',
    email: 'events.torremaizza@roccofortehotels.com',
    notes: 'Rocco Forte hotel, olive groves, perfect for intimate sunset sessions', vibe: ['masseria', 'organic', 'luxury'] },
  { name: 'Borgo Egnazia', city: 'Savelletri', country: 'Italy', region: 'Puglia', type: 'resort', tier: 1,
    website: 'https://www.borgoegnazia.com/',
    email: 'info@borgoegnazia.com',
    notes: 'Famous resort, wellness spa, events venue', vibe: ['resort', 'wellness', 'exclusive'] },
];

// ═══════════════════════════════════════════════════════════════
// ALBANIA
// ═══════════════════════════════════════════════════════════════

export const ALBANIA_VENUES: VenueData[] = [
  // SARANDA - Riviera
  { name: 'Havana Beach Club', city: 'Saranda', country: 'Albania', type: 'beach_club', tier: 2,
    notes: 'Albanian Riviera, growing scene', vibe: ['beach', 'party', 'emerging'] },
  { name: 'Orange Blue Beach', city: 'Saranda', country: 'Albania', type: 'beach_bar', tier: 3,
    notes: 'Chill vibes, sunset', vibe: ['chill', 'sunset'] },

  // KSAMIL
  { name: 'Ksamil Beach Bars', city: 'Ksamil', country: 'Albania', type: 'beach_bar', tier: 2,
    notes: 'Crystal waters, multiple beach bars', vibe: ['paradise', 'authentic'] },

  // TIRANA
  { name: 'Radio Bar', city: 'Tirana', country: 'Albania', type: 'rooftop_bar', tier: 2,
    notes: 'Blloku district, artistic scene', vibe: ['artistic', 'nightlife'] },
  { name: 'Hemingway Bar', city: 'Tirana', country: 'Albania', type: 'cocktail_bar', tier: 3,
    notes: 'Historic bar, live jazz', vibe: ['jazz', 'historic'] },
  { name: 'Sky Tower', city: 'Tirana', country: 'Albania', type: 'rooftop_bar', tier: 2,
    notes: '85m tower, rotating restaurant', vibe: ['panoramic', 'unique'] },

  // DURRES
  { name: 'Tropikal Resort', city: 'Durres', country: 'Albania', type: 'beach_resort', tier: 3,
    notes: 'Beach resort with events', vibe: ['resort', 'beach'] },

  // HIMARA
  { name: 'Himara Beach Clubs', city: 'Himara', country: 'Albania', type: 'beach_bar', tier: 2,
    notes: 'Untouched Albanian Riviera', vibe: ['authentic', 'discovery'] },
];

// ═══════════════════════════════════════════════════════════════
// CROATIA
// ═══════════════════════════════════════════════════════════════

export const CROATIA_VENUES: VenueData[] = [
  // DUBROVNIK
  { name: 'Buza Bar', city: 'Dubrovnik', country: 'Croatia', type: 'cliff_bar', tier: 1,
    notes: 'Iconic cliff bar outside city walls', vibe: ['iconic', 'sunset', 'views'] },
  { name: 'Cave Bar More', city: 'Dubrovnik', country: 'Croatia', type: 'beach_club', tier: 1,
    notes: 'Inside a literal cave, Hotel More', vibe: ['unique', 'cave', 'exclusive'] },
  { name: 'Eastwest Beach Club', city: 'Dubrovnik', country: 'Croatia', type: 'beach_club', tier: 2,
    notes: 'Banje Beach, DJ sets', vibe: ['beach', 'party', 'sunset'] },
  { name: 'Revelin Club', city: 'Dubrovnik', country: 'Croatia', type: 'nightclub', tier: 2,
    notes: '16th century fortress club', vibe: ['fortress', 'nightlife', 'historic'] },

  // SPLIT
  { name: 'Zrce Beach', city: 'Novalja', country: 'Croatia', region: 'Pag Island', type: 'beach_club', tier: 3,
    notes: 'Croatian Ibiza - PARTY venue, NOT Flutur style (EDM/hard electronic)', vibe: ['festival', 'party', 'edm'] },
  { name: 'Vidilica', city: 'Split', country: 'Croatia', type: 'rooftop_bar', tier: 2,
    notes: 'Marjan hill, city views', vibe: ['nature', 'views', 'sunset'] },
  { name: 'Riva Promenade Bars', city: 'Split', country: 'Croatia', type: 'waterfront_bar', tier: 3,
    notes: 'Multiple bars along the waterfront', vibe: ['waterfront', 'social'] },

  // HVAR
  { name: 'Carpe Diem Beach', city: 'Hvar', country: 'Croatia', type: 'beach_club', tier: 3,
    notes: 'Island party destination - MORE party-focused than Flutur style', vibe: ['party', 'exclusive', 'edm'] },
  { name: 'Hula Hula Beach Bar', city: 'Hvar', country: 'Croatia', type: 'beach_bar', tier: 2,
    notes: 'Legendary sunset spot, party-focused but good exposure', vibe: ['sunset', 'party', 'iconic'] },

  // ROVINJ
  { name: 'Monte Mulini Art Hotel', city: 'Rovinj', country: 'Croatia', type: 'boutique_hotel', tier: 1,
    notes: 'Design hotel, terrace bar', vibe: ['design', 'art', 'intimate'] },
  { name: 'Lone Bar', city: 'Rovinj', country: 'Croatia', type: 'hotel_bar', tier: 2,
    notes: 'Design hotel bar, forest setting', vibe: ['design', 'nature'] },

  // ZADAR
  { name: 'The Garden', city: 'Zadar', country: 'Croatia', type: 'festival_venue', tier: 2,
    notes: 'Festival venue, electronic music', vibe: ['festival', 'electronic'] },
];

// ═══════════════════════════════════════════════════════════════
// FRANCE (Côte d'Azur + South)
// ═══════════════════════════════════════════════════════════════

export const FRANCE_VENUES: VenueData[] = [
  // NICE
  { name: 'Le Plongeoir', city: 'Nice', country: 'France', region: 'Côte d\'Azur', type: 'seaside_restaurant', tier: 1,
    notes: 'On the rocks, iconic Nice spot', vibe: ['iconic', 'seaside', 'sunset'] },
  { name: 'Castel Plage', city: 'Nice', country: 'France', region: 'Côte d\'Azur', type: 'beach_club', tier: 1,
    notes: 'Private beach, Promenade des Anglais', vibe: ['beach', 'upscale'] },
  { name: 'Hôtel Le Negresco', city: 'Nice', country: 'France', region: 'Côte d\'Azur', type: 'luxury_hotel', tier: 1,
    notes: 'Legendary hotel, events', vibe: ['luxury', 'historic', 'iconic'] },

  // CANNES
  { name: 'Baôli', city: 'Cannes', country: 'France', region: 'Côte d\'Azur', type: 'beach_club', tier: 3,
    notes: 'Celebrity spot - PARTY venue, not Flutur style', vibe: ['celebrity', 'party', 'edm'] },
  { name: 'La Plage du Martinez', city: 'Cannes', country: 'France', region: 'Côte d\'Azur', type: 'beach_club', tier: 1,
    notes: 'Hotel Martinez private beach', vibe: ['luxury', 'film_festival'] },
  { name: 'Le Roof', city: 'Cannes', country: 'France', region: 'Côte d\'Azur', type: 'rooftop_bar', tier: 2,
    notes: 'Five Seas Hotel rooftop', vibe: ['rooftop', 'sunset'] },

  // SAINT-TROPEZ
  { name: 'Club 55', city: 'Saint-Tropez', country: 'France', region: 'Côte d\'Azur', type: 'beach_club', tier: 1,
    notes: 'Legendary since 1955 - Classic French Riviera, worth trying', vibe: ['legendary', 'exclusive', 'luxury'] },
  { name: 'Nikki Beach St Tropez', city: 'Saint-Tropez', country: 'France', region: 'Côte d\'Azur', type: 'beach_club', tier: 3,
    notes: 'International party destination - NOT Flutur style', vibe: ['party', 'edm', 'celebrity'] },
  { name: 'Les Caves du Roy', city: 'Saint-Tropez', country: 'France', region: 'Côte d\'Azur', type: 'nightclub', tier: 3,
    notes: 'Legendary nightclub - PARTY venue, not Flutur style', vibe: ['nightlife', 'edm', 'celebrity'] },

  // MARSEILLE
  { name: 'Le Petit Nice', city: 'Marseille', country: 'France', type: 'boutique_hotel', tier: 2,
    notes: '3-star Michelin, seaside terrace', vibe: ['gastronomy', 'seaside'] },
  { name: 'Rooftop R2', city: 'Marseille', country: 'France', type: 'rooftop_bar', tier: 2,
    notes: 'Radisson Blu, Vieux Port views', vibe: ['rooftop', 'port_views'] },

  // MONTPELLIER
  { name: 'Café de la Mer', city: 'Palavas-les-Flots', country: 'France', region: 'Montpellier', type: 'beach_bar', tier: 3,
    notes: 'Beach town near Montpellier', vibe: ['beach', 'chill'] },
];

// ═══════════════════════════════════════════════════════════════
// USA (Focus: Denver + West Coast)
// ═══════════════════════════════════════════════════════════════

export const USA_VENUES: VenueData[] = [
  // DENVER (Your territory!)
  { name: 'Ophelia\'s Electric Soapbox', city: 'Denver', country: 'USA', region: 'Colorado', type: 'music_venue', tier: 1,
    website: 'https://opheliasdenver.com/',
    email: 'amartin@knittingfactory.com',
    notes: 'Live music + brunch, perfect for ambient/world - Knitting Factory booking', vibe: ['live_music', 'eclectic', 'intimate'] },
  { name: 'Dazzle Jazz', city: 'Denver', country: 'USA', region: 'Colorado', type: 'jazz_club', tier: 1,
    website: 'https://dazzledenver.com/',
    notes: 'Premier jazz venue - uses artist consideration form on website', vibe: ['jazz', 'intimate', 'quality'] },
  { name: 'Globe Hall', city: 'Denver', country: 'USA', region: 'Colorado', type: 'music_venue', tier: 2,
    notes: 'Intimate venue, world music friendly', vibe: ['intimate', 'indie'] },
  { name: 'Cervantes Masterpiece Ballroom', city: 'Denver', country: 'USA', region: 'Colorado', type: 'music_venue', tier: 2,
    notes: 'Larger venue, electronic/world', vibe: ['electronic', 'diverse'] },
  { name: 'The Meadowlark', city: 'Denver', country: 'USA', region: 'Colorado', type: 'cocktail_lounge', tier: 2,
    notes: 'Speakeasy vibe, live music', vibe: ['speakeasy', 'intimate'] },

  // BOULDER
  { name: 'Boulder Theater', city: 'Boulder', country: 'USA', region: 'Colorado', type: 'theater', tier: 2,
    notes: 'Historic venue, eclectic bookings', vibe: ['historic', 'eclectic'] },
  { name: 'eTown Hall', city: 'Boulder', country: 'USA', region: 'Colorado', type: 'music_venue', tier: 2,
    notes: 'Solar-powered, conscious venue', vibe: ['conscious', 'acoustic', 'intimate'] },

  // LOS ANGELES
  { name: 'Hotel Cafe', city: 'Los Angeles', country: 'USA', region: 'California', type: 'music_venue', tier: 2,
    notes: 'Intimate singer-songwriter venue', vibe: ['intimate', 'acoustic', 'discovery'] },
  { name: 'The Mint', city: 'Los Angeles', country: 'USA', region: 'California', type: 'music_venue', tier: 3,
    notes: 'Historic jazz/blues venue', vibe: ['historic', 'jazz', 'blues'] },

  // SAN FRANCISCO
  { name: 'Rickshaw Stop', city: 'San Francisco', country: 'USA', region: 'California', type: 'music_venue', tier: 2,
    notes: 'Eclectic bookings, world music', vibe: ['eclectic', 'indie'] },
  { name: 'Cafe Du Nord', city: 'San Francisco', country: 'USA', region: 'California', type: 'music_venue', tier: 2,
    notes: 'Basement venue, intimate', vibe: ['intimate', 'underground'] },

  // NEW MEXICO (Wellness/Retreat market)
  { name: 'Sunrise Springs', city: 'Santa Fe', country: 'USA', region: 'New Mexico', type: 'wellness_resort', tier: 1,
    notes: 'Integrative wellness resort, sound healing', vibe: ['wellness', 'healing', 'retreat'] },
  { name: 'Ojo Caliente', city: 'Ojo Caliente', country: 'USA', region: 'New Mexico', type: 'hot_springs', tier: 2,
    notes: 'Hot springs, meditation events', vibe: ['hot_springs', 'meditation'] },

  // SEDONA
  { name: 'L\'Auberge de Sedona', city: 'Sedona', country: 'USA', region: 'Arizona', type: 'luxury_resort', tier: 1,
    notes: 'Red rocks, spiritual tourism', vibe: ['spiritual', 'nature', 'luxury'] },
  { name: 'Sedona Sound Bath venues', city: 'Sedona', country: 'USA', region: 'Arizona', type: 'wellness', tier: 2,
    notes: 'Multiple venues for sound healing', vibe: ['sound_bath', 'spiritual'] },
];

// ═══════════════════════════════════════════════════════════════
// BOOKING AGENTS (USA Focus)
// ═══════════════════════════════════════════════════════════════

export interface BookingAgentData {
  name: string;
  agency?: string;
  location: string;
  specializes_in: string[];
  website?: string;
  email?: string;
  notes?: string;
  tier: number;
}

export const USA_BOOKING_AGENTS: BookingAgentData[] = [
  // COLORADO
  { name: 'Twisted Pine', agency: 'Twisted Pine', location: 'Denver, CO', tier: 1,
    specializes_in: ['world_music', 'ambient', 'electronic'],
    website: 'https://twistedpineproductions.com/',
    notes: 'Colorado-based, books Globe Hall, Cervantes' },
  { name: 'Z2 Entertainment', agency: 'Z2 Entertainment', location: 'Boulder, CO', tier: 1,
    specializes_in: ['folk', 'world', 'acoustic'],
    website: 'https://z2ent.com/',
    notes: 'Books Boulder Theater, Fox Theatre' },

  // NATIONAL
  { name: 'Paradigm Talent Agency', agency: 'Paradigm', location: 'Los Angeles, CA', tier: 1,
    specializes_in: ['electronic', 'world', 'ambient'],
    notes: 'Major agency, world music roster' },
  { name: 'Monterey International', agency: 'Monterey International', location: 'Chicago, IL', tier: 1,
    specializes_in: ['world', 'jazz', 'acoustic'],
    notes: 'Strong world music focus' },
  { name: 'High Road Touring', agency: 'High Road Touring', location: 'San Francisco, CA', tier: 2,
    specializes_in: ['indie', 'electronic', 'world'],
    notes: 'Independent artists, festival circuit' },

  // WELLNESS/RETREAT SPECIFIC
  { name: 'Retreat Guru', agency: 'Platform', location: 'Online', tier: 2,
    specializes_in: ['wellness', 'sound_healing', 'retreat'],
    website: 'https://retreat.guru/',
    notes: 'Platform for retreat centers - direct bookings' },
  { name: 'Book Retreats', agency: 'Platform', location: 'Online', tier: 2,
    specializes_in: ['wellness', 'yoga', 'meditation'],
    website: 'https://bookretreats.com/',
    notes: 'Another retreat booking platform' },
];

// ═══════════════════════════════════════════════════════════════
// MADEIRA (Portugal)
// ═══════════════════════════════════════════════════════════════

export const MADEIRA_VENUES: VenueData[] = [
  // Beach Clubs & Pool Clubs
  { name: 'Calhau Beach Club (Saccharum)', city: 'Calheta', country: 'Portugal', region: 'Madeira', type: 'beach_club', tier: 1,
    website: 'https://www.savoysignature.com/saccharumhotel/en/restaurant-bars/calhau-beach-club/', instagram: '@saccharumresort',
    notes: 'Tropical Beats DJ parties, sunset spot', vibe: ['sunset', 'dj', 'pool'] },
  { name: 'Barreirinha Bar Cafe', city: 'Funchal', country: 'Portugal', region: 'Madeira', type: 'seaside_bar', tier: 2,
    instagram: '@barreirinhabarcafe', notes: 'Ocean-front, live music events', vibe: ['seaside', 'cultural', 'chill'] },
  // Boutique Hotels
  { name: 'Belmond Reids Palace', city: 'Funchal', country: 'Portugal', region: 'Madeira', type: 'luxury_hotel', tier: 1,
    website: 'https://www.belmond.com/hotels/europe/portugal/madeira/belmond-reids-palace/', instagram: '@belmondreidspalace',
    email: 'reservations.rds@belmond.com', notes: 'Wine cellar events, live jazz, up to 90 guests', vibe: ['luxury', 'historic', 'events'] },
  { name: 'Estalagem da Ponta do Sol', city: 'Ponta do Sol', country: 'Portugal', region: 'Madeira', type: 'boutique_hotel', tier: 1,
    website: 'https://www.pontadosol.com/', instagram: '@estalagemdapontadosol', email: 'info@pontadosol.com',
    notes: 'Purple Friday parties, cliff-top infinity pool, DJs from Berlin/Lisbon', vibe: ['organic', 'sunset', 'dj'] },
  { name: 'Se Boutique Hotel', city: 'Funchal', country: 'Portugal', region: 'Madeira', type: 'boutique_hotel', tier: 2,
    website: 'https://www.seboutiquehotel.com/en/', instagram: '@seboutiquehotel', email: 'info@seboutiquehotel.com',
    notes: 'Flamingo rooftop, weekend live music', vibe: ['rooftop', 'cocktails'] },
  { name: 'Escarpa The Madeira Hideaway', city: 'Ponta do Sol', country: 'Portugal', region: 'Madeira', type: 'boutique_hotel', tier: 1,
    website: 'https://escarpa-madeira.com/', instagram: '@escarpa_the_madeira_hideaway',
    notes: 'Adults-only, 9 rooms, intimate events', vibe: ['design', 'intimate', 'adults_only'] },
  // Rooftop Bars
  { name: 'Galaxia Skybar (Savoy Palace)', city: 'Funchal', country: 'Portugal', region: 'Madeira', type: 'rooftop_bar', tier: 1,
    website: 'https://www.savoysignature.com/savoypalacehotel/en/bars/galaxia-skybar/', instagram: '@galaxiaskyfood_skybar',
    notes: '16th floor, 360° views, DJ sets, live jazz', vibe: ['panoramic', 'sophisticated', 'cocktails'] },
  { name: 'Cloud Bar (NEXT Hotel)', city: 'Funchal', country: 'Portugal', region: 'Madeira', type: 'rooftop_bar', tier: 2,
    website: 'https://hotelnext.pt/en-cloud-bar/', instagram: '@hotel.next',
    notes: 'Adults-only, underwater sound system pool', vibe: ['design', 'electro', 'adults_only'] },
  // Wellness Retreats
  { name: 'Yeotown Madeira', city: 'Arco da Calheta', country: 'Portugal', region: 'Madeira', type: 'wellness_retreat', tier: 1,
    website: 'https://madeira.yeotown.com/', notes: '5-day retreats, yoga, meditation, perfect for sound baths', vibe: ['wellness', 'yoga', 'retreat'] },
  { name: 'Sentido Galomar', city: 'Canico de Baixo', country: 'Portugal', region: 'Madeira', type: 'wellness_hotel', tier: 2,
    website: 'https://www.galoresort.com/', notes: 'First green eco hotel in Madeira, yoga garden', vibe: ['eco', 'yoga', 'wellness'] },
];

// ═══════════════════════════════════════════════════════════════
// ITALY - CENTRAL (Umbria, Marche, Abruzzo)
// ═══════════════════════════════════════════════════════════════

export const ITALY_CENTRAL_VENUES: VenueData[] = [
  // UMBRIA
  { name: 'Eremito Hotelito del Alma', city: 'Parrano', country: 'Italy', region: 'Umbria', type: 'monastery_hotel', tier: 1,
    website: 'https://www.eremito.com', instagram: '@eremitohotel',
    notes: '14th-century monastery, digital detox, yoga room, candlelit - PERFECT for ambient', vibe: ['meditation', 'spiritual', 'silence'] },
  { name: 'Tara Nature Retreat', city: 'Todi', country: 'Italy', region: 'Umbria', type: 'wellness_retreat', tier: 1,
    website: 'https://www.taranatureretreat.com',
    notes: 'Venue rental for music/yoga facilitators, oak forest', vibe: ['yoga', 'nature', 'retreat'] },
  { name: 'Borgo dei Conti Resort', city: 'Boschetto Vecchio', country: 'Italy', region: 'Umbria', type: 'luxury_resort', tier: 1,
    website: 'https://www.borgodeicontiresort.com', instagram: '@borgodeicontiresort',
    notes: 'Relais & Chateaux, outdoor film screenings, 40 acres olive groves', vibe: ['luxury', 'events', 'organic'] },
  { name: 'Rastrello Boutique Hotel', city: 'Panicale', country: 'Italy', region: 'Umbria', type: 'boutique_hotel', tier: 2,
    website: 'https://www.rastrello.com', instagram: '@rastrello.panicale', email: 'chiara@rastrello.com',
    notes: '14th-century palazzo, Lake Trasimeno views', vibe: ['historic', 'terrace', 'sunset'] },
  { name: 'Locanda Palazzone', city: 'Orvieto', country: 'Italy', region: 'Umbria', type: 'wine_hotel', tier: 2,
    instagram: '@locandapalazzone', notes: '13th-century pilgrim inn, vineyard views', vibe: ['wine', 'historic'] },
  // MARCHE
  { name: 'Filodivino Wine Resort', city: 'San Marcello', country: 'Italy', region: 'Marche', type: 'wine_resort', tier: 1,
    website: 'https://www.filodivino.it', email: 'info@filodivino.it',
    notes: 'Infinity pool among vineyards, Verdicchio wines', vibe: ['wine', 'infinity_pool', 'organic'] },
  { name: 'White Beach Club', city: 'Numana', country: 'Italy', region: 'Marche', type: 'beach_club', tier: 1,
    website: 'https://whitebeachnumana.it', instagram: '@whitebeachclubnumana',
    notes: '2024 new, design beach club, Conero coast', vibe: ['design', 'sunset', 'aperitivo'] },
  { name: '45.com Spiaggia', city: 'San Benedetto del Tronto', country: 'Italy', region: 'Marche', type: 'beach_club', tier: 2,
    instagram: '@45puntocom', notes: 'Beach cuisine music venue', vibe: ['beach', 'music'] },
  // ABRUZZO
  { name: 'Sextantio Albergo Diffuso', city: 'Santo Stefano di Sessanio', country: 'Italy', region: 'Abruzzo', type: 'albergo_diffuso', tier: 1,
    website: 'https://www.sextantio.it', instagram: '@sextantio',
    notes: 'Medieval village at 1250m, Gran Sasso, Michelin Key', vibe: ['medieval', 'mountain', 'unique'] },
  { name: 'Castello di Semivicoli', city: 'Casacanditella', country: 'Italy', region: 'Abruzzo', type: 'castle_hotel', tier: 1,
    website: 'www.castellodisemivicoli.it', instagram: '@castellodisemivicoli', email: 'info@castellodisemivicoli.it',
    notes: '17th-century palace, Masciarelli winery', vibe: ['castle', 'wine', 'events'] },
  { name: 'Alma Vibes Beach Lounge', city: 'San Vito Chietino', country: 'Italy', region: 'Abruzzo', type: 'beach_lounge', tier: 1,
    website: 'https://www.almavibes.it', instagram: '@alma.vibes', email: 'beach@almavibes.it',
    notes: 'Costa dei Trabocchi, sunset music, natural wines', vibe: ['sunset', 'sustainable', 'music'] },
  { name: 'Trabocco Punta Cavalluccio', city: 'Rocca San Giovanni', country: 'Italy', region: 'Abruzzo', type: 'trabocco', tier: 2,
    website: 'www.traboccopuntacavalluccio.it', notes: 'Largest trabocco, weddings/events', vibe: ['unique', 'seaside', 'romantic'] },
  { name: 'Shanticentre', city: 'Atri', country: 'Italy', region: 'Abruzzo', type: 'yoga_retreat', tier: 2,
    website: 'www.shanticentre.com', notes: 'Yoga terrace, 15km from sea', vibe: ['yoga', 'retreat'] },
];

// ═══════════════════════════════════════════════════════════════
// ITALY - SOUTH (Calabria, Basilicata)
// ═══════════════════════════════════════════════════════════════

export const ITALY_SOUTH_VENUES: VenueData[] = [
  // CALABRIA - Tropea/Capo Vaticano
  { name: 'Blanca Beach Club', city: 'Tropea', country: 'Italy', region: 'Calabria', type: 'beach_club', tier: 1,
    instagram: '@blanca_beach_by_valentour', notes: 'Exclusive white design, Aeolian Islands views, DJ events', vibe: ['design', 'exclusive', 'dj'] },
  { name: 'Sunset Beach Club Tropea', city: 'Tropea', country: 'Italy', region: 'Calabria', type: 'beach_club', tier: 2,
    website: 'https://www.sunsetbeachtropea.it/en/', instagram: '@sunsetbeachclubtropea', email: 'booking@sunsetholidays.it',
    notes: '4 Ristoranti winner, panoramic bar', vibe: ['sunset', 'gastronomic'] },
  { name: 'Le Pietre Volte', city: 'Capo Vaticano', country: 'Italy', region: 'Calabria', type: 'event_venue', tier: 1,
    website: 'https://www.lepietrevolte.com/', instagram: '@lepietrevolte',
    notes: 'Ancient farmhouse, concerts, art exhibitions, rooftop terrace', vibe: ['artistic', 'events', 'sunset'] },
  { name: 'Capovaticano Resort', city: 'Capo Vaticano', country: 'Italy', region: 'Calabria', type: 'wellness_resort', tier: 1,
    website: 'https://www.capovaticanoresort.it/en/', instagram: '@capovaticanoresort', email: 'info@capovaticanoresort.it',
    notes: 'Beach bar with DJ sets, Stromboli views', vibe: ['wellness', 'sunset', 'volcanic'] },
  { name: 'Villa Paola', city: 'Tropea', country: 'Italy', region: 'Calabria', type: 'historic_hotel', tier: 1,
    website: 'https://www.villapaolatropea.it/en/', instagram: '@villapaolatropea', email: 'info@villapaolatropea.it',
    notes: '16th-century friary, weddings/events', vibe: ['historic', 'luxury', 'sea_view'] },
  { name: 'Popilia Country Resort', city: 'Maierato', country: 'Italy', region: 'Calabria', type: 'country_resort', tier: 2,
    website: 'https://www.popiliaresort.it/en/', instagram: '@popiliacountryresort', email: 'info@popiliaresort.it',
    notes: '140 hectares, 10 min from beach', vibe: ['nature', 'events'] },
  // BASILICATA - Matera
  { name: 'Sextantio Le Grotte della Civita', city: 'Matera', country: 'Italy', region: 'Basilicata', type: 'cave_hotel', tier: 1,
    website: 'https://www.sextantio.it/en/legrottedellacivita/', instagram: '@sextantio',
    notes: '18 caves + 13th-century church for candlelit events, UNESCO', vibe: ['cave', 'unesco', 'unique'] },
  { name: 'Palazzo Gattini', city: 'Matera', country: 'Italy', region: 'Basilicata', type: 'luxury_hotel', tier: 1,
    website: 'https://www.vretreats.com/en/palazzo-gattini/', instagram: '@palazzogattini',
    notes: '5-star, roof garden, private chapel for events', vibe: ['luxury', 'rooftop', 'events'] },
  { name: 'Aquatio Cave Luxury Hotel', city: 'Matera', country: 'Italy', region: 'Basilicata', type: 'design_hotel', tier: 1,
    website: 'https://www.aquatiohotel.com/en/', instagram: '@aquatiocave',
    notes: 'Design hotel, 500sqm spa in rock, 40-person room', vibe: ['design', 'spa', 'cave'] },
  { name: 'Santavenere Hotel', city: 'Maratea', country: 'Italy', region: 'Basilicata', type: 'luxury_hotel', tier: 1,
    website: 'https://santavenere.it/en/', instagram: '@hotelsantavenere', email: 'info@santavenere.it',
    notes: 'Leading Hotels, jazz concerts, private beach', vibe: ['luxury', 'jazz', 'beach'] },
  { name: 'Tenuta Danesi', city: 'Matera', country: 'Italy', region: 'Basilicata', type: 'masseria', tier: 2,
    website: 'https://www.tenutadanesimatera.it/en/', email: 'info@tenutadanesimatera.it',
    notes: '18th-century masseria, cultural events', vibe: ['masseria', 'events', 'authentic'] },
];

// ═══════════════════════════════════════════════════════════════
// ITALY - MORE SICILY
// ═══════════════════════════════════════════════════════════════

export const SICILY_EXTENDED_VENUES: VenueData[] = [
  // CEFALU
  { name: 'Le Calette Hotel', city: 'Cefalu', country: 'Italy', region: 'Sicily', type: 'beach_hotel', tier: 1,
    website: 'https://lecalette.it/', instagram: '@lecalettehotel', notes: 'Luxury beach access', vibe: ['beach', 'luxury'] },
  // SAN VITO LO CAPO
  { name: 'Aurora Beach Club', city: 'San Vito Lo Capo', country: 'Italy', region: 'Sicily', type: 'beach_club', tier: 2,
    website: 'https://aurorabeachclub.com/en/beach-resort-in-san-vito-lo-capo/', email: 'info@aurorabeachclub.com',
    vibe: ['beach', 'resort'] },
  { name: 'Mamitas Beach Garden', city: 'San Vito Lo Capo', country: 'Italy', region: 'Sicily', type: 'beach_club', tier: 2,
    website: 'https://www.lidomamitassanvitolocapo.it/it/', instagram: '@mamitasbeachgarden', vibe: ['beach', 'garden'] },
  // SIRACUSA
  { name: 'Lido Fly Beach', city: 'Siracusa', country: 'Italy', region: 'Sicily', type: 'beach_club', tier: 2,
    website: 'https://www.lidoflybeach.it/', instagram: '@lidoflybeach', vibe: ['beach'] },
  // RAGUSA / VAL DI NOTO
  { name: 'Villa Boscarino', city: 'Ragusa', country: 'Italy', region: 'Sicily', type: 'boutique_hotel', tier: 1,
    website: 'https://villaboscarino.it/en/homepage', instagram: '@villaboscarino', notes: 'Spa, baroque town', vibe: ['boutique', 'spa'] },
  { name: 'Locanda Don Serafino', city: 'Ragusa Ibla', country: 'Italy', region: 'Sicily', type: 'boutique_hotel', tier: 1,
    website: 'https://www.locandadonserafino.it/en/index', instagram: '@locandadonserafino', email: 'info@locandadonserafino.it',
    notes: 'Michelin restaurant', vibe: ['michelin', 'boutique', 'baroque'] },
  // NOTO
  { name: 'Q92 Noto Hotel', city: 'Noto', country: 'Italy', region: 'Sicily', type: 'boutique_hotel', tier: 1,
    website: 'https://q92notohotel.com/', instagram: '@q92notohotel', email: 'info@q92notohotel.it',
    notes: 'Small Luxury Hotels member', vibe: ['luxury', 'design'] },
  { name: 'Seven Rooms Villadorata', city: 'Noto', country: 'Italy', region: 'Sicily', type: 'boutique_hotel', tier: 1,
    website: 'https://sevenrooms.villadorata.com/en/', email: 'sevenrooms@villadorata.com',
    notes: 'Luxury baroque palace', vibe: ['luxury', 'historic'] },
  // MARSALA/TRAPANI
  { name: 'Caloma Sea Club', city: 'Erice', country: 'Italy', region: 'Sicily', type: 'beach_club', tier: 1,
    website: 'https://www.calomaseaclub.it/', instagram: '@calomaseaclub', notes: 'Nightlife + beach', vibe: ['nightlife', 'beach'] },
  { name: 'Isla Blanca Beach', city: 'Erice', country: 'Italy', region: 'Sicily', type: 'beach_club', tier: 2,
    website: 'https://islablancabeach.com/', instagram: '@isla_blanca_beach', notes: 'Skybar', vibe: ['skybar', 'beach'] },
  { name: 'Juparana', city: 'Marsala', country: 'Italy', region: 'Sicily', type: 'lounge_bar', tier: 2,
    website: 'https://www.juparana.it/', instagram: '@juparana3.0', email: 'juparanamarsala@gmail.com', vibe: ['lounge', 'cocktails'] },
  // PALERMO ROOFTOPS
  { name: 'Le Terrazze del Sole', city: 'Palermo', country: 'Italy', region: 'Sicily', type: 'rooftop_bar', tier: 1,
    website: 'https://www.leterrazzedelsole.it/?lang=en', instagram: '@leterrazzedelsolepalermo', vibe: ['rooftop', 'sunset'] },
  { name: 'Seven Restaurant', city: 'Palermo', country: 'Italy', region: 'Sicily', type: 'rooftop_bar', tier: 2,
    website: 'https://sevenrestaurantpalermo.it/en/', instagram: '@sevenrestaurantpalermo', vibe: ['rooftop', 'dining'] },
  { name: 'Villa Igiea Terrazza Bar', city: 'Palermo', country: 'Italy', region: 'Sicily', type: 'hotel_rooftop', tier: 1,
    website: 'https://www.roccofortehotels.com/hotels-and-resorts/villa-igiea/', instagram: '@villaigieapalermo',
    notes: 'Rocco Forte, historic', vibe: ['luxury', 'historic', 'rooftop'] },
];

// ═══════════════════════════════════════════════════════════════
// ITALY - BOLOGNA
// ═══════════════════════════════════════════════════════════════

export const BOLOGNA_VENUES: VenueData[] = [
  // Jazz Clubs
  { name: 'Cantina Bentivoglio', city: 'Bologna', country: 'Italy', type: 'jazz_club', tier: 1,
    website: 'https://www.cantinabentivoglio.it/jazz-club/', instagram: '@cantinabentivoglio',
    notes: '16th-century wine cellars, live jazz 6 nights/week', vibe: ['jazz', 'historic', 'wine'] },
  { name: 'Camera Jazz & Music Club', city: 'Bologna', country: 'Italy', type: 'jazz_club', tier: 1,
    website: 'https://camerajazzclub.com/en/', instagram: '@camerajazzmusicclub', email: 'info@camerajazzclub.com',
    notes: 'Palazzo Isolani, Bologna Jazz Festival', vibe: ['jazz', 'historic'] },
  { name: 'Bravo Caffe', city: 'Bologna', country: 'Italy', type: 'music_venue', tier: 1,
    website: 'https://bravocaffe.it/', email: 'info@bravocaffe.it',
    notes: '30 years, eclectic live music', vibe: ['eclectic', 'live_music'] },
  // Live Music Venues
  { name: 'Locomotiv Club', city: 'Bologna', country: 'Italy', type: 'music_venue', tier: 2,
    website: 'https://www.locomotivclub.it/', email: 'info@locomotivclub.it',
    notes: 'World music, jazz, indie', vibe: ['world_music', 'alternative'] },
  { name: 'Estragon Club', city: 'Bologna', country: 'Italy', type: 'concert_venue', tier: 2,
    website: 'https://www.estragon.it/en/', email: 'lele@estragon.it',
    notes: '30+ years, rock & world music', vibe: ['rock', 'world_music'] },
  // Rooftops
  { name: 'Hotel Metropolitan Roof Garden', city: 'Bologna', country: 'Italy', type: 'rooftop_bar', tier: 1,
    website: 'https://www.hotelmetropolitan.com/en/', email: 'booking@hotelmetropolitan.com',
    notes: '5th floor, San Luca views', vibe: ['rooftop', 'romantic'] },
  { name: 'Terrazza Mattuiani', city: 'Bologna', country: 'Italy', type: 'rooftop_bar', tier: 2,
    website: 'https://terrazzamattuiani.it/en/home-page/', email: 'hoteltouring@hoteltouring.it',
    notes: 'Hotel Touring, May-September', vibe: ['rooftop', 'seasonal'] },
  { name: 'Torre Prendiparte', city: 'Bologna', country: 'Italy', type: 'event_venue', tier: 1,
    website: 'https://prendiparte.it/en/home-eng/', notes: '12th-century tower, private events', vibe: ['medieval', 'unique', 'events'] },
  // Boutique Hotels
  { name: 'I Portici Hotel', city: 'Bologna', country: 'Italy', type: 'boutique_hotel', tier: 1,
    website: 'https://www.iporticihotel.com/?lang=en', email: 'reservation@iporticihotel.com',
    notes: 'Michelin restaurant, Listening Dinner live music', vibe: ['michelin', 'live_music'] },
  { name: 'Osteria del Sole', city: 'Bologna', country: 'Italy', type: 'wine_bar', tier: 2,
    website: 'https://www.osteriadelsole.it/en/', notes: 'Est. 1465, oldest osteria in Italy', vibe: ['historic', 'authentic'] },
];

// ═══════════════════════════════════════════════════════════════
// ITALY - NAPLES & AMALFI
// ═══════════════════════════════════════════════════════════════

export const NAPLES_AMALFI_VENUES: VenueData[] = [
  // Naples Rooftops
  { name: 'Riserva Rooftop', city: 'Naples', country: 'Italy', region: 'Posillipo', type: 'rooftop_bar', tier: 1,
    website: 'https://riservarooftop.com/', instagram: '@riserva.rooftop',
    notes: 'Sky Lounge Martini, bay views', vibe: ['luxury', 'panoramic'] },
  { name: 'Grand Hotel Parkers Bidder Bar', city: 'Naples', country: 'Italy', region: 'Chiaia', type: 'hotel_bar', tier: 1,
    website: 'https://en.grandhotelparkers.it/', email: 'info@grandhotelparkers.it',
    notes: 'Historic 5-star, official Bond bar, piano bar', vibe: ['historic', 'luxury', 'piano'] },
  { name: 'Romeo Hotel La Terrazza', city: 'Naples', country: 'Italy', type: 'rooftop_bar', tier: 1,
    website: 'https://theromeocollection.com/en/romeo-napoli/', email: 'info@romeohotel.it',
    notes: 'Kenzo Tange design, infinity pool 10th floor', vibe: ['design', 'pool', 'exclusive'] },
  { name: 'Palazzo Petrucci / Il Malandrino', city: 'Naples', country: 'Italy', region: 'Posillipo', type: 'rooftop_bar', tier: 1,
    website: 'https://palazzopetrucci.it/', instagram: '@palazzo_petrucci',
    notes: 'Michelin star, cocktail bar with Capri views', vibe: ['michelin', 'cocktails', 'views'] },
  // Naples Jazz
  { name: 'Bourbon Street Jazz Club', city: 'Naples', country: 'Italy', type: 'jazz_club', tier: 1,
    website: 'https://www.bourbonstreetjazzclub.com/', instagram: '@bourbonstreetnap', email: 'drjazz@bourbonstreetclub.it',
    notes: 'Premier jazz, international artists', vibe: ['jazz', 'international'] },
  { name: 'Sala Santa Cecilia', city: 'Naples', country: 'Italy', type: 'jazz_club', tier: 2,
    website: 'https://www.salasantacecilia.it/', instagram: '@salasantacecilia',
    notes: 'Jazz, bossa nova, magical acoustics', vibe: ['jazz', 'bossa_nova', 'intimate'] },
  { name: 'Lanificio 25', city: 'Naples', country: 'Italy', type: 'cultural_venue', tier: 2,
    website: 'http://lanificio25.it', instagram: '@lanificio25',
    notes: 'Former wool factory, live music, art', vibe: ['alternative', 'art', 'live_music'] },
  // Amalfi Beach Clubs
  { name: 'Music on the Rocks', city: 'Positano', country: 'Italy', region: 'Amalfi', type: 'beach_club', tier: 1,
    website: 'https://musicontherocks.it/', instagram: '@musicontherocksofficial', email: 'info@musicontherocks.it',
    notes: '40 years, cliff-cave nightclub, legendary', vibe: ['legendary', 'electronic', 'cave'] },
  { name: 'One Fire Beach Club', city: 'Praiano', country: 'Italy', region: 'Amalfi', type: 'beach_club', tier: 1,
    website: 'https://www.onefirebeach.com', instagram: '@onefirebeach',
    notes: 'Only sunset views on Amalfi, DJ sets', vibe: ['sunset', 'exclusive', 'dj'] },
  { name: 'La Scogliera Beach Club', city: 'Positano', country: 'Italy', region: 'Amalfi', type: 'beach_club', tier: 1,
    website: 'https://lascoglierapositano.com/en/', instagram: '@lascoglierapositano', email: 'info@lascoglierapositano.com',
    notes: 'Li Galli Islands view, lounge bar at sunset', vibe: ['sunset', 'lounge', 'romantic'] },
  { name: 'Conca del Sogno', city: 'Nerano', country: 'Italy', region: 'Amalfi', type: 'beach_club', tier: 1,
    website: 'https://www.concadelsogno.it/', instagram: '@concadelsogno', email: 'events@concadelsogno.it',
    notes: 'Famous for spaghetti zucchine, afternoon music', vibe: ['gastronomic', 'music', 'romantic'] },
  // Amalfi Hotels
  { name: 'Hotel Miramalfi', city: 'Amalfi', country: 'Italy', region: 'Amalfi', type: 'boutique_hotel', tier: 1,
    website: 'https://www.miramalfi.com', instagram: '@hotelmiramalfi',
    notes: 'SLH, weekly live music dinners July-Sept', vibe: ['slh', 'live_music'] },
  { name: 'Ravello Festival / Villa Rufolo', city: 'Ravello', country: 'Italy', region: 'Amalfi', type: 'festival_venue', tier: 1,
    website: 'https://ravellofestival.info/', email: 'info@fondazioneravello.it',
    notes: '73rd edition, cliff-top amphitheater', vibe: ['festival', 'classical', 'world_music'] },
  { name: 'Arenile di Bagnoli', city: 'Naples', country: 'Italy', type: 'beach_club', tier: 2,
    website: 'http://www.areniledibagnoli.it', instagram: '@areniledibagnoli',
    notes: 'Since 1994, international DJs, year-round', vibe: ['electronic', 'festival'] },
];

// ═══════════════════════════════════════════════════════════════
// FRANCE - PARIS
// ═══════════════════════════════════════════════════════════════

export const PARIS_VENUES: VenueData[] = [
  // Rooftops
  { name: 'Terrass Hotel Rooftop', city: 'Paris', country: 'France', region: 'Montmartre', type: 'rooftop_bar', tier: 1,
    website: 'https://en.terrass-hotel.com', instagram: '@terrasshotel',
    notes: '360° views, Eiffel Tower, live DJ & bands', vibe: ['panoramic', 'live_music'] },
  { name: 'Zoku Paris Rooftop', city: 'Paris', country: 'France', type: 'rooftop_bar', tier: 2,
    website: 'https://livezoku.com/paris/events/', notes: 'Apero Live Music every Thursday', vibe: ['live_music', 'weekly'] },
  // Jazz & World Music
  { name: 'Sunset Sunside', city: 'Paris', country: 'France', type: 'jazz_club', tier: 1,
    website: 'https://www.sunset-sunside.com/', notes: 'Sunset level = WORLD MUSIC', vibe: ['jazz', 'world_music'] },
  { name: 'Le Baiser Sale', city: 'Paris', country: 'France', type: 'world_music_club', tier: 1,
    website: 'https://lebaisersale.pixeine.fr/en', notes: 'Afro-jazz, world music since 1984, Angelique Kidjo etc', vibe: ['world_music', 'afro_jazz'] },
  { name: '38 Riv Jazz Club', city: 'Paris', country: 'France', region: 'Marais', type: 'jazz_club', tier: 1,
    website: 'https://38riv.com/en', instagram: '@38riv', email: 'contact@38riv.com',
    notes: '12th-century cellar, Latin/Brazilian/jazz, artist booking form available', vibe: ['jazz', 'latin', 'historic'] },
  { name: 'Duc des Lombards', city: 'Paris', country: 'France', type: 'jazz_club', tier: 1,
    website: 'https://ducdeslombards.com', instagram: '@ducdeslombards', notes: 'Free jam sessions Fri-Sat', vibe: ['jazz', 'jam'] },
  { name: 'New Morning', city: 'Paris', country: 'France', type: 'jazz_venue', tier: 1,
    notes: 'Since 1981, 450-600 capacity, world music', vibe: ['jazz', 'world_music', 'legendary'] },
  // Cultural Venues
  { name: 'Le Comptoir General', city: 'Paris', country: 'France', region: 'Canal Saint-Martin', type: 'cultural_venue', tier: 1,
    website: 'https://lecomptoirgeneral.com/en/', notes: '600m2, African/Caribbean culture, world music', vibe: ['world_music', 'african', 'caribbean'] },
  { name: 'Point Ephemere', city: 'Paris', country: 'France', region: 'Canal Saint-Martin', type: 'cultural_venue', tier: 2,
    website: 'https://www.pointephemere.org/', email: 'communication@pointephemere.org',
    notes: 'Indie, alternative, experimental', vibe: ['alternative', 'experimental'] },
  { name: 'La Bellevilloise', city: 'Paris', country: 'France', type: 'cultural_venue', tier: 1,
    website: 'https://www.labellevilloise.com/', instagram: '@labellevilloise',
    notes: '2500m2, afro/cumbia/electro, Sunday jazz brunch, rooftop', vibe: ['eclectic', 'afro', 'rooftop'] },
  { name: 'La Petite Halle', city: 'Paris', country: 'France', region: 'La Villette', type: 'music_venue', tier: 2,
    website: 'https://www.lapetitehalle.com/', instagram: '@lapetitehalle', email: 'directeur@lapetitehalle.com',
    notes: 'Eclectic jazz-based, up to 300 private', vibe: ['jazz', 'fusion', 'eclectic'] },
  // Boutique Hotels
  { name: 'Hotel Amour', city: 'Paris', country: 'France', region: 'Pigalle', type: 'boutique_hotel', tier: 1,
    website: 'https://hotelamourparis.fr/en/', instagram: '@hotelsamourparis',
    notes: 'Speakeasy nights, DJ sets, film screenings', vibe: ['artistic', 'events', 'nightlife'] },
  { name: 'Le Citizen Hotel', city: 'Paris', country: 'France', region: 'Canal Saint-Martin', type: 'boutique_hotel', tier: 2,
    website: 'https://lecitizenhotel.com/en/', notes: 'Only hotel on Canal, privatization available', vibe: ['design', 'canal'] },
];

// ═══════════════════════════════════════════════════════════════
// FRANCE - STRASBOURG
// ═══════════════════════════════════════════════════════════════

export const STRASBOURG_VENUES: VenueData[] = [
  // Rooftops
  { name: 'L\'Archipel Skylounge', city: 'Strasbourg', country: 'France', type: 'rooftop_bar', tier: 1,
    website: 'https://larchipelstrasbourg.com/', instagram: '@larchipel_strasbourg',
    notes: '10th floor, cathedral views, privatization available', vibe: ['panoramic', 'elegant'] },
  { name: 'Blue Flamingo', city: 'Strasbourg', country: 'France', type: 'floating_restaurant', tier: 1,
    website: 'https://www.blue-flamingo.fr/', email: 'contact@blue-flamingo.fr',
    notes: 'Floating, Michelin-selected, rooftop May-Sept', vibe: ['unique', 'michelin', 'waterside'] },
  { name: 'Karmen Camina', city: 'Strasbourg', country: 'France', type: 'cultural_venue', tier: 1,
    website: 'http://karmen-camina.eu/', instagram: '@karmen.camina',
    notes: 'Former tobacco factory, 500 cap, concerts Fri-Sat', vibe: ['cultural', 'concerts', 'rooftop'] },
  // Music Venues
  { name: 'Jazzdor', city: 'Strasbourg', country: 'France', type: 'jazz_venue', tier: 1,
    website: 'https://jazzdor.com/', instagram: '@jazzdor', email: 'info@jazzdor.com',
    notes: 'SMAC, European jazz, festivals in Strasbourg & Berlin', vibe: ['jazz', 'european', 'festivals'] },
  { name: 'Espace Django', city: 'Strasbourg', country: 'France', type: 'music_venue', tier: 2,
    website: 'https://www.espacedjango.eu/', email: 'contact@espacedjango.eu',
    notes: 'Named after Django Reinhardt, contemporary music', vibe: ['gypsy_jazz', 'contemporary'] },
  { name: 'La Laiterie', city: 'Strasbourg', country: 'France', type: 'concert_venue', tier: 2,
    notes: '900 capacity, 150+ events/year, world music', vibe: ['concert', 'world_music'] },
  { name: 'Les Savons d\'Helene', city: 'Strasbourg', country: 'France', type: 'music_venue', tier: 2,
    website: 'https://www.lessavonsdhelene.fr/', instagram: '@lessavonsdhelene', email: 'contact@savonsdhelene.fr',
    notes: 'Jazz & world music focus, 100 seated', vibe: ['jazz', 'world_music', 'intimate'] },
  { name: 'L\'Artichaut', city: 'Strasbourg', country: 'France', region: 'Petite France', type: 'music_bar', tier: 3,
    instagram: '@lartichautgrandrue', notes: 'Jazz jam every Thursday', vibe: ['jazz', 'jam', 'casual'] },
  // Hotels
  { name: 'BOMA Easy Living Hotel', city: 'Strasbourg', country: 'France', type: 'boutique_hotel', tier: 2,
    website: 'https://www.boma-hotel.com/en/', email: 'seminaire@boma-hotel.com',
    notes: 'Regular live musicians, DJ sets', vibe: ['live_music', 'modern'] },
  { name: 'Hotel Regent Petite France', city: 'Strasbourg', country: 'France', region: 'Petite France', type: 'luxury_hotel', tier: 1,
    website: 'https://regent-petite-france.com/', email: 'seminaire@regent-petite-france.com',
    notes: '17th-century mill, champagne bar, 5 event spaces', vibe: ['luxury', 'historic', 'events'] },
  { name: 'Cour du Corbeau', city: 'Strasbourg', country: 'France', type: 'boutique_hotel', tier: 1,
    website: 'https://www.cour-corbeau.com/en/', email: 'info@cour-corbeau.com',
    notes: 'Est. 1528, one of Europe\'s oldest hotels', vibe: ['historic', 'intimate'] },
];

// ═══════════════════════════════════════════════════════════════
// UAE (Dubai, Abu Dhabi) - Premium sunset/beach club market
// ═══════════════════════════════════════════════════════════════

export const UAE_VENUES: VenueData[] = [
  // DUBAI - Beach Clubs
  { name: 'Zero Gravity', city: 'Dubai', country: 'UAE', type: 'beach_club', tier: 1,
    website: 'https://www.0-gravity.ae/', instagram: '@zeaborogravitydubai',
    notes: 'Beachfront with pool, international DJs, organic house events', vibe: ['sunset', 'electronic', 'pool'] },
  { name: 'Barasti Beach', city: 'Dubai', country: 'UAE', type: 'beach_club', tier: 2,
    website: 'https://www.barastibeach.com/', instagram: '@barastibeach',
    notes: 'Le Meridien, casual vibes, live music', vibe: ['casual', 'live_music'] },
  { name: 'Twiggy by La Cantine', city: 'Dubai', country: 'UAE', type: 'beach_club', tier: 1,
    website: 'https://www.twiggy.ae/', instagram: '@twiggydubai',
    notes: 'Park Hyatt, French Riviera style, sunset sessions', vibe: ['chic', 'sunset', 'organic'] },
  { name: 'Nikki Beach Dubai', city: 'Dubai', country: 'UAE', type: 'beach_club', tier: 2,
    website: 'https://dubai.nikkibeach.com/', instagram: '@nikkibeachdubai',
    notes: 'Pearl Jumeira, party focused', vibe: ['party', 'luxury'] },
  { name: 'Drift Beach Dubai', city: 'Dubai', country: 'UAE', type: 'beach_club', tier: 1,
    website: 'https://www.driftbeachdubai.com/', instagram: '@driftbeachdubai',
    notes: 'One&Only, Mediterranean vibes, elegant', vibe: ['luxury', 'elegant', 'sunset'] },
  // DUBAI - Rooftop Bars
  { name: 'At.mosphere', city: 'Dubai', country: 'UAE', type: 'rooftop_bar', tier: 1,
    website: 'https://www.atmosphereburjkhalifa.com/', instagram: '@atmosphereburjkhalifa',
    notes: 'Burj Khalifa 122nd floor, highest bar in the world', vibe: ['iconic', 'luxury', 'views'] },
  { name: 'Skyview Bar', city: 'Dubai', country: 'UAE', type: 'rooftop_bar', tier: 1,
    website: 'https://www.jumeirah.com/', instagram: '@burjalarab',
    notes: 'Burj Al Arab, live entertainment', vibe: ['luxury', 'live_music', 'iconic'] },
  { name: 'Ce La Vi Dubai', city: 'Dubai', country: 'UAE', type: 'rooftop_bar', tier: 1,
    website: 'https://www.celavi.com/dubai/', instagram: '@celavidubai',
    notes: 'Address Sky View, 54th floor, DJ sets', vibe: ['panoramic', 'electronic', 'sunset'] },
  { name: 'Iris Dubai', city: 'Dubai', country: 'UAE', type: 'rooftop_bar', tier: 2,
    website: 'https://www.irisdubai.com/', instagram: '@irisdubai',
    notes: 'Oberoi Hotel, live acoustic music Thursdays', vibe: ['cocktails', 'acoustic', 'intimate'] },
  // DUBAI - Wellness
  { name: 'Talise Spa Madinat', city: 'Dubai', country: 'UAE', type: 'spa_hotel', tier: 1,
    website: 'https://www.jumeirah.com/en/hotels-resorts/dubai/madinat-jumeirah/', instagram: '@madinatjumeirah',
    notes: 'Jumeirah, sound healing sessions, wellness events', vibe: ['wellness', 'spa', 'healing'] },
  { name: 'One&Only The Palm', city: 'Dubai', country: 'UAE', type: 'wellness_resort', tier: 1,
    website: 'https://www.oneandonlyresorts.com/the-palm', instagram: '@oaboroanderesonlythepalm',
    notes: 'Guerlain spa, sunset yoga, organic dining', vibe: ['luxury', 'wellness', 'organic'] },
  // ABU DHABI - Beach Clubs
  { name: 'Soul Beach', city: 'Abu Dhabi', country: 'UAE', type: 'beach_club', tier: 1,
    website: 'https://www.soulbeach.ae/', instagram: '@soulbeachad',
    notes: 'Saadiyat Island, organic vibes, sunset DJ sets', vibe: ['organic', 'sunset', 'wellness'] },
  { name: 'Saadiyat Beach Club', city: 'Abu Dhabi', country: 'UAE', type: 'beach_club', tier: 1,
    website: 'https://www.saadiyatbeachclub.ae/', instagram: '@saadiyatbeachclub',
    notes: 'Premium beach club, live entertainment', vibe: ['luxury', 'sunset', 'elegant'] },
  { name: 'Yas Beach', city: 'Abu Dhabi', country: 'UAE', type: 'beach_club', tier: 2,
    website: 'https://www.yasbeach.ae/', instagram: '@yasbeach',
    notes: 'Yas Island, casual vibes', vibe: ['casual', 'beach'] },
  // ABU DHABI - Rooftops & Lounges
  { name: 'Buddha Bar Beach', city: 'Abu Dhabi', country: 'UAE', type: 'beach_lounge', tier: 1,
    website: 'https://www.buddhabarbeach.com/', instagram: '@buddhabarbeachad',
    notes: 'St Regis Saadiyat, PERFECT for Flutur style - Buddha Bar vibe!', vibe: ['organic', 'lounge', 'sunset'] },
  { name: 'Ray\'s Bar', city: 'Abu Dhabi', country: 'UAE', type: 'rooftop_bar', tier: 1,
    website: 'https://www.jumeirah.com/', instagram: '@jumeirahatthetihad',
    notes: 'Jumeirah at Etihad Towers, 62nd floor', vibe: ['panoramic', 'cocktails', 'sunset'] },
  // ABU DHABI - Cultural Venues
  { name: 'Louvre Abu Dhabi', city: 'Abu Dhabi', country: 'UAE', type: 'cultural_venue', tier: 1,
    website: 'https://www.louvreabudhabi.ae/', instagram: '@loaboruvreabudhabi',
    notes: 'Jean Nouvel design, hosts concerts and cultural events', vibe: ['cultural', 'world_class', 'events'] },
  { name: 'Manarat Al Saadiyat', city: 'Abu Dhabi', country: 'UAE', type: 'cultural_venue', tier: 2,
    website: 'https://manaratalsaadiyat.ae/', instagram: '@manaratalsaadiyat',
    notes: 'Arts center, hosts live music and performances', vibe: ['arts', 'events', 'cultural'] },
];

// ═══════════════════════════════════════════════════════════════
// MOROCCO - Marrakech & Essaouira
// ═══════════════════════════════════════════════════════════════

export const MOROCCO_VENUES: VenueData[] = [
  // MARRAKECH - Rooftops
  { name: 'Cafe Arabe', city: 'Marrakech', country: 'Morocco', type: 'rooftop_bar', tier: 1,
    website: 'https://cafearabe.com/', instagram: '@cafearabe',
    notes: 'Medina rooftop, live music, fusion cuisine', vibe: ['rooftop', 'live_music', 'fusion'] },
  { name: 'Nomad', city: 'Marrakech', country: 'Morocco', type: 'rooftop_bar', tier: 1,
    website: 'https://nomadmarrakech.com/', instagram: '@nomadmarrakech',
    notes: 'Modern Moroccan, live DJs weekends', vibe: ['modern', 'dj', 'views'] },
  { name: 'Le Salama', city: 'Marrakech', country: 'Morocco', type: 'rooftop_bar', tier: 2,
    website: 'https://lesalama.com/', instagram: '@le_salama',
    notes: 'Jemaa el-Fna views, oriental fusion', vibe: ['oriental', 'views', 'cocktails'] },
  // MARRAKECH - Hotels & Riads
  { name: 'La Mamounia', city: 'Marrakech', country: 'Morocco', type: 'luxury_hotel', tier: 1,
    website: 'https://www.mamounia.com/', instagram: '@lamamounia',
    notes: 'Legendary palace hotel, Winston Churchill favorite, live music', vibe: ['legendary', 'luxury', 'events'] },
  { name: 'Royal Mansour', city: 'Marrakech', country: 'Morocco', type: 'luxury_hotel', tier: 1,
    website: 'https://www.royalmansour.com/', instagram: '@royalmansour',
    notes: 'King\'s guesthouse, most exclusive hotel in Morocco', vibe: ['exclusive', 'luxury', 'spa'] },
  { name: 'El Fenn', city: 'Marrakech', country: 'Morocco', type: 'boutique_hotel', tier: 1,
    website: 'https://el-fenn.com/', instagram: '@elfennmarrakech',
    notes: 'Boutique riad, rooftop pool, art collection, events', vibe: ['boutique', 'art', 'events'] },
  { name: 'Riad Dar Anika', city: 'Marrakech', country: 'Morocco', type: 'boutique_hotel', tier: 2,
    instagram: '@riaddaranika', notes: 'Intimate riad, private events', vibe: ['intimate', 'traditional'] },
  // MARRAKECH - Clubs & Venues
  { name: 'Oasis Festival Area', city: 'Marrakech', country: 'Morocco', type: 'festival', tier: 1,
    website: 'https://theoasisfest.com/', instagram: '@oaborasisfest',
    notes: 'Electronic music festival, organic house stage', vibe: ['festival', 'electronic', 'organic_house'] },
  { name: 'Comptoir Darna', city: 'Marrakech', country: 'Morocco', type: 'restaurant_club', tier: 2,
    website: 'https://comptoirmarrakech.com/', instagram: '@comptoirdarna',
    notes: 'Belly dancing, live entertainment, dinner shows', vibe: ['entertainment', 'dinner_show'] },
  // ESSAOUIRA - Chill & Wellness
  { name: 'Taros Cafe', city: 'Essaouira', country: 'Morocco', type: 'rooftop_bar', tier: 1,
    website: 'https://taroscafe.com/', instagram: '@taroscafe',
    notes: 'Live gnawa music, ocean views, sunset', vibe: ['gnawa', 'sunset', 'world_music'] },
  { name: 'Heure Bleue Palais', city: 'Essaouira', country: 'Morocco', type: 'boutique_hotel', tier: 1,
    website: 'https://heure-bleue.com/', instagram: '@heurebleue',
    notes: 'Relais & Chateaux, rooftop pool, intimate events', vibe: ['luxury', 'rooftop', 'intimate'] },
  { name: 'Villa Quieta', city: 'Essaouira', country: 'Morocco', type: 'wellness_retreat', tier: 2,
    notes: 'Yoga retreat, sound healing friendly', vibe: ['yoga', 'wellness', 'retreat'] },
  // GNAWA FESTIVAL
  { name: 'Gnaoua World Music Festival', city: 'Essaouira', country: 'Morocco', type: 'festival', tier: 1,
    website: 'https://www.festival-gnaoua.net/', instagram: '@gnaouafest',
    notes: 'World music festival, perfect for RAV/world fusion', vibe: ['world_music', 'gnawa', 'festival'] },
];

// ═══════════════════════════════════════════════════════════════
// ALL VENUES COMBINED
// ═══════════════════════════════════════════════════════════════

export const ALL_VENUES: VenueData[] = [
  ...PORTUGAL_VENUES,
  ...MADEIRA_VENUES,
  ...CANARY_VENUES,
  ...IBIZA_VENUES,
  ...GREECE_VENUES,
  ...ITALY_VENUES,
  ...ITALY_CENTRAL_VENUES,
  ...ITALY_SOUTH_VENUES,
  ...SICILY_EXTENDED_VENUES,
  ...BOLOGNA_VENUES,
  ...NAPLES_AMALFI_VENUES,
  ...ALBANIA_VENUES,
  ...CROATIA_VENUES,
  ...FRANCE_VENUES,
  ...PARIS_VENUES,
  ...STRASBOURG_VENUES,
  ...USA_VENUES,
  ...UAE_VENUES,
  ...MOROCCO_VENUES,
];

/**
 * Import all venues into SurrealDB
 */
export async function importVenuesToDb(db: any) {
  console.log('🏢 Importing venues to database...');

  for (const venue of ALL_VENUES) {
    await db.create('venue', {
      name: venue.name,
      type: venue.type,
      location: venue.city,
      country: venue.country,
      contact_email: venue.email || '',
      website: venue.website || '',
      instagram: venue.instagram || '',
      status: 'prospect',
      tier: venue.tier,
      notes: venue.notes || '',
      region: venue.region || '',
      vibe: venue.vibe || [],
    });
  }

  console.log(`  ✅ Imported ${ALL_VENUES.length} venues`);
  console.log(`     - Portugal: ${PORTUGAL_VENUES.length}`);
  console.log(`     - Madeira: ${MADEIRA_VENUES.length}`);
  console.log(`     - Canary Islands: ${CANARY_VENUES.length}`);
  console.log(`     - Ibiza: ${IBIZA_VENUES.length}`);
  console.log(`     - Greece: ${GREECE_VENUES.length}`);
  console.log(`     - Italy Core: ${ITALY_VENUES.length}`);
  console.log(`     - Italy Central (Umbria/Marche/Abruzzo): ${ITALY_CENTRAL_VENUES.length}`);
  console.log(`     - Italy South (Calabria/Basilicata): ${ITALY_SOUTH_VENUES.length}`);
  console.log(`     - Sicily Extended: ${SICILY_EXTENDED_VENUES.length}`);
  console.log(`     - Bologna: ${BOLOGNA_VENUES.length}`);
  console.log(`     - Naples/Amalfi: ${NAPLES_AMALFI_VENUES.length}`);
  console.log(`     - Albania: ${ALBANIA_VENUES.length}`);
  console.log(`     - Croatia: ${CROATIA_VENUES.length}`);
  console.log(`     - France Riviera: ${FRANCE_VENUES.length}`);
  console.log(`     - Paris: ${PARIS_VENUES.length}`);
  console.log(`     - Strasbourg: ${STRASBOURG_VENUES.length}`);
  console.log(`     - USA: ${USA_VENUES.length}`);
}

/**
 * Import booking agents into SurrealDB
 */
export async function importBookingAgentsToDb(db: any) {
  console.log('🎫 Importing booking agents to database...');

  // First ensure the booking_agent table exists
  await db.query(`
    DEFINE TABLE IF NOT EXISTS booking_agent SCHEMAFULL;
    DEFINE FIELD name ON booking_agent TYPE string;
    DEFINE FIELD agency ON booking_agent TYPE option<string>;
    DEFINE FIELD location ON booking_agent TYPE string;
    DEFINE FIELD specializes_in ON booking_agent TYPE array DEFAULT [];
    DEFINE FIELD website ON booking_agent TYPE option<string>;
    DEFINE FIELD email ON booking_agent TYPE option<string>;
    DEFINE FIELD notes ON booking_agent TYPE option<string>;
    DEFINE FIELD tier ON booking_agent TYPE int DEFAULT 2;
    DEFINE FIELD status ON booking_agent TYPE string DEFAULT "prospect";
    DEFINE FIELD created_at ON booking_agent TYPE datetime DEFAULT time::now();
  `);

  for (const agent of USA_BOOKING_AGENTS) {
    await db.create('booking_agent', {
      name: agent.name,
      agency: agent.agency || '',
      location: agent.location,
      specializes_in: agent.specializes_in,
      website: agent.website || '',
      email: agent.email || '',
      notes: agent.notes || '',
      tier: agent.tier,
      status: 'prospect',
    });
  }

  console.log(`  ✅ Imported ${USA_BOOKING_AGENTS.length} booking agents`);
}

/**
 * Get venues by tier
 */
export function getVenuesByTier(tier: number): VenueData[] {
  return ALL_VENUES.filter(v => v.tier === tier);
}

/**
 * Get venues by country
 */
export function getVenuesByCountry(country: string): VenueData[] {
  return ALL_VENUES.filter(v => v.country.toLowerCase() === country.toLowerCase());
}

/**
 * Get venues by vibe
 */
export function getVenuesByVibe(vibe: string): VenueData[] {
  return ALL_VENUES.filter(v => v.vibe?.includes(vibe));
}
