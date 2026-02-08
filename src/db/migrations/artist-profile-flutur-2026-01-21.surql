-- =====================================================
-- FLUTUR ARTIST PROFILE - 2026-01-21
-- Central node for knowledge graph
-- =====================================================

-- Upsert artist profile
DELETE artist_profile WHERE id = artist_profile:flutur;

CREATE artist_profile:flutur SET
  name = "Flutur",
  real_name = "Alessio",
  type = "live_act",
  tagline = "Layer su layer - dal sunrise in Grecia al codice AI",

  -- Core identity
  primary_focus = "live_performance",
  secondary_focus = "software_development",
  is_producer = false,

  -- Credentials
  credentials = [
    "Greece's Got Talent - 4 YES votes",
    "4-year residency at Villa Porta, Lake Maggiore",
    "RAV Vast Endorsed Artist",
    "Equanimous collab (Kailash 2.0)"
  ],

  -- Live setup
  live_equipment = {
    core: ["vocals", "acoustic_guitar", "rav_vast", "looper"],
    optional: ["electric_guitar", "drums", "drum_pad", "haken_continuum", "ableton_push_3"],
    setup_types: {
      minimal: ["vocals", "acoustic_guitar", "rav_vast", "looper"],
      standard: ["vocals", "acoustic_guitar", "electric_guitar", "rav_vast", "looper", "drum_pad"],
      full_orchestra: ["vocals", "acoustic_guitar", "electric_guitar", "drums", "rav_vast", "haken_continuum", "ableton_push_3"]
    }
  },

  -- Sound healing
  sound_healing = {
    background: "self_taught",
    years_experience: 4,
    specialization: "RAV Vast therapeutic sessions",
    certified: false,
    experience_type: "sunset_ceremonies_luxury_hospitality",
    notes: "Non certificato ma con esperienza reale e feedback positivi dai guests"
  },

  -- Music releases
  spotify = {
    monthly_listeners: 683,
    profile_url: "https://open.spotify.com/artist/flutur"
  },

  releases = [
    {
      title: "Kailash 2.0",
      plays: 65000,
      collab: "Equanimous",
      collab_streams: "100M+",
      label: "Gravitas Recordings",
      notes: "Main credential for festival pitches"
    },
    {
      title: "Efthymia",
      plays: 2000,
      collab: none,
      notes: "Solo track - best for wellness/meditation pitches"
    }
  ],

  -- Geographic availability
  availability_2026 = {
    scope: "worldwide",
    preferred_regions: ["Europe", "Southeast Asia", "Middle East"],
    notes: "Disponibile ovunque con giusto compenso/condizioni"
  },

  -- Outreach positioning rules
  outreach_rules = {
    never_say: ["I'll be in [place]", "Passing through", "I'll be there"],
    always_say: ["Available for 2026 booking", "Seeking opportunities", "Open to collaborate"],
    wellness_position: "Sound Journey Facilitator",
    festival_position: "Workshop + Performance",
    venue_position: "Versatile setup (minimal to full orchestra)"
  },

  -- Links
  links = {
    linktree: "https://linktr.ee/flutur",
    spotify: "https://open.spotify.com/artist/flutur",
    youtube: "https://youtube.com/@flutur",
    instagram: "@flutur"
  },

  -- Video assets for outreach
  video_assets = [
    {
      id: "efthymia",
      url: "https://youtu.be/I-lpfRHTSG4",
      best_for: ["wellness", "spa", "yoga", "retreats", "meditation"],
      notes: "RAV solo, emotional - BEST for healing venues"
    },
    {
      id: "rocca-father-ocean",
      url: "https://youtu.be/Ba8HiRS4hjc",
      best_for: ["sunset_sessions", "beach_clubs", "ambient_electronic"],
      notes: "Ben Böhmer / Anjunadeep vibe"
    },
    {
      id: "rocca-transcendence",
      url: "https://youtu.be/transcendence",
      best_for: ["jazz_clubs", "listening_bars", "music_venues"],
      notes: "RAV + Jarl mashup"
    },
    {
      id: "who-is-flutur",
      url: "https://youtu.be/rmnShcDsBBY",
      best_for: ["festivals", "press", "booking_agents"],
      notes: "Full story (3 min) - journey narrative"
    }
  ],

  updated_at = time::now();

-- Log the update
CREATE event SET
  type = "profile_update",
  entity = artist_profile:flutur,
  timestamp = time::now(),
  notes = "Updated with live setup, sound healing background, positioning rules";
