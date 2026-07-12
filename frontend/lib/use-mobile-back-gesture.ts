"use client";

import { useCallback, useMemo, useRef, type PointerEvent, type TouchEvent } from "react";
import type { MobileBackRequestSource } from "@/lib/mobile-back-navigation";

type MobileBackGestureStart = {
  edge: "left" | "right";
  ignored: boolean;
  pointerId?: number;
  x: number;
  y: number;
};

const MOBILE_BACK_GESTURE_EDGE_WIDTH = 64;
const MOBILE_BACK_GESTURE_MIN_DISTANCE = 72;
const MOBILE_BACK_GESTURE_MAX_VERTICAL = 96;
const MOBILE_BACK_GESTURE_DIRECTION_RATIO = 1.25;

type MobileBackGestureHandlers = {
  onBackGestureCancel: () => void;
  onBackGestureEnd: (event: TouchEvent<HTMLDivElement>) => void;
  onBackGestureStart: (event: TouchEvent<HTMLDivElement>) => void;
  onBackPointerCancel: () => void;
  onBackPointerEnd: (event: PointerEvent<HTMLDivElement>) => void;
  onBackPointerStart: (event: PointerEvent<HTMLDivElement>) => void;
};

export function useMobileBackGesture(
  onBackRequest: (source: MobileBackRequestSource) => boolean
): MobileBackGestureHandlers {
  const mobileBackGestureStartRef = useRef<MobileBackGestureStart | null>(null);

  const shouldIgnoreMobileBackGesture = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) {
      return false;
    }
    return Boolean(
      target.closest(
        'button, input, textarea, select, a, [contenteditable="true"], [data-mobile-back-swipe-ignore="true"], [data-project-swipe-ignore="true"]'
      )
    );
  }, []);

  const beginMobileBackGesture = useCallback(({
    clientX,
    clientY,
    pointerId,
    target
  }: {
    clientX: number;
    clientY: number;
    pointerId?: number;
    target: EventTarget | null;
  }) => {
    if (typeof window === "undefined") {
      return;
    }

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const isLeftEdge = clientX <= MOBILE_BACK_GESTURE_EDGE_WIDTH;
    const isRightEdge = clientX >= viewportWidth - MOBILE_BACK_GESTURE_EDGE_WIDTH;
    if (!isLeftEdge && !isRightEdge) {
      mobileBackGestureStartRef.current = null;
      return;
    }

    mobileBackGestureStartRef.current = {
      edge: isLeftEdge ? "left" : "right",
      ignored: shouldIgnoreMobileBackGesture(target),
      pointerId,
      x: clientX,
      y: clientY
    };
  }, [shouldIgnoreMobileBackGesture]);

  const clearMobileBackGesture = useCallback(() => {
    mobileBackGestureStartRef.current = null;
  }, []);

  const finishMobileBackGesture = useCallback(({
    clientX,
    clientY,
    preventDefault,
    stopPropagation
  }: {
    clientX: number;
    clientY: number;
    preventDefault: () => void;
    stopPropagation: () => void;
  }) => {
    const start = mobileBackGestureStartRef.current;
    mobileBackGestureStartRef.current = null;
    if (!start || start.ignored) {
      return;
    }

    const deltaX = clientX - start.x;
    const deltaY = clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const isLeftBackSwipe = start.edge === "left" && deltaX >= MOBILE_BACK_GESTURE_MIN_DISTANCE;
    const isRightBackSwipe = start.edge === "right" && deltaX <= -MOBILE_BACK_GESTURE_MIN_DISTANCE;

    if (
      (isLeftBackSwipe || isRightBackSwipe) &&
      absY <= MOBILE_BACK_GESTURE_MAX_VERTICAL &&
      absX > absY * MOBILE_BACK_GESTURE_DIRECTION_RATIO
    ) {
      preventDefault();
      stopPropagation();
      onBackRequest("gesture");
    }
  }, [onBackRequest]);

  const handleMobileBackTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    beginMobileBackGesture({
      clientX: touch.clientX,
      clientY: touch.clientY,
      target: event.target
    });
  }, [beginMobileBackGesture]);

  const handleMobileBackTouchEnd = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }
    finishMobileBackGesture({
      clientX: touch.clientX,
      clientY: touch.clientY,
      preventDefault: () => event.preventDefault(),
      stopPropagation: () => event.stopPropagation()
    });
  }, [finishMobileBackGesture]);

  const handleMobileBackPointerStart = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    beginMobileBackGesture({
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      target: event.target
    });
  }, [beginMobileBackGesture]);

  const handleMobileBackPointerEnd = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const start = mobileBackGestureStartRef.current;
    if (start?.pointerId !== undefined && start.pointerId !== event.pointerId) {
      return;
    }
    finishMobileBackGesture({
      clientX: event.clientX,
      clientY: event.clientY,
      preventDefault: () => event.preventDefault(),
      stopPropagation: () => event.stopPropagation()
    });
  }, [finishMobileBackGesture]);

  return useMemo(() => ({
    onBackGestureCancel: clearMobileBackGesture,
    onBackGestureEnd: handleMobileBackTouchEnd,
    onBackGestureStart: handleMobileBackTouchStart,
    onBackPointerCancel: clearMobileBackGesture,
    onBackPointerEnd: handleMobileBackPointerEnd,
    onBackPointerStart: handleMobileBackPointerStart
  }), [
    clearMobileBackGesture,
    handleMobileBackTouchEnd,
    handleMobileBackTouchStart,
    handleMobileBackPointerEnd,
    handleMobileBackPointerStart
  ]);
}
