import { type AudioPlayer, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import { srcToVirt, totalLength, virtToSrc } from './timeline';
import type { EditState } from './types';
import type { Selection } from './Waveform';

function setVolume(p: AudioPlayer, v: number) {
  p.volume = v;
}

/**
 * Plays the source with the edit list applied live where possible: kept
 * segments (skipping deleted ranges), speed, gain (attenuation only) and
 * looping the selection. Filters/effects are heard after "Apply".
 */
export function usePreview(src: string | null, state: EditState | null, selection: Selection, loop: boolean) {
  const player = useAudioPlayer(null, { updateInterval: 50 });
  const status = useAudioPlayerStatus(player);
  const segIdx = useRef(0);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!src) return;
    player.replace({ uri: src });
    segIdx.current = 0;
  }, [player, src]);

  const speed = state?.speed ?? 1;
  const gainDb = state?.gainDb ?? 0;
  useEffect(() => {
    player.setPlaybackRate(speed, 'high');
  }, [player, speed]);
  useEffect(() => {
    setVolume(player, Math.min(1, Math.pow(10, gainDb / 20)));
  }, [player, gainDb]);

  const segments = state?.segments;
  const length = segments ? totalLength(segments) : 0;
  const virt = segments ? srcToVirt(segments, status.currentTime) : 0;

  const seekVirt = useCallback(
    (t: number) => {
      if (!segments?.length) return;
      const { src: s, index } = virtToSrc(segments, Math.max(0, Math.min(length, t)));
      segIdx.current = index;
      void player.seekTo(s);
    },
    [player, segments, length],
  );

  // Segment skipping + selection looping while playing.
  useEffect(() => {
    if (!status.playing || !segments?.length) return;
    if (loop && selection && virt >= selection.b - 0.02) {
      seekVirt(selection.a);
      return;
    }
    const i = Math.min(segIdx.current, segments.length - 1);
    const seg = segments[i];
    if (status.currentTime < seg.start - 0.25) {
      void player.seekTo(seg.start);
    } else if (status.currentTime >= seg.end - 0.02) {
      if (i + 1 < segments.length) {
        segIdx.current = i + 1;
        void player.seekTo(segments[i + 1].start);
      } else {
        player.pause();
        segIdx.current = 0;
        void player.seekTo(segments[0].start);
      }
    }
  }, [status.currentTime, status.playing, segments, loop, selection, virt, player, seekVirt]);

  const toggle = useCallback(() => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (loop && selection && (virt < selection.a || virt >= selection.b - 0.05)) seekVirt(selection.a);
    else if (virt >= length - 0.05) seekVirt(0);
    player.play();
  }, [status.playing, player, loop, selection, virt, length, seekVirt]);

  const pause = useCallback(() => player.pause(), [player]);

  return { player, status, time: Math.min(virt, length), length, seek: seekVirt, toggle, pause, loadedDuration: status.duration };
}
