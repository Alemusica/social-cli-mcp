# v7.0 | flutur-ccc | 2026-02-07

## IDENTITY
S.1 "FLUTUR" :creator-command-center @Alessio
  .db SurrealDB localhost:8000 ns=social db=analytics | Knowledge Graph
  .db Supabase cloud | Photo storage + AI labeling
  .sync Foto → Supabase(blob+labels) → SurrealDB(graph)
  .core src/core/index.ts | SINGLE IMPORT POINT — MAI duplicare connessioni
  .creds macOS Keychain, NON .env | `security find-generic-password -a social-cli-mcp -s KEY -w`
  .boot `npx tsx src/core/bootstrap.ts`

## CREDENTIALS ✅/⚠️
Twitter ✅ | Instagram ✅ | Gmail ✅ | Telegram ✅ | Anthropic ✅
Supabase ⚠️ | LinkedIn ⚠️ | YouTube ⚠️ | TikTok ⚠️

## AUTO-ORCHESTRATION — ESEGUI SUBITO, NON CHIEDERE
"daily brief"|"cosa posto" → `npx tsx src/agents/daily-brief.ts`
"piano settimana" → `npx tsx src/agents/editorial-planner.ts week`
"prossimo post" → `npx tsx src/agents/editorial-planner.ts next`
"feedback" → `npx tsx src/agents/interviewer.ts feedback`
"storie" → `npx tsx src/agents/interviewer.ts stories`
"tweet" → `npx tsx src/agents/interviewer.ts tweets`
"weekly" → `npx tsx src/agents/interviewer.ts weekly`
"check-in" → `npx tsx src/agents/interviewer.ts daily`
"status" → `npx tsx src/agents/orchestrator.ts status`
"piano [tema]" → `npx tsx src/agents/story-director.ts plan "[tema]"`
"draft"|"bozza" → `npx tsx scripts/draft-post.ts`
"snapshot" → `npx tsx scripts/archive-insights.ts`
.rules Sempre esegui | Formatta output | Combina risultati | Fallback: content library se DB offline

## BRAND
.msg "Dal sunrise in Grecia al codice AI – layer su layer"
.bridge MUSICA(RAV,looping,Ableton) ←→ TECH(jsOM,AI,build-in-public)
.pillars
  tech 2x/wk → Twitter,LinkedIn,YT | #buildinpublic #AI #jsOM
  music_production 2x/wk → Twitter,IG,TikTok | #ableton #livelooping #musictech
  live_performance 3x/wk → IG(primary),TikTok,YT | #busker #ravvast #handpan
  nature_authentic 2x/wk → IG,Twitter | #fieldrecording #musicianlife
.rotation Max 2 consecutive days same pillar | `checkConsecutivePillarRule()`
.objectives
  1 LIVE ACT (Primary): booking costante, gig/mese
  2 SOFTWARE: jsOM exit 6-7 fig → Lovable/Vercel/YC
  3 BRAND: "Flutur" riconosciuto music+tech

## ARTIST PROFILE
.identity LIVE ACT, non producer | 3 tracce Spotify ~683 listeners
.credentials
  Greece's Got Talent 4 YES | Villa Porta 4yr residency Lake Maggiore
  RAV Vast Endorsed | Equanimous collab Kailash 2.0 (100M+ streams Gravitas)
  Drishti Beats Festival MAIN STAGE Snowmass/Aspen July 2023
  Your Mom's House Denver Jan 2023 | opened for IHF
.setup
  min: Voce + Chitarra + RAV Vast + Looper
  full: + Elettrica + Drum Pad + Haken Continuum + Ableton Push 3
.healing Self-taught, 4yr sunset ceremonies hotel lusso, NON certificato
.releases Kailash 2.0 ~65K | Efthymia ~2K
.geo WORLDWIDE 2026
.positioning
  MAI "Sarò in [luogo]" → "Disponibile per booking 2026"
  Wellness → "Sound Journey Facilitator"
  Festival → workshop + performance combo
  Venue → versatilità setup (minimal → full orchestra)

## SURREALDB TABLES
content 714 | venue 268 | email 66 | post_draft 6 | artist_profile 1
software_project 1 | acquisition_target 5 | story_arc 0 | narrative_path 0
.graph
  artist_profile:flutur →creates→ software_project:jsom →targets→ acquisition_target
  artist_profile:flutur →performs_at→ venue
  email →sent_to→ venue | content →taken_at_gig→ gig →performed_at→ venue
  post →uses_hashtag→ hashtag | →belongs_to_pillar→ content_pillar

## CORE API (all from src/core/index.js)
bootstrap() | db.query() | db.queryOne() | db.create() | db.update() | db.relate()
getArtistProfile() | getActiveArc() | getTodayContent() | getUnusedContent(n)
getTopHashtags(n) | getPendingFollowups() | getContentStats() | getUpcomingGigs()
getDuplicateReport(platform) | checkDuplicate(platform, text)
insightsArchiver.archiveAudience() | .getEvolution(days) | .getCorridorAnalysis() | .needsFresh()
editorialIntelligence.getContentBrief(platform, type) | .suggestNarrativeArc(scope) | .getTodayStoryPrompt()
contentDrafter.startSession(id, platform, type) | .complete(session, answers) | .getReady(n)

## SURREAL FUNCTIONS
fn::outreach_status() | fn::venues_need_followup() | fn::current_arc()
fn::weekly_schedule($week) | fn::ready_posts() | fn::top_hashtags(n)
fn::content_for_post(NONE, NONE)

## PLATFORM RULES 2026
Twitter 3-5/day | IG Feed 4-5/wk | IG Stories ~4/day | IG Reels 3-5/wk | YT Shorts 3-5/wk
.timing
  9-11 TWITTER PEAK: tech,build-in-public
  12-14 visual,leggero: foto,carousel
  18-21 IG/VIDEO PEAK: reels,performance
  21-23 BEST IG GIO: sunset,reflection
.rules
  IG: 3-5 hashtags, SHARES>Saves>Comments>Likes, first 48h critical
  Twitter: links SEMPRE in REPLY mai principale, threads per tech
  YT Shorts: best Tue/Wed 18-19

## NARRATIVE PATHS
Weekly parallel storylines → Saturday crossover
Mon=setup, Sat=payoff | Same story, different formats per platform
.agents
  StoryDirector(supervisor): chiede tema, crossover, foto-storia, performance drop
  EditorialPlanner: narrativa→calendario, bilancia pillars
  Interviewer: daily|feedback|stories|weekly|tweets → SurrealDB interview_session
  ContentDrafter: NON INVENTA, CHIEDE | 3-5 varianti | stili: storytelling|minimal|poetic|educational|bridge
  SoftwareStrategy: pitch|targets|github|roadmap|thread → jsOM exit
  PlatformAgents: Twitter(threads), IG(reels 3sec hook), YT(shorts crosspost)

## DIGITAL DEPARTMENT
.workflow PLAN → ANALYZE → OPTIMIZE → POST → MONITOR → LEARN
`npx tsx src/digital-department/workflow.ts status|next`
`npx tsx src/digital-department/optimize-posts.ts`
`npx tsx src/digital-department/monitor-post.ts <post_id>`
.budget IG API 10 calls/week: 50% post, 50% analysis

## VIDEOS (OUTREACH)
efthymia BEST → wellness,spa,yoga | RAV solo
rocca-transcendence-rav → jazz,music venues | RAV+Jarl
rocca-father-ocean-rav → beach clubs | Ben Böhmer vibe
rocca-chase-the-sun → Italian beach clubs | Planet Funk
who-is-flutur → festivals,press | 3min story
DO NOT USE: rocca-full-set

## OUTREACH TIERS
Phase1 cold OK: jazz clubs, small hotels, rooftop bars
Phase2 cold+warm: beach lounges, wellness spas
Phase3 NO cold: premium beach clubs(Scorpios,Phi Beach), luxury resorts(Borgo Egnazia,Belmond), major festivals
.scripts
  `npx tsx scripts/generate-outreach-emails.ts`
  `npx tsx scripts/send-outreach.ts test|send <file.json>` max 20/batch

## DUPLICATE PREVENTION (automatic in clients)
Exact match | >70% similarity | Topic cooldown 7d | Keyword detection
.tracking analytics/posted-tweets-index.json | posted-instagram-index.json | pending-actions.json
.telegram /morning → pending actions + follow-ups + duplicates

## INSIGHTS INTELLIGENCE
IG API → archiveAudienceInsights() → SurrealDB audience_snapshot → getCorridorAnalysis()
.corridor ~70% IT↔GR | temi cross-culturali, tono emotivo mediterraneo
.tables audience_snapshot | api_snapshot | story_arc | platform_content
.philosophy Contesto per decisioni umane, MAI genera automaticamente

## KPIS 2026
Share rate >3% MOST IMPORTANT | Save rate >5% | Meaningful comments
First 48h engagement | Reach/post | Profile visits | Link clicks (X reply)

## SUPABASE PHOTOS
.schema photos(id,storage_path,filename,ai_labels[],ai_description,ai_objects[],ai_colors[],ai_mood,user_title,user_description,user_tags[],user_story,surreal_content_id,synced_at)
.api uploadPhoto() | annotatePhoto(id,{title,story,tags}) | searchPhotos({tags,location}) | getPhotoUrl(path)
.labeling Edge Function label-photo: Claude Vision → labels,objects,colors,mood,description
.pillar_detect code/laptop→tech | ableton/studio→music_production | concert/rav→live_performance | sunset/nature→nature_authentic
.scripts
  `npx tsx scripts/sync-supabase-photos.ts import|label|sync|status`

## KEY FILES
content/STRATEGY_2026.md | content/EDITORIAL_PLAN_WEEKLY.md
src/agents/ARCHITECTURE.md | src/agents/ORCHESTRATION.md
src/core/duplicate-checker.ts | src/db/schema.surql | src/db/supabase-client.ts
supabase/migrations/001_photos_schema.sql | supabase/functions/label-photo/index.ts
