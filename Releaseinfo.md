# Streamyfin-ng Custom Build

A customized build of [Streamyfin](https://github.com/streamyfin/streamyfin) with new features, bug fixes, and UI enhancements. Based on Streamyfin v0.52.0.

---

## New Features

### Subtitle Selector in Video Player
- Dedicated subtitle button in the player header controls for quick subtitle track switching
- Dropdown menu lists all available subtitle tracks
- One-tap switching without digging through settings menus

### Double-Tap to Seek
- YouTube-style double-tap gesture in the video player
- Double-tap the **right half** of the screen to seek **forward 10 seconds**
- Double-tap the **left half** to seek **backward 10 seconds**
- Includes haptic feedback and on-screen "+10s" / "-10s" visual indicator

### Home Screen Collections
- New setting under **Appearance > Home Collections** to display Jellyfin BoxSet collections on the home screen
- Pick which collections to show via toggle switches
- Each collection gets its own scrollable section with paginated loading

### Home Sections Visibility & Reordering
- New setting under **Appearance > Home Sections** to customize the home screen layout
- **Hide/show** individual sections (Continue Watching, Next Up, Recently Added, Collections, Suggested, etc.)
- **Drag to reorder** sections to arrange the home screen however you like

### TMDB Integration for Actor Pages
- View an actor's **full filmography from TMDB** on their profile page
- Shows movies and TV shows the actor has appeared in that are **not already in your Jellyfin library**
- Tapping an item opens a detail page with backdrop, synopsis, genres, and cast list
- Requires a free TMDB API key (configurable under **Settings > Plugins > TMDB**)
- Can be toggled on/off per user preference

---

## Bug Fixes

### Subtitle Size Fix
- Fixed subtitles appearing extremely large by default during video playback
- Root cause: subtitle size value was being passed as an absolute font size (100pt) instead of a scale factor (1.0x)
- Subtitles now display at the correct default size

---

## Enhancements

### Watched Indicators on All Posters
- Consistent watched/unwatched badges across the entire app:
  - **Checkmark badge** on fully watched items
  - **Unplayed count badge** (e.g., "5") on Series, BoxSets, and Seasons with remaining episodes
  - **Corner triangle** on unwatched Movies and Episodes
- Now visible on: home page series posters, library posters, and season posters on series pages

### Cast & Crew on Series Pages
- Series/TV show pages now display Cast & Crew sections (previously only available on movie and episode pages)
- Includes "More with this actor" navigation

### Improved Actor Page Layout
- Redesigned actor/person page with a portrait image layout that works better on tablets
- "Appeared In" section renamed to "In Library" for clarity

---

## How to Use

1. Download the APK from the release assets below
2. Transfer to your Android device
3. Enable "Install from unknown sources" if prompted
4. Install and connect to your Jellyfin server
5. (Optional) Add your TMDB API key under Settings > Plugins > TMDB for actor filmography features

## Build Info

- Based on: Streamyfin v0.52.0 (develop branch)
- Target SDK: 35 | Min SDK: 26
- Architectures: arm64-v8a, x86_64
- Signed with: debug keystore (personal use)
