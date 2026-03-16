# Streamyfin-ng

Streamyfin-ng is a modern Jellyfin client built with Expo/React Native for Android and iOS.
It is designed for smooth media browsing, playback, and offline-friendly usage with a focus on practical quality-of-life improvements.

## Fork Notice

This project is a fork of [streamyfin/streamyfin](https://github.com/streamyfin/streamyfin).

Streamyfin-ng keeps compatibility with Jellyfin workflows while adding new playback UX features, home-screen customization, metadata enhancements, and startup/connectivity reliability improvements.

## What the app does

- Connects to your Jellyfin server and streams your personal media
- Provides mobile-friendly playback controls and media navigation
- Supports downloaded content for offline viewing
- Includes integrations and settings for advanced server-based workflows


## How Streamyfin-ng is different from Streamyfin:

### New Features

#### Subtitle Selector in Video Player

- Dedicated subtitle button in the player header controls for quick subtitle track switching
- Dropdown menu lists all available subtitle tracks
- One-tap switching without digging through settings menus

#### Double-Tap to Seek

- YouTube-style double-tap gesture in the video player
- Double-tap the right half of the screen to seek forward 10 seconds
- Double-tap the left half to seek backward 10 seconds
- Includes haptic feedback and on-screen "+10s" / "-10s" visual indicator

#### Home Screen Collections

- New setting under `Appearance > Home Collections` to display Jellyfin BoxSet collections on the home screen
- Pick which collections to show via toggle switches
- Each collection gets its own scrollable section with paginated loading

#### Home Sections Visibility & Reordering

- New setting under `Appearance > Home Sections` to customize the home screen layout
- Hide/show individual sections (Continue Watching, Next Up, Recently Added, Collections, Suggested, etc.)
- Drag to reorder sections to arrange the home screen however you like

#### TMDB Integration for Actor Pages

- View an actor's full filmography from TMDB on their profile page
- Shows movies and TV shows the actor has appeared in that are not already in your Jellyfin library
- Tapping an item opens a detail page with backdrop, synopsis, genres, and cast list
- Requires a free TMDB API key (configurable under `Settings > Plugins > TMDB`)
- Can be toggled on/off per user preference

### Bug Fixes

#### Subtitle Size Fix

- Fixed subtitles appearing extremely large by default during video playback
- Root cause: subtitle size value was being passed as an absolute font size (`100pt`) instead of a scale factor (`1.0x`)
- Subtitles now display at the correct default size

### Enhancements

#### Watched Indicators on All Posters

- Consistent watched/unwatched badges across the entire app
- Checkmark badge on fully watched items
- Unplayed count badge (for example, `5`) on Series, BoxSets, and Seasons with remaining episodes
- Corner triangle on unwatched Movies and Episodes
- Visible on home page series posters, library posters, and season posters on series pages

#### Cast & Crew on Series Pages

- Series/TV show pages now display Cast & Crew sections (previously only available on movie and episode pages)
- Includes "More with this actor" navigation

#### Improved Actor Page Layout

- Redesigned actor/person page with a portrait image layout that works better on tablets
- "Appeared In" section renamed to "In Library" for clarity

### Launch and Connectivity Improvements

- Splash/logo no longer waits on long server validation before opening the app UI
- Session validation now runs in the background with a timeout to avoid long startup stalls when offline
- Server reachability checks now use `System/Ping` with timeout + retry to reduce false "Server Unreachable" screens on app open


For the full implementation-level breakdown, see [Changes.md](./Changes.md).

## Development

### Prerequisites

- Node.js `>20`
- Bun
- Android Studio and/or Xcode

### Setup

1. Install dependencies:
   - `bun i`
   - `bun run submodule-reload`
2. Prebuild native projects:
   - `npm run prebuild`
3. Build and run dev client:
   - Android: `npm run android`
   - iOS: `npm run ios`
4. Start Metro for Fast Refresh:
   - `npm run start`

For TV builds:

- `npm run prebuild:tv`
- `npm run android:tv` or `npm run ios:tv`

## Contributing

Contributions are welcome. Please open an issue for major changes before starting implementation.

## Credits

- Upstream project: [streamyfin/streamyfin](https://github.com/streamyfin/streamyfin)
- Built with Expo, React Native, Jellyfin SDK, and other open-source libraries

## License

Streamyfin is licensed under the Mozilla Public License 2.0 (MPL-2.0). This means you are free to use, modify, and distribute this software. The MPL-2.0 is a copyleft license that allows for more flexibility in combining the software with proprietary code. Key points of the MPL-2.0:

- You can use the software for any purpose
- You can modify the software and distribute modified versions
- You must include the original copyright and license notices
- You must disclose your source code for any modifications to the covered files
- Larger works may combine MPL code with code under other licenses
- MPL-licensed components must remain under the MPL, but the larger work can be under a different license
- For the full text of the license, please see the `LICENSE` file in this repository

## Disclaimer

Streamyfin does not promote, support, or condone piracy in any form. The app is intended solely for streaming media that you personally own and control. It does not provide or include any media content. Any discussions, support requests, or references to piracy, as well as any tools, software, or websites related to piracy, are strictly prohibited.
