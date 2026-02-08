-- =====================================================
-- NEW VENUES MIGRATION - 2026-01-21
-- Research findings: Achievable venues NOT in database
-- Focus: Phase 1-2 (cold email friendly, owner-operated)
-- =====================================================

-- RHODES (RODOS), GREECE - New Territory
CREATE venue SET
  name = "Double Deuce Live Stage",
  type = "live_music_venue",
  location = "Ialysos",
  country = "Greece",
  region = "Rhodes",
  tier = 2,
  vibe = ["live_music", "world_music", "free_entry"],
  notes = "Free entry, live bands nightly (9pm), world music friendly. House band IZZY DIZZY tours Europe.";

CREATE venue SET
  name = "Oasis Beach Bar",
  type = "sunset_bar",
  location = "Rhodes",
  country = "Greece",
  region = "Rhodes",
  tier = 2,
  vibe = ["cave", "sunset", "intimate", "dj"],
  notes = "Cave setting with bar inside, DJ at sunset. Small rocky beach. Intimate atmosphere.";

CREATE venue SET
  name = "Shimba's Beach Bar",
  type = "beach_bar",
  location = "Kiotari",
  country = "Greece",
  region = "Rhodes",
  tier = 2,
  vibe = ["bohemian", "world_music", "organic", "authentic"],
  notes = "Southern Rhodes. 'Music from around the world', guest DJs/bands, organic cocktails, exotic atmosphere.";

CREATE venue SET
  name = "Ronda Beach Bar",
  type = "ambient_lounge",
  location = "Rhodes Town",
  country = "Greece",
  region = "Rhodes",
  tier = 3,
  vibe = ["minimalist", "ambient", "serene"],
  notes = "Minimalist design, ambient lighting, serene environment by the beach.";

-- RHODES - Rooftops & Acropolis Views
CREATE venue SET
  name = "The Courtyard Bar",
  type = "rooftop_bar",
  location = "Lindos",
  country = "Greece",
  region = "Rhodes",
  tier = 2,
  vibe = ["acropolis_view", "live_music", "greek_night", "bouzouki"],
  notes = "2 rooftops with best Acropolis view. Greek dancing + Bouzouki on Sunday. DJ twice weekly.";

CREATE venue SET
  name = "Cozze Champagne Rooftop",
  type = "rooftop_bar",
  location = "Rhodes Town",
  country = "Greece",
  region = "Rhodes",
  tier = 2,
  vibe = ["acropolis_view", "ambient", "jazz", "dj", "romantic"],
  notes = "Stunning Acropolis views. DJ ambient tunes, romantic jazz music. Premium cocktails.";

CREATE venue SET
  name = "L'Éternel French Bar",
  type = "rooftop_bar",
  location = "Rhodes Old Town",
  country = "Greece",
  region = "Rhodes",
  tier = 2,
  vibe = ["rooftop", "wine", "cocktails", "french", "chic"],
  notes = "Stylish wine/cocktail bar with rooftop terrace overlooking Old Town. Swing chairs.";

CREATE venue SET
  name = "Astra Live",
  type = "live_music_venue",
  location = "Rhodes",
  country = "Greece",
  region = "Rhodes",
  tier = 2,
  vibe = ["greek_music", "bouzouki", "live", "traditional"],
  notes = "Authentic Greek rhythms, talented performers with bouzouki. Dance till dawn.";

-- BERLIN - Listening Bars (Perfect for ambient/world music)
CREATE venue SET
  name = "KM28",
  type = "listening_bar",
  location = "Neukölln",
  country = "Germany",
  region = "Berlin",
  tier = 2,
  vibe = ["volunteer", "intimate", "dedicated_crowd"],
  notes = "Donation-based, 2-3 concerts/week, Reuterkiez neighbourhood. Dedicated music lovers. Walking distance from Hermannplatz.";

CREATE venue SET
  name = "Morphine",
  type = "experimental_venue",
  location = "Kreuzberg",
  country = "Germany",
  region = "Berlin",
  tier = 2,
  vibe = ["studio_loft", "experimental", "electronic", "improvised"],
  notes = "Industrial studio loft run by Rabih Beaini. Small concerts in experimental/electronic/improvised music. Hidden gem.";

CREATE venue SET
  name = "Bar Neiro",
  type = "listening_bar",
  location = "Berlin",
  country = "Germany",
  region = "Berlin",
  tier = 2,
  website = "https://barneiro.com",
  vibe = ["vinyl", "intimate", "japanese_inspired", "hi_fi"],
  notes = "Vinyl-only listening bar, Japanese kissas inspired, LPs played front to back. Factory building backyard.";

CREATE venue SET
  name = "Prachtwerk",
  type = "music_venue",
  location = "Neukölln",
  country = "Germany",
  region = "Berlin",
  tier = 2,
  contact_email = "info@prachtwerkberlin.com",
  vibe = ["folk", "acoustic", "world_music"],
  notes = "~200 capacity, fantastic for folk/acoustic/world music. North of Neukölln, near Karl-Marx-Strasse.";

CREATE venue SET
  name = "donau115",
  type = "jazz_bar",
  location = "Neukölln",
  country = "Germany",
  region = "Berlin",
  tier = 2,
  vibe = ["jazz", "intimate", "donation"],
  notes = "Neighborhood jazz bar, Tue-Sat live music, €10-20 donation entry. Show up early. Sometimes improv/free jazz nights.";

-- DUBAI & ABU DHABI - Achievable Lounges
CREATE venue SET
  name = "Q's Bar & Lounge",
  type = "jazz_lounge",
  location = "Dubai",
  country = "UAE",
  region = "Dubai",
  tier = 2,
  vibe = ["jazz", "intimate", "quincy_jones", "luxury"],
  notes = "Palazzo Versace Dubai. Quincy Jones-curated program, intimate setting, plush leather, Versace decor.";

CREATE venue SET
  name = "The Fridge",
  type = "indie_venue",
  location = "Dubai",
  country = "UAE",
  region = "Dubai",
  tier = 2,
  vibe = ["indie", "chamber", "experimental", "warehouse"],
  notes = "Converted warehouse, indie/chamber/experimental. Raw intimate setting. Serious music lovers.";

CREATE venue SET
  name = "Ash & Oak",
  type = "jazz_lounge",
  location = "Abu Dhabi",
  country = "UAE",
  region = "Abu Dhabi",
  tier = 2,
  vibe = ["jazz", "acoustic", "intimate", "cigar_lounge"],
  notes = "New 2025. Marriott Al Forsan. Intimate acoustic performances, singer moves between tables. Moody atmosphere.";

CREATE venue SET
  name = "1920",
  type = "live_music_bar",
  location = "DIFC",
  country = "UAE",
  region = "Dubai",
  tier = 3,
  vibe = ["prohibition_era", "live_music", "vinyl_dj"],
  notes = "Live music every night, traditional bands to vinyl DJs. Razzle-dazzle Prohibition era vibes.";

-- BALI/UBUD - World Music Hub
CREATE venue SET
  name = "Laughing Buddha Bar",
  type = "world_music_bar",
  location = "Ubud",
  country = "Indonesia",
  region = "Bali",
  tier = 1,
  vibe = ["jazz", "blues", "acoustic", "fusion", "world_music", "latin"],
  notes = "Jalan Monkey Forest. Jazz, blues-rock, acoustic, fusion, world music weekly. Blues Mon-Tue, Latin Fri-Sat. Music from 9pm.";

CREATE venue SET
  name = "E-Baki Kitchen & Music",
  type = "intimate_venue",
  location = "Tegallalang",
  country = "Indonesia",
  region = "Bali",
  tier = 1,
  website = "https://ebakikitchen.com",
  vibe = ["intimate", "acoustic", "jazz", "friday"],
  notes = "Every Friday 7-10pm, acoustic/jazz. Intimate setting without distractions. Different artists weekly.";

CREATE venue SET
  name = "Jazz Café Ubud",
  type = "jazz_club",
  location = "Ubud",
  country = "Indonesia",
  region = "Bali",
  tier = 2,
  vibe = ["jazz", "intimate", "excellent_acoustics"],
  notes = "Excellent acoustics, relaxed vibe. Perfect for intimate conversations and quality music.";

CREATE venue SET
  name = "No Más Bar",
  type = "intimate_venue",
  location = "Ubud",
  country = "Indonesia",
  region = "Bali",
  tier = 2,
  vibe = ["intimate", "close_up", "local_talent"],
  notes = "Close-up performances, personal connection with music. Warm inviting atmosphere.";

-- THAILAND - Sunset Sessions
CREATE venue SET
  name = "Jam Bar",
  type = "beach_bar",
  location = "Hin Kong",
  country = "Thailand",
  region = "Koh Phangan",
  tier = 2,
  vibe = ["beach", "jam_session", "sunset", "acoustic"],
  notes = "Local musicians jam spot, right on beach at Hin Kong. Good for sunset. Well-priced food/drinks.";

CREATE venue SET
  name = "Jungle Club",
  type = "scenic_lounge",
  location = "Chaweng",
  country = "Thailand",
  region = "Koh Samui",
  tier = 2,
  vibe = ["peaceful", "swing_seats", "lounge", "views"],
  notes = "Scenic escape, peaceful nighttime, dreamy views over Chaweng Beach. Swing seats, soft lounge tunes.";

CREATE venue SET
  name = "Samui Rock Bar",
  type = "beach_bar",
  location = "Koh Samui",
  country = "Thailand",
  region = "Koh Samui",
  tier = 2,
  vibe = ["bohemian", "reggae", "rock_formation", "cushions"],
  notes = "Bar carved into rock formation, floor cushions, Bob Marley vibes. Eccentric, comfortable atmosphere.";

CREATE venue SET
  name = "Sunset Hill Resort",
  type = "resort_venue",
  location = "Koh Phangan",
  country = "Thailand",
  region = "Koh Phangan",
  tier = 1,
  website = "https://www.sunsetphangan.com",
  vibe = ["sunset", "infinity_pool", "ambient", "electronic", "classical"],
  notes = "Hosting 'Sunset Concert Fusion' - classical/neoclassical/ambient electronic meets sunset. Live instruments + electronic. Jan 2026.";

-- MOROCCO - Gnaoua Territory
CREATE venue SET
  name = "Taros",
  type = "rooftop_bar",
  location = "Essaouira",
  country = "Morocco",
  region = "Essaouira",
  tier = 2,
  vibe = ["rooftop", "live_music", "gnaoua", "dancing"],
  notes = "OG rooftop bar. Live music, cocktails, dancing under stars. Place Moulay Hassan. Music until 2am. Trendy crowd from 9pm.";

CREATE venue SET
  name = "Kabanas",
  type = "rooftop_bar",
  location = "Marrakech",
  country = "Morocco",
  region = "Marrakech",
  tier = 2,
  vibe = ["rooftop", "best_setting", "restaurant"],
  notes = "By far the best rooftop setting in Marrakech for bar/restaurant.";

-- GREEK ISLANDS - Additional (Paros)
CREATE venue SET
  name = "Bebop",
  type = "rooftop_bar",
  location = "Parikia",
  country = "Greece",
  region = "Paros",
  tier = 2,
  vibe = ["rooftop", "jazz", "sunset", "cocktails", "live_music"],
  notes = "Best sunset cocktail spot in Parikia. Minimal chic, waterfront views. Jazz background, occasional live music.";

-- =====================================================
-- FESTIVALS (Phase 3 but worth tracking)
-- =====================================================
CREATE venue SET
  name = "Gnaoua World Music Festival",
  type = "festival",
  location = "Essaouira",
  country = "Morocco",
  region = "Essaouira",
  tier = 1,
  website = "https://www.festival-gnaoua.net/en/home/",
  vibe = ["world_music", "fusion", "gnaoua", "conscious"],
  notes = "June 19-21, 2025. World music fusion festival. Annual event in Essaouira.";

CREATE venue SET
  name = "BaliSpirit Festival",
  type = "festival",
  location = "Ubud",
  country = "Indonesia",
  region = "Bali",
  tier = 1,
  website = "https://www.balispiritfestival.com/",
  vibe = ["conscious", "transformational", "yoga", "world_music"],
  notes = "April 15-19, 2026. Conscious/transformational festival. Spirit Pools venue for musicians/DJs. PERFECT FIT.";
