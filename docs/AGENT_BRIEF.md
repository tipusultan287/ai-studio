# Brief for feature workstreams (read first)

Project: /home/user/ai-studio — Expo SDK 58, RN 0.88, React 19.3, TypeScript strict, Expo Router (routes in src/app).
Read docs/PLAN.md (product scope for your area) and AGENTS.md. Expo APIs changed in SDK 58 — read the installed
package's .d.ts in node_modules before using an API (e.g. expo-file-system uses `File`/`Directory`/`Paths` classes;
expo-media-library uses `MediaLibrary.Asset.create`; expo-video `useVideoPlayer` + `VideoView`; expo-audio
`useAudioPlayer`, `useAudioRecorder`). The cloud machine cannot reach docs.expo.dev reliably, so trust node_modules.

## Shared code you USE but must NOT edit
- `@/ui` (src/ui/*): design system. colors, gradients, radius, space, type, Text, Button, IconButton, Card, Chip, ChipRow,
  LabeledSlider, Screen, TopBar, SectionHeader, ToolRail (bottom tool rail for editors), PromptInput, ProgressOverlay,
  EmptyState, Segmented, ScalePressable, haptics. Dark-first look: near-black canvas, volt-lime accent (colors.accent)
  for primary actions, warm coral (colors.ai / gradients.ai) for anything AI. Icons: `lucide-react-native`.
- `@/lib/runware` : all Runware calls (generateImage, editImage, replaceBackground, removeObject, inpaint,
  removeBackground, upscaleImage, generateVideo, editVideo, changeVideoScene, eraseFromVideo, removeVideoBackground,
  upscaleVideo, textToSpeech, generateMusic, generateSoundEffect, ASPECTS, MODEL_CATALOG, uploadMedia). They take
  `(params, opts)` where opts is RunOptions {signal,onProgress}. They return remote result URL(s).
- `@/lib/useTask` : `const t = useTask(); const url = await t.start(opts => editImage({...}, opts));` then render
  `<ProgressOverlay visible={t.running} status={t.status} progress={t.progress} onCancel={t.cancel} />`.
  It handles errors & missing-API-key alerts.
- `@/lib/media` : pickMedia(kind), captureWithCamera, addToLibrary({uri,kind,source,prompt,model,parentId}) (persists file,
  makes thumbnails, returns Asset), newMediaPath(ext) (fresh local output path), saveToDevice, shareMedia, formatDuration.
- `@/lib/ffmpeg` : ffmpeg(args, {totalMs,onProgress}) -> {promise,cancel}; ffmpegAvailable(); fsPath(uri) strips file://;
  escapeDrawtext. Backed by `ffmpeg-expo` (native, dev build only). In Expo Go / web it's unavailable: still show the
  editor & preview, and on export show the FFmpegUnavailableError message.
- `@/store/library` (useLibrary: assets, add, update, remove, get), `@/store/settings` (models per slot).
If you truly need a change in shared code, create a helper inside your own feature folder instead, and mention it in
your final report.

## Routes & params (keep these exact; other screens link to them)
- /photo/editor?uri=...&assetId=...      /photo/ai?uri=...&assetId=...&tool=bg|remove|edit|cutout|upscale|restyle
- /video/editor?uri=...&assetId=...      /video/ai?uri=...&assetId=...&tool=scene|remove|edit|restyle|cutout|upscale|animate
- /audio/editor?uri=...&assetId=...
- /generate/image?prompt=...   /generate/video?prompt=...&imageUri=...   /generate/audio?mode=speech|music|sfx&prompt=...
- /asset/[id]  (viewer, owned by the lead), /settings tab.
If a route is opened with no uri, show a polished "pick media" state (pickMedia / camera) instead of crashing.
Results must be saved via addToLibrary(...) and then offer: Open in editor, Save to Photos (saveToDevice), Share.
After AI edits show a before/after compare (press-and-hold or a split slider).

## Rules
- Only create/edit files in YOUR folders (listed in your task). Do not touch package.json, app.json, or others' folders.
  Do not run npm install / expo install. Do not git commit (the lead commits).
- Use `@/` imports. Function components + hooks. No `any` unless unavoidable. Keep each file < ~400 lines; split into
  components under src/features/<area>/.
- Must pass: `npx tsc --noEmit` and `npx eslint <your files>` with zero errors in your files. (Reanimated shared
  values: use `.set()`/`.get()` rather than `.value =` — the React Compiler lint rejects mutation.)
- UI quality bar: this should feel like a flagship 2026 creative app (CapCut / Lightroom / Runway level). Full-bleed
  media preview, glass/blur panels, smooth Reanimated transitions, haptics on tool taps, safe-area aware, works on small
  phones (375pt wide) and Android. Use react-native-gesture-handler (v3) for gestures where useful.
- Final report (short): files created, what works, what's untested/assumed, any shared-code change you needed.
