import { useCallback, useEffect, useRef } from "react";
import type { MouseEventHandler, PointerEventHandler, TouchEventHandler } from "react";

type TouchGestureTarget = HTMLElement;

type TouchGestureOptions = {
  enabled: boolean;
  onLongPress: (target: TouchGestureTarget) => void;
  onSwipeLeft: (target: TouchGestureTarget) => void;
  longPressMs?: number;
  swipeThreshold?: number;
};

type GestureState = {
  pointerId: number;
  startX: number;
  startY: number;
  target: TouchGestureTarget;
  timer: number;
  consumed: boolean;
};

/**
 * Scroll-safe mobile-pointer recognizer for an existing action surface.
 * Vertical motion remains native scrolling; a hold or deliberate left swipe
 * calls the same action callback used by right-click and the visible ellipsis
 * button. The caller gates this to touch-primary runtimes, so iPad pointers and
 * simulator-injected mouse events work without changing Desktop behavior.
 */
export function useTouchActionGesture({
  enabled,
  onLongPress,
  onSwipeLeft,
  longPressMs = 450,
  swipeThreshold = 56,
}: TouchGestureOptions) {
  const gestureRef = useRef<GestureState | null>(null);
  const suppressClickUntilRef = useRef(0);

  const clearGesture = useCallback(() => {
    if (gestureRef.current) window.clearTimeout(gestureRef.current.timer);
    gestureRef.current = null;
  }, []);

  useEffect(() => clearGesture, [clearGesture]);

  const startGesture = useCallback((pointerId: number, x: number, y: number, target: TouchGestureTarget) => {
    clearGesture();
    const state: GestureState = {
      pointerId,
      startX: x,
      startY: y,
      target,
      timer: 0,
      consumed: false,
    };
    state.timer = window.setTimeout(() => {
      const active = gestureRef.current;
      if (!active || active.pointerId !== state.pointerId || active.consumed) return;
      active.consumed = true;
      suppressClickUntilRef.current = Date.now() + 700;
      onLongPress(active.target);
    }, longPressMs);
    gestureRef.current = state;
  }, [clearGesture, longPressMs, onLongPress]);

  const moveGesture = useCallback((pointerId: number, x: number, y: number) => {
    const state = gestureRef.current;
    if (!state || state.pointerId !== pointerId || state.consumed) return;
    const dx = x - state.startX;
    const dy = y - state.startY;
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) window.clearTimeout(state.timer);
    if (dx <= -swipeThreshold && Math.abs(dx) > Math.abs(dy) * 1.25) {
      state.consumed = true;
      suppressClickUntilRef.current = Date.now() + 700;
      onSwipeLeft(state.target);
    }
  }, [onSwipeLeft, swipeThreshold]);

  const onPointerDown = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    if (!enabled || event.button !== 0) return;
    startGesture(event.pointerId, event.clientX, event.clientY, event.currentTarget);
  }, [enabled, startGesture]);

  const onPointerMove = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    moveGesture(event.pointerId, event.clientX, event.clientY);
  }, [moveGesture]);

  const onPointerEnd = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    if (gestureRef.current?.pointerId !== event.pointerId) return;
    clearGesture();
  }, [clearGesture]);

  const onClickCapture = useCallback<MouseEventHandler<HTMLElement>>((event) => {
    if (Date.now() >= suppressClickUntilRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // WKWebView can expose real finger gestures as Touch Events without the
  // corresponding Pointer Events (notably through XCUITest and older iOS
  // webviews). Give that input stream a distinct id so pointer-up cannot clear
  // an active touch gesture when both APIs are emitted for the same contact.
  const onTouchStart = useCallback<TouchEventHandler<HTMLElement>>((event) => {
    if (!enabled || event.touches.length !== 1) return;
    const touch = event.touches[0];
    startGesture(1_000_000 + touch.identifier, touch.clientX, touch.clientY, event.currentTarget);
  }, [enabled, startGesture]);

  const onTouchMove = useCallback<TouchEventHandler<HTMLElement>>((event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    moveGesture(1_000_000 + touch.identifier, touch.clientX, touch.clientY);
  }, [moveGesture]);

  const onTouchEnd = useCallback<TouchEventHandler<HTMLElement>>((event) => {
    const touch = event.changedTouches[0];
    if (!touch || gestureRef.current?.pointerId !== 1_000_000 + touch.identifier) return;
    clearGesture();
  }, [clearGesture]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: onTouchEnd,
    onClickCapture,
  };
}
