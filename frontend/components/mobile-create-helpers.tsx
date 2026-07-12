"use client";

import {
  filterDeletedMobileDraftHistory,
  normalizeMobileDraftHistory,
  type MobileDraftHistoryItem
} from "@/lib/mobile-draft-storage";

export function normalizeVisibleDraftHistory(nextItems: MobileDraftHistoryItem[]) {
  return filterDeletedMobileDraftHistory(normalizeMobileDraftHistory(nextItems));
}

export function playAudioUnlockTick(context: AudioContext) {
  const now = context.currentTime;
  const gain = context.createGain();
  const oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(440, now);
  gain.gain.setValueAtTime(0.0001, now);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.03);
}

const COMPLETION_CHIME_NOTES = [
  { delay: 0, duration: 0.14, frequency: 659.25, volume: 0.22 },
  { delay: 0.15, duration: 0.16, frequency: 783.99, volume: 0.24 },
  { delay: 0.32, duration: 0.28, frequency: 1046.5, volume: 0.2 }
] as const;

export function playCompletionChime(context: AudioContext) {
  const now = context.currentTime;

  COMPLETION_CHIME_NOTES.forEach((note) => {
    const startAt = now + note.delay;
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(note.frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(note.volume, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + note.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + note.duration + 0.03);
  });
}
