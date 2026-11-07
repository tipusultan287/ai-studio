# AI Studio — Product & Technical Plan

A cross‑platform (iOS + Android) creative studio for **photos, video and audio**: a full set of manual
editing tools, AI edits, and AI generation. All AI runs on **Runware** (`https://api.runware.ai/v1`).

## 1. Product scope

### Studio (home)
- Hero "Create" actions: Generate Image / Video / Audio, Edit Photo / Video / Audio.
- Recent projects strip, AI quick actions ("Replace background", "Remove object", "Move my video to Mars").
- Everything produced is saved to the in‑app **Library** and can be exported to the camera roll / Files / share sheet.

### Photo editor (manual)
| Tool | Details |
|---|---|
| Crop & rotate | Aspect presets (free, 1:1, 4:5, 9:16, 16:9, 3:2), rotate 90°, flip H/V |
| Adjust | Exposure, brightness, contrast, saturation, vibrance, warmth, tint, highlights, shadows, fade, sharpen (approx.), vignette |
| Filters | 12+ curated looks (color matrices) with intensity |
| Text | Add/edit text layers, font weight, color, size, drag to place |
| Draw | Freehand brush with color/size, eraser, undo |
| Stickers/emoji | Emoji layers, drag & scale |
| History | Undo / redo, compare (hold to see original) |
| Export | Skia snapshot → PNG/JPEG → Library / Photos / Share |

### Photo AI (Runware)
- **Replace background** (remove bg → generate new scene by prompt, or transparent PNG)
- **Remove object** (paint mask → inpaint/erase)
- **Add / change anything** (instruction edit: "make it night", "change the person's jacket to red", "add a cat on the sofa")
- **Change person / outfit / style** (instruction edit with reference image)
- **Upscale** (2x/4x), **Remove background** (transparent)
- **Expand / restyle** via image‑to‑image with strength slider

### Video editor (manual)
| Tool | Details |
|---|---|
| Timeline | Multi‑clip timeline with thumbnails, reorder, delete, duplicate |
| Trim & split | Per‑clip in/out handles, split at playhead |
| Speed | 0.25x – 4x |
| Adjust & filters | Brightness, contrast, saturation, filter looks (ffmpeg `eq`/`colorchannelmixer`) |
| Text overlays | Timed text with position |
| Audio | Mute original, volume, add music track (from Library/AI audio) with volume & fade |
| Crop / aspect | 9:16, 1:1, 16:9, 4:5 canvas |
| Export | On‑device render with FFmpeg (ffmpeg‑kit fork) → MP4 |

### Video AI (Runware)
- **Change scene / location** ("same video, but on Mars") — video‑to‑video edit models
- **Remove object** from video (video eraser)
- **Add / change object** by instruction (video edit)
- **Restyle** (anime, claymation, film look)
- **Remove background** of video
- **Animate a photo** (image‑to‑video)
- **Upscale / enhance** video

### Audio editor (manual)
| Tool | Details |
|---|---|
| Waveform | Visual waveform with zoom/scroll, playhead |
| Trim / cut | Select region, trim to selection, delete selection |
| Fades | Fade in / fade out |
| Volume / normalize | Gain, loudness normalize |
| Speed / pitch | Tempo 0.5–2x, pitch shift |
| Effects | EQ presets (bass boost, voice clarity, telephone), echo, reverb, noise reduction |
| Record | Record from microphone |
| Merge | Append clips |
| Export | FFmpeg → M4A/MP3/WAV |

### Generation (Runware)
- **Image generation**: prompt, negative prompt, model picker, aspect ratio, count (1–4), style presets, reference image.
- **Video generation**: text‑to‑video, image‑to‑video (first/last frame), duration, aspect, model picker, async polling with progress.
- **Audio generation**: Text‑to‑speech (voices), Music (prompt + lyrics + duration), Sound effects.

### Library & Settings
- Grid of all assets filtered by type; detail viewer with Open in editor, AI edit, Share, Save, Delete.
- Settings: Runware API key (stored in SecureStore), default models per task, output quality, about.

## 2. Technical architecture

- **Expo SDK 58**, React Native 0.88, TypeScript, **Expo Router** (file‑based, `src/app`).
- **Dev build required** (Skia + FFmpeg are native): `npx expo run:ios` / `npx expo run:android` or EAS.
- State: **zustand** + AsyncStorage persistence (library, settings, editor state is local to screens).
- Rendering: **@shopify/react-native-skia** for photo editing (color matrices, paths, text, snapshot export).
- Media: expo-image-picker, expo-document-picker, expo-media-library, expo-file-system, expo-video, expo-audio, expo-video-thumbnails, expo-image-manipulator, expo-sharing.
- Video/audio processing: `@sheehanmunim/react-native-ffmpeg` (maintained ffmpeg‑kit fork) behind `src/lib/ffmpeg.ts`
  adapter. If the native module is missing (Expo Go / web) the editor still works for preview and shows a clear
  "export needs a dev build" message.
- Icons: lucide-react-native. Visuals: expo-linear-gradient, expo-blur, expo-haptics.

### Folder layout
```
src/app/                 routes
  (tabs)/index.tsx       Studio home
  (tabs)/create.tsx      Generation hub
  (tabs)/library.tsx     Library
  (tabs)/settings.tsx    Settings
  photo/editor.tsx       Manual photo editor (?uri=)
  photo/ai.tsx           AI photo edits (?uri=&tool=)
  video/editor.tsx       Timeline video editor (?uri=)
  video/ai.tsx           AI video edits (?uri=&tool=)
  audio/editor.tsx       Audio editor (?uri=)
  generate/image.tsx | generate/video.tsx | generate/audio.tsx
  asset/[id].tsx         Asset viewer
src/ui/                  design system (tokens + components)
src/lib/runware/         Runware client, task builders, model catalog
src/lib/                 media, ffmpeg adapter, utils
src/store/               zustand stores
src/features/<area>/     feature components (photo, video, audio, generate)
```

## 3. Runware integration

- Endpoint `POST https://api.runware.ai/v1`, body is an array of tasks, `Authorization: Bearer <key>`.
- **API key**: set `EXPO_PUBLIC_RUNWARE_API_KEY` in `.env` *or* paste it in **Settings → Runware API key** (SecureStore).
  Optional `EXPO_PUBLIC_RUNWARE_PROXY_URL` to route through your own backend (recommended for production so the key
  is never shipped inside the app binary).
- Uploads: `mediaStorage` (`operation: "upload"`, `media`: data URI) → `mediaUUID`/`mediaURL`, used in `inputs`.
- Long tasks (video, music): `deliveryMethod: "async"` + poll `getResponse` with backoff, surfacing `progress`.
- Inputs use the v1 `inputs` object (`seedImage`, `maskImage`, `referenceImages`, `frameImages`, `referenceVideos`, `video`, `image`, `audio`).
- Model ids live in one catalog (`src/lib/runware/models.ts`) and are user‑overridable in Settings, because the
  Runware catalog changes often. Defaults:

| Task | Default model (AIR) | Alternates |
|---|---|---|
| Text‑to‑image | `bfl:5@1` (FLUX.2 pro) | `google:nano-banana@2.1`, `bytedance:seedream@5.0-pro`, `ideogram:4.5@0` |
| Instruction image edit | `google:nano-banana@2.1` | `bfl:4@1` (Kontext max), `alibaba:qwen-image-edit@2511`, `bytedance:seedream@5.0-pro` |
| Object remove (image) | `bfl:flux@erase` | `ideogram:object-remover@0`, `bfl:1@2` (Fill pro) |
| Remove background | `bria:2@1` | `runware:112@5` |
| Upscale image | `bria:52@1` | `runware:500@1` |
| Text/Image‑to‑video | `klingai:kling-video@3-pro` | `google:3@3` (Veo 3.1 Fast), `bytedance:seedance@2.0`, `minimax:h3@0` |
| Video edit / scene change | `klingai:kling-video@o3-pro` | `bytedance:seedance@2.0`, `alibaba:wan@3.0`, `bfl:flux@video-edit-fast` |
| Video object remove | `bria:60@1` | |
| Video bg remove | `bria:51@1` | |
| Video upscale | `bytedance:video-enhancement@standard` | `bria:50@1` |
| Text‑to‑speech | `fishaudio:s2.1@pro` | `inworld:tts@2` |
| Music | `runware:ace-step@v1.5-turbo` | `runware:ace-step@v1.5-xl-sft` |
| Sound FX | `bytedance:seed-audio@1.0` | |

## 4. UX / visual direction

- **Dark‑first studio** (creative tools are used on dark canvases so the media pops). Near‑black `#09090C` canvas,
  layered surfaces, hairline borders, one electric accent (**volt lime `#C8FF4D`**) plus a warm signal (`#FF7A59`) for AI.
- Large type, tight tracking, rounded 20–28px cards, glass blur over media, haptics on every tool tap.
- Editors: full‑bleed preview, bottom tool rail (horizontal scroll of tools) + contextual panel (sliders/chips).
- AI actions always show a cost‑free preview of what will happen, a progress overlay with live status, and a
  before/after compare on result.

## 5. Delivery plan (parallel workstreams)

1. Foundation (this thread): scaffold, design system, Runware client, stores, navigation, home/library/settings.
2. Photo editor + photo AI.
3. Video editor + video AI.
4. Audio editor.
5. Generation screens (image / video / audio).
6. Integration, typecheck, lint, web smoke test, iOS + Android simulator runs.

## 6. Testing
- `npx tsc --noEmit`, `npx expo lint`, `npx expo export` (bundles for iOS/Android/web).
- Runware client unit-checked against request shapes; live calls need the key.
- Simulator runs on the developer Mac (`npx expo run:ios`, `npx expo run:android`).

## 7. Known limits / follow‑ups
- Shipping the API key in the app is fine for personal/dev use; production should use the proxy URL.
- Runware model ids/parameters change frequently; check each model's schema at
  `https://runware.ai/docs/models/<id>/schema.json` and adjust `models.ts`.
- On‑device FFmpeg increases app size (~30–60 MB).
