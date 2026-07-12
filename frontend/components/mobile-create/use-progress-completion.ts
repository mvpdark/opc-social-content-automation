"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { playAudioUnlockTick, playCompletionChime } from "@/components/mobile-create-helpers";
import {
  MOBILE_COMPLETION_VIBRATION_PATTERN,
  MOBILE_GENERATE_PROGRESS_DEFAULT_CEILING,
  MOBILE_GENERATE_PROGRESS_INITIAL_PERCENT,
  MOBILE_GENERATE_PROGRESS_INTERVAL_MS,
  buildMobileCompletionNotificationOptions,
  computeMobileProgressStep
} from "@/components/mobile-create-utils";
import type { GeneratedContent } from "@/lib/generated-assets";
import type { MobilePlatform } from "@/lib/mobile-runtime";

export function useProgressCompletion(
  busy: boolean,
  onAction: (message: string) => void,
  platform: MobilePlatform
) {
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressLabel, setProgressLabel] = useState("准备中");
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressCeilingRef = useRef(88);
  const progressLabelRef = useRef("准备中");
  const lastProgressActionRef = useRef("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const completionSoundReadyRef = useRef(false);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    if (!busy || progressPercent <= 0) {
      return;
    }

    const message = `${progressLabel}：${progressPercent}%，切换页面也会继续运行。`;
    if (lastProgressActionRef.current === message) {
      return;
    }

    lastProgressActionRef.current = message;
    onActionRef.current(message);
  }, [busy, progressLabel, progressPercent]);

  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const setProgressStage = useCallback((label: string, floor: number, ceiling: number) => {
    progressLabelRef.current = label;
    progressCeilingRef.current = ceiling;
    setProgressLabel(label);
    setProgressPercent((current) => Math.max(current, floor));
  }, []);

  const startProgress = useCallback((label: string) => {
    stopProgressTimer();
    progressLabelRef.current = label;
    progressCeilingRef.current = MOBILE_GENERATE_PROGRESS_DEFAULT_CEILING;
    lastProgressActionRef.current = "";
    setProgressLabel(label);
    setProgressPercent(MOBILE_GENERATE_PROGRESS_INITIAL_PERCENT);
    progressTimerRef.current = setInterval(() => {
      setProgressPercent((current) => {
        const ceiling = progressCeilingRef.current;
        if (current >= ceiling) {
          return current;
        }
        const step = computeMobileProgressStep(current);
        const next = Math.min(ceiling, current + step);
        return next;
      });
    }, MOBILE_GENERATE_PROGRESS_INTERVAL_MS);
  }, [stopProgressTimer]);

  const finishProgress = useCallback((label: string) => {
    stopProgressTimer();
    progressLabelRef.current = label;
    setProgressLabel(label);
    setProgressPercent(100);
  }, [stopProgressTimer]);

  const getCompletionAudioContext = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    if (audioContextRef.current?.state === "closed") {
      audioContextRef.current = null;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }
    return audioContextRef.current;
  }, []);

  const prepareCompletionFeedback = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const context = getCompletionAudioContext();
      if (context?.state === "suspended") {
        await context.resume();
      }
      if (context?.state === "running") {
        playAudioUnlockTick(context);
        completionSoundReadyRef.current = true;
      }
    } catch (_error) {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close().catch(() => undefined);
      }
      audioContextRef.current = null;
      completionSoundReadyRef.current = false;
    }

    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => undefined);
    }
  }, [getCompletionAudioContext]);

  const playCompletionSound = useCallback(async () => {
    const context = getCompletionAudioContext();
    if (!context) {
      return false;
    }

    try {
      if (context.state === "suspended") {
        await context.resume();
      }
      if (context.state !== "running") {
        return false;
      }
      playCompletionChime(context);
      completionSoundReadyRef.current = true;
      return true;
    } catch (_error) {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        void audioContextRef.current.close().catch(() => undefined);
      }
      audioContextRef.current = null;
      completionSoundReadyRef.current = false;
      return false;
    }
  }, [getCompletionAudioContext]);

  const showCompletionNotification = useCallback(async (content: GeneratedContent) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const { title, options } = buildMobileCompletionNotificationOptions(platform, content.id);

      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration?.showNotification) {
            await registration.showNotification(title, options);
            return;
          }
        }

        new Notification(title, options);
      } catch (_error) {
        // Some mobile browsers only allow ServiceWorkerRegistration.showNotification().
      }
    }
  }, [platform]);

  const notifyGenerationComplete = useCallback(async (content: GeneratedContent) => {
    const soundPlayed = await playCompletionSound();
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(MOBILE_COMPLETION_VIBRATION_PATTERN);
    }
    await showCompletionNotification(content);
    if (!soundPlayed && !completionSoundReadyRef.current) {
      onAction("已完成；提示音被浏览器拦截了，下次请先点一次一键生成按钮解锁声音。");
    }
  }, [playCompletionSound, showCompletionNotification, onAction]);

  return {
    progressPercent,
    progressLabel,
    setProgressPercent,
    setProgressLabel,
    stopProgressTimer,
    setProgressStage,
    startProgress,
    finishProgress,
    prepareCompletionFeedback,
    notifyGenerationComplete
  };
}
