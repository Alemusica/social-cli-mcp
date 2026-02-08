-- =====================================================
-- MIGRATION: Add Conscious/Transformational Festivals
-- Date: 2026-01-21
-- Purpose: Add festival venues for transformational circuit outreach
-- Status: CONTACTS NEED VERIFICATION (web access unavailable)
-- =====================================================

-- Waking Life Festival (Portugal)
CREATE venue:festival_waking_life_portugal SET
    name = "Waking Life Festival",
    type = "festival",
    location = "Alentejo",
    country = "Portugal",
    region = "Alentejo",
    website = "https://wakinglife.pt",
    instagram = "@wakinglifefestival",
    contact_email = "info@wakinglife.pt",
    status = "prospect",
    tier = 1,
    vibe = ["conscious", "art", "music", "nature", "community", "transformational"],
    notes = "Transformational festival. Applications typically open Dec/Jan. Apply for healing/workshop area. Perfect for RAV Vast meditation sets and sound journey format. Verify contact before outreach.",
    created_at = time::now();

-- Boom Festival - Liminal Village (Portugal)
CREATE venue:festival_boom_liminal_village SET
    name = "Boom Festival - Liminal Village",
    type = "festival",
    location = "Idanha-a-Nova",
    country = "Portugal",
    region = "Castelo Branco",
    website = "https://boomfestival.org",
    instagram = "@boomfestivalofficial",
    contact_email = "liminalvillage@boomfestival.org",
    status = "prospect",
    tier = 1,
    vibe = ["psychedelic", "art", "sustainability", "consciousness", "healing", "transformational"],
    notes = "BIENNIAL (2026 next). Liminal Village = healing arts area, perfect for sound healing. Apply specifically for Liminal Village, NOT main stages. Include vibroacoustic therapy background. Applications open ~6-8 months before.",
    created_at = time::now();

-- Evolve Festival (Germany)
CREATE venue:festival_evolve_berlin SET
    name = "Evolve Festival",
    type = "festival",
    location = "Berlin area",
    country = "Germany",
    website = "https://www.evolvefestival.de",
    instagram = "@evolvefestival",
    contact_email = "info@evolvefestival.de",
    status = "prospect",
    tier = 2,
    vibe = ["consciousness", "music", "art", "community", "yoga", "transformational"],
    notes = "German conscious scene. Smaller scale = better acceptance chance. Position as sunset ceremony creator with workshop capability. VERIFY CONTACTS NEEDED.",
    created_at = time::now();

-- BaliSpirit Festival (Indonesia)
CREATE venue:festival_balispirit SET
    name = "BaliSpirit Festival",
    type = "festival",
    location = "Ubud",
    country = "Indonesia",
    region = "Bali",
    website = "https://www.balispiritfestival.com",
    instagram = "@balispiritfestival",
    contact_email = "info@balispiritfestival.com",
    status = "prospect",
    tier = 1,
    vibe = ["yoga", "dance", "music", "healing", "wellness", "spirituality"],
    notes = "Premier Asia yoga festival. March/April dates. Apply by Oct-Nov. Multiple stages: Dharma (yoga/healing), Spirit (sacred music), Night (world music). Apply for BOTH sound healing AND performance. Sound healing is CORE to their programming.",
    created_at = time::now();

-- Pangonia Handpan Festival (Germany)
CREATE venue:festival_pangonia_handpan SET
    name = "Pangonia Handpan Festival",
    type = "festival",
    location = "Germany",
    country = "Germany",
    website = "https://www.pangonia.de",
    instagram = "@pangonia_festival",
    contact_email = "info@pangonia.de",
    status = "prospect",
    tier = 1,
    vibe = ["handpan", "percussion", "community", "music", "workshops"],
    notes = "Dedicated handpan/steel tongue drum festival. RAV Vast endorsement = credibility. Propose both performance AND workshop on live looping with RAV. Excellent for handpan community networking. VERIFY CONTACTS NEEDED.",
    created_at = time::now();

-- Related festivals from existing strategy (add if not already in DB)

-- Sound-Sculpture Festival
CREATE venue:festival_sound_sculpture IF NOT EXISTS SET
    name = "Sound-Sculpture Festival",
    type = "festival",
    country = "Germany",
    website = "https://handpan-festival.de",
    status = "prospect",
    tier = 2,
    vibe = ["handpan", "steel percussion", "community"],
    notes = "German handpan festival circuit. VERIFY CONTACTS NEEDED.",
    created_at = time::now();

-- Canarias Handpan Festival
CREATE venue:festival_canarias_handpan IF NOT EXISTS SET
    name = "Canarias Handpan Festival",
    type = "festival",
    location = "Fuerteventura",
    country = "Spain",
    region = "Canary Islands",
    website = "https://canariashandpanfestival.com",
    status = "prospect",
    tier = 2,
    vibe = ["handpan", "steel percussion", "island", "community"],
    notes = "Canary Islands handpan gathering. VERIFY CONTACTS NEEDED.",
    created_at = time::now();

-- GRIASDI Gathering
CREATE venue:festival_griasdi IF NOT EXISTS SET
    name = "GRIASDI Gathering",
    type = "festival",
    country = "Austria",
    website = "https://griasdi-gathering.org",
    status = "prospect",
    tier = 2,
    vibe = ["handpan", "community", "alpine", "gathering"],
    notes = "Austrian handpan gathering. VERIFY CONTACTS NEEDED.",
    created_at = time::now();

-- Ozora Festival (Dragon Nest stage)
CREATE venue:festival_ozora_dragon_nest IF NOT EXISTS SET
    name = "Ozora Festival (Dragon Nest)",
    type = "festival",
    country = "Hungary",
    website = "https://ozorafestival.eu",
    status = "prospect",
    tier = 2,
    vibe = ["psychedelic", "chill", "healing", "transformational"],
    notes = "Dragon Nest = chill/healing area. VERY competitive. Focus on Liminal Village/healing stages.",
    created_at = time::now();

-- Wonderfruit Festival
CREATE venue:festival_wonderfruit IF NOT EXISTS SET
    name = "Wonderfruit Festival",
    type = "festival",
    location = "Pattaya area",
    country = "Thailand",
    website = "https://wonderfruit.co",
    status = "prospect",
    tier = 2,
    vibe = ["art", "music", "sustainability", "wellness", "conscious"],
    notes = "December dates. Arts + sustainability focus. VERIFY CONTACTS NEEDED.",
    created_at = time::now();

-- =====================================================
-- Festival Application Deadlines (reference data)
-- =====================================================
-- Note: Store these as notes or separate tracking

-- Waking Life: Applications typically Dec/Jan for August festival
-- Boom 2026: Applications likely open late 2025 / early 2026
-- BaliSpirit 2027: Applications likely open Oct 2026 for March 2027
-- Pangonia: Check website for current year deadlines
-- Evolve: Check website for current year deadlines

-- =====================================================
-- END MIGRATION
-- =====================================================
