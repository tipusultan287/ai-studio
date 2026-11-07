# AI Studio

A cross-platform (iOS + Android) creative studio for **photos, video and audio**: full manual editors, AI edits
(replace background, remove/add objects, move your video to Mars…) and AI generation of images, video and audio.
All AI runs on [Runware](https://runware.ai). Built with Expo SDK 58 + React Native.

See [docs/PLAN.md](docs/PLAN.md) for the full product and technical plan.

## Add your Runware API key

Either:
1. `cp .env.example .env` and set `EXPO_PUBLIC_RUNWARE_API_KEY=...`, **or**
2. open the app → **Settings → Runware** and paste the key (stored in the device keychain; overrides `.env`).

Production tip: set `EXPO_PUBLIC_RUNWARE_PROXY_URL` to your own backend so the key never ships inside the app.
All request shapes live in `src/lib/runware/tasks.ts`; model ids in `src/lib/runware/models.ts` (also switchable in
Settings → AI models).

## Run it

The app uses native modules (Skia, FFmpeg), so use a development build, not Expo Go:

```bash
npm install                 # downloads FFmpeg binaries for ffmpeg-expo (postinstall)
npx expo run:ios            # iOS simulator (macOS + Xcode)
npx expo run:android        # Android emulator (Android Studio)
```

`npx expo start --web` also works for a quick UI look (no video/audio export on web).

## Checks

```bash
npx tsc --noEmit
npx expo lint
```

## Structure

```
src/app/          routes (Expo Router): (tabs) Studio/Create/Library/Settings, photo/, video/, audio/, generate/, asset/
src/ui/           design system (tokens + components)
src/lib/runware/  Runware client, task builders, model catalog
src/lib/          media helpers, FFmpeg adapter, useTask
src/features/     feature components per area
src/store/        zustand stores (library, settings)
```
