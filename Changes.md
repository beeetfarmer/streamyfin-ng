# Changes Made to Streamyfin-ng

## 1. Subtitle Selector in Video Player (New Component)

### `components/video-player/controls/SubtitleSelector.tsx` (new file)
- Brand new component that adds a subtitles button to the video player header controls.
- Uses `useVideoContext()` to get available subtitle tracks.
- Renders a `MaterialIcons` "subtitles" icon button.
- Opens a `PlatformDropdown` with radio options for each subtitle track.
- Hides itself on TV platforms or when no subtitles are available.
- Uses `useLocalSearchParams` to track the currently selected `subtitleIndex`.

### `components/video-player/controls/HeaderControls.tsx` (modified)
- Imports and renders `<SubtitleSelector />` next to the existing dropdown (audio/quality selector).
- Changes the left container class from `'mr-auto'` to `'mr-auto flex-row items-center'` so the two buttons sit side-by-side.
- Only shows the subtitle button on non-TV platforms.

### Bug Fix: Subtitle Size (RESOLVED)
- Subtitles appeared very large by default when playing a video.
- **Root cause:** In `app/(auth)/player/direct-player.tsx` (line 854-855), `settings.subtitleSize` was being passed directly to `setSubtitleFontSize()`. This sets MPV's `sub-font-size`, which is an **absolute point size**. But `subtitleSize` is stored as `scale * 100` (default `100` = 1.0x scale), so it was setting the font to **100pt** — far too large.
- **Fix:** Changed to use `setSubtitleScale(settings.subtitleSize / 100)` instead, which sets MPV's `sub-scale` property with the correct 1.0x value. This matches how the rest of the codebase (SubtitleToggles stepper, DropdownView presets) interprets the value.

---

## 2. Home Collections Feature (New Settings Page)

### `app/(auth)/(tabs)/(home)/settings/appearance/home-collections/page.tsx` (new file)
- New settings page that lets users pick which Jellyfin BoxSet collections to display on the home screen.
- Fetches all BoxSets from the server and renders a toggle switch for each one.
- Persists selections to `settings.homeCollections`.

### `components/home/Home.tsx` (modified)
- Adds a new query (`allBoxSets`) to fetch all BoxSet collections from Jellyfin.
- Creates `collectionSections` — maps each selected BoxSet into an `InfiniteScrollingCollectionList` section with its own paginated query.
- Appends collection sections to `defaultSections`.

---

## 3. Home Sections Visibility & Reordering (New Settings Page)

### `app/(auth)/(tabs)/(home)/settings/appearance/home-sections/page.tsx` (new file)
- New settings page with a `DraggableFlatList` allowing users to:
  - **Toggle visibility** of each home screen section (continue watching, next up, recently added per library, collections, suggested movies).
  - **Drag to reorder** sections via a long-press handle icon.

### `components/home/Home.tsx` (modified — additional logic)
- Filters out sections whose `queryKey` is in `settings.hiddenHomeSections`.
- Sorts visible sections according to `settings.homeSectionOrder`.

---

## 4. Settings Infrastructure

### `utils/atoms/settings.ts` (modified)
Three new settings fields added to the `Settings` type and defaults:
- `homeCollections?: string[]` — IDs of BoxSets to show on home.
- `hiddenHomeSections?: string[]` — section keys to hide.
- `homeSectionOrder?: string[]` — ordered section keys for custom ordering.

### `components/settings/AppearanceSettings.tsx` (modified)
- Two new `ListItem` entries linking to the new settings pages ("Home Collections" and "Home Sections").

### `translations/en.json` (modified)
Five new translation keys:
- `home_collections`
- `home_collections_description`
- `no_collections_found`
- `home_sections`
- `home_sections_description`

---

## 5. TMDB Integration for Actor Pages (New Feature)

Shows an actor's full filmography from TMDB on their profile page, split into movies and TV shows not already in the user's Jellyfin library. Gated behind a setting with a TMDB API key input.

### New Files

#### `utils/tmdb/types.ts`
- TypeScript interfaces for TMDB API responses: `TmdbCreditItem`, `TmdbCombinedCreditsResponse`, `TmdbMovieDetail`, `TmdbTvDetail`, `TmdbCastMember`, `TmdbGenre`.

#### `utils/tmdb/images.ts`
- `getTmdbImageUrl(path, size)` helper that constructs `https://image.tmdb.org/t/p/{size}/{path}` URLs.

#### `utils/tmdb/api.ts`
- `getTmdbCombinedCredits(tmdbPersonId, apiKey)` — fetches a person's full filmography.
- `getTmdbMovieDetail(movieId, apiKey)` — fetches movie detail with credits.
- `getTmdbTvDetail(tvId, apiKey)` — fetches TV show detail with credits.

#### `components/posters/TmdbPoster.tsx`
- Poster component matching `MoviePoster` dimensions (`w-28`, aspect `10/15`) but accepting a TMDB `posterPath` string instead of `BaseItemDto`.

#### `components/person/TmdbOtherCredits.tsx`
- Renders two sections on actor pages: **"Other Shows"** and **"Other Movies"**.
- Fetches combined credits via React Query, filters out items already in the user's library (by TMDB ID), sorts by release year descending.
- Guards: returns `null` if setting is off, no API key, offline, or no TMDB ID.
- Tapping an item navigates to the TMDB detail page.

#### `app/(auth)/(tabs)/(home,libraries,search,favorites,watchlists)/tmdb/[id].tsx`
- TMDB detail page with `ParallaxScrollView`, backdrop image, title, year, genres, synopsis (`OverviewText`), and cast horizontal scroll with profile photos.
- Fetches movie or TV detail based on `mediaType` param.

#### `app/(auth)/(tabs)/(home)/settings/plugins/tmdb/page.tsx`
- TMDB settings page under Plugins (alongside Jellyseerr, Streamystats, etc.).
- Toggle: "Show more info for cast members" (`showTmdbCastInfo`).
- Text input: TMDB API key (shown when toggle is on, `secureTextEntry`).
- Helper text with link to get a free API key from TMDB.
- Header "Save" button following the Streamystats plugin pattern.

### Modified Files

#### `utils/atoms/settings.ts`
- Added `showTmdbCastInfo: boolean` (default: `false`) and `tmdbApiKey?: string` (default: `undefined`) to `Settings` type and `defaultValues`.

#### `translations/en.json`
- Added keys: `home.settings.plugins.tmdb.*` (title, toggle label, API key labels, hints, save, toasts).
- Renamed `item_card.appeared_in` from "Appeared In" to "In Library".
- Added `item_card.other_shows` and `item_card.other_movies`.

#### `components/stacks/NestedTabPageStack.tsx`
- Added `"tmdb/[id]"` to the `routes` array for automatic registration across all tabs.

#### `app/(auth)/(tabs)/(home,libraries,search,favorites,watchlists)/persons/[personId].tsx`
- Replaced `ParallaxScrollView` with a `ScrollView` layout using a portrait image (2:3 aspect ratio) alongside the person's name — works better on tablets.
- Added a query to fetch library items with `ProviderIds` to build a TMDB ID exclusion set.
- Extracts person's TMDB ID from `item.ProviderIds.Tmdb`.
- Renders `<TmdbOtherCredits>` below the "In Library" section.

#### `components/settings/PluginSettings.tsx`
- Added a `ListItem` for "TMDB" navigating to `/settings/plugins/tmdb/page`.

#### `app/(auth)/(tabs)/(home)/_layout.tsx`
- Added a `Stack.Screen` for `settings/plugins/tmdb/page`.

---

## 6. Double-Tap to Seek in Video Player (New Feature)

YouTube-style double-tap-to-seek: double-tap the right half of the screen to seek forward 10 seconds, double-tap the left half to seek backward 10 seconds.

### `components/video-player/controls/hooks/useGestureDetection.ts` (modified)
- Added `onDoubleTapLeft` and `onDoubleTapRight` callbacks to `SwipeGestureOptions` interface.
- Added `lastTapTime`, `lastTapSide`, and `singleTapTimeout` refs for tracking double-tap state.
- Replaced immediate `onTap?.()` call with double-tap detection logic:
  - If a second tap on the same side (left/right of `screenWidth / 2`) arrives within 300ms, fires `onDoubleTapLeft` or `onDoubleTapRight`.
  - Otherwise, delays the single tap by 300ms (cancellable if a second tap arrives) before calling `onTap`.
- Added `onDoubleTapLeft`, `onDoubleTapRight`, and `screenWidth` to the `handleTouchEnd` dependency array.

### `components/video-player/controls/GestureOverlay.tsx` (modified)
- Added `onSeekForward` and `onSeekBackward` props (`(seconds: number) => void`).
- Created `handleDoubleTapRight` callback — calls `onSeekForward(10)` with haptic feedback and shows `"+10s"` visual feedback on the right side.
- Created `handleDoubleTapLeft` callback — calls `onSeekBackward(10)` with haptic feedback and shows `"-10s"` visual feedback on the left side.
- Wired `onDoubleTapLeft: handleDoubleTapLeft` and `onDoubleTapRight: handleDoubleTapRight` into `useGestureDetection`.

### `components/video-player/controls/Controls.tsx` (modified)
- Passed `handleSeekForward` and `handleSeekBackward` (from `useVideoNavigation`) to `<GestureOverlay>` as `onSeekForward` / `onSeekBackward` props.

---

## 7. Cast & Crew on Series Pages (Enhancement)

### `app/(auth)/(tabs)/(home,libraries,search,favorites,watchlists)/series/[id].tsx` (modified)
- Added `ItemPeopleSections` component after the `SeasonPicker`, showing Cast & Crew and "More with actor" sections on TV show pages (previously only available on movie/episode pages).
- Only shown when not in offline mode.

---

## 8. Watched Indicators on All Posters (Enhancement)

Added watched/unwatched badges across all poster types so every item in the UI shows its watch state consistently.

### `components/WatchedIndicator.tsx` (modified)
- Added `"Season"` to the type check for the unplayed count badge, so seasons with unwatched episodes show the count number (e.g., "5").
- Existing logic:
  - Fully watched items show a purple checkmark badge.
  - Series/BoxSet/Season with unwatched episodes show a purple count badge.
  - Unwatched Movies/Episodes show a purple triangle corner.

### `components/posters/ItemPoster.tsx` (previously modified)
- Renders `<WatchedIndicator item={item} />` on Movie, Series, and BoxSet posters in library views.

### `components/posters/SeriesPoster.tsx` (modified)
- Added import for `WatchedIndicator`.
- Added `<WatchedIndicator item={item} />` inside the poster View, so series items on the home page now show watched badges.

### `components/series/SeasonGrid.tsx` (modified)
- Added import for `WatchedIndicator`.
- Added `relative` class to the season poster container View.
- Added `<WatchedIndicator item={season} />` inside each season poster, so season posters on series pages show watched/unwatched count badges.

---

## 9. Startup, Splash Screen, and Server Reachability Fixes (Bug Fix)

Fixed launch behavior where the app could stay on the splash/logo for a long time, and where users could land on "Server Unreachable" even when the server was actually available.

### `providers/JellyfinProvider.tsx` (modified)
- Added `SESSION_VALIDATION_TIMEOUT_MS` and `getCurrentUserWithTimeout(...)` for bounded startup auth validation.
- Changed startup flow to stop blocking splash hide on network-dependent user validation:
  - Restores API/user state from storage quickly.
  - Calls `setInitialLoaded(true)` immediately after restoring session state so splash can hide.
  - Runs `getCurrentUser()` validation in the background.
- Added guarded handling for invalid tokens in background validation:
  - On `401/403`, clears token/user state and routes through normal login protection.
  - For offline/unreachable/network errors, logs and keeps current local session state instead of blocking launch.

### `providers/NetworkStatusProvider.tsx` (modified)
- Replaced fragile `HEAD /` reachability probe with `GET /System/Ping`.
- Added server check timeout (`SERVER_CHECK_TIMEOUT_MS`) and short retry delay (`SERVER_CHECK_RETRY_DELAY_MS`) with one automatic retry before marking unreachable.
- Added stale-request protection using `validationRequestId` so older checks cannot overwrite newer results.
- Improved initial connectivity state handling:
  - `NetInfo.fetch()` now also sets `isConnected` (not just `serverConnected`).
  - Revalidates when `api.basePath` or connectivity changes.
- Keeps existing Retry button behavior, but with more reliable underlying checks.

---

## 10. App Identity & Version Update (Metadata)

Updated app branding and version metadata to **Streamyfin-ng** and **0.1.1** across Expo/native configs and client headers.

### `app.json` (modified)
- `expo.name` changed to `Streamyfin-ng`.
- `expo.version` changed to `0.1.1`.

### `package.json` (modified)
- `version` changed to `0.1.1`.

### Android

#### `android/app/build.gradle` (modified)
- `versionName` changed to `0.1.1`.

#### `android/app/src/main/res/values/strings.xml` (modified)
- `app_name` changed to `Streamyfin-ng`.
- `expo_runtime_version` changed to `0.1.1`.

### iOS

#### `ios/Streamyfin/Info.plist` (modified)
- `CFBundleDisplayName` changed to `Streamyfin-ng`.
- `CFBundleShortVersionString` changed to `0.1.1`.

#### `ios/Streamyfin/Supporting/Expo.plist` (modified)
- `EXUpdatesRuntimeVersion` changed to `0.1.1`.

### In-app client identity

#### `providers/JellyfinProvider.tsx` (modified)
- Jellyfin client name/version metadata changed to `Streamyfin-ng` / `0.1.1` in:
  - `clientInfo`
  - Authorization header `MediaBrowser Client=... Version=...`

#### `app/login.tsx` (modified)
- Login screen title text updated from `Streamyfin` to `Streamyfin-ng` (tablet and mobile views).

---
