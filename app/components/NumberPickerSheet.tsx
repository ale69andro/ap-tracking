"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Props = {
  isOpen: boolean;
  title: "Weight" | "Reps";
  currentValue: number;
  minValue: number;
  maxValue: number;
  increment: number;
  onChange: (value: number) => void;
  onClose: () => void;
};

export default function NumberPickerSheet({
  isOpen,
  title,
  currentValue,
  minValue,
  maxValue,
  increment,
  onChange,
  onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedValue, setSelectedValue] = useState(currentValue);

  // Generate array of selectable numbers
  const numArray = useCallback(() => {
    const result: number[] = [];
    for (let i = minValue; i <= maxValue; i += increment) {
      result.push(parseFloat(i.toFixed(1)));
    }
    return result;
  }, [minValue, maxValue, increment])();

  // Scroll to center the current value when sheet opens
  useEffect(() => {
    if (!isOpen) return;

    const itemHeight = 40;
    const idx = numArray.indexOf(currentValue);
    const scrollTop = idx * itemHeight;

    // rAF: DOM must be rendered before scrollTop is writable
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = Math.max(0, scrollTop);
      }
      // Sync selectedValue after the scroll settles (async — not a sync setState in effect)
      setSelectedValue(currentValue);
    });
  }, [isOpen, currentValue, numArray]);

  // Track scroll → live-update value + haptic
  // With 80px top padding, item i has its center at (i * 40 + 100) in scroll content.
  // The visible center is at scrollTop + 100. Snap aligns scrollTop = i * 40.
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const itemHeight = 40;
    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, numArray.length - 1));
    const newValue = numArray[clampedIndex];

    if (newValue !== selectedValue) {
      setSelectedValue(newValue);
      onChange(newValue);
      // Lightweight haptic — silent on iOS Safari, works on Android Chrome
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(8);
      }
    }
  }, [numArray, selectedValue, onChange]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-t-3xl px-6 pt-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black text-white tracking-wide">{title}</h2>
          <button
            onClick={onClose}
            className="text-sm font-bold text-red-500 hover:text-red-400 active:text-red-600 transition-colors px-2 py-1"
          >
            Done
          </button>
        </div>

        {/* Scrollable number picker */}
        <div className="relative">
          {/* Center-row highlight */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 border-y border-red-500/40 pointer-events-none bg-red-500/5" />

          {/* Scrollable list */}
          <div
            ref={containerRef}
            className="h-[200px] overflow-y-scroll snap-y snap-mandatory"
            onScroll={handleScroll}
          >
            {/* Padding items so first/last values can center */}
            <div className="h-[80px]" />

            {numArray.map((num) => (
              <div
                key={`${num}`}
                className="h-10 flex items-center justify-center snap-center"
              >
                <span
                  className={`text-center font-semibold transition-all duration-75 tabular-nums select-none ${
                    num === selectedValue
                      ? "text-white text-2xl font-black"
                      : Math.abs(num - selectedValue) <= increment * 2
                      ? "text-zinc-400 text-lg"
                      : "text-zinc-600 text-base"
                  }`}
                >
                  {num}
                </span>
              </div>
            ))}

            {/* Padding items so first/last values can center */}
            <div className="h-[80px]" />
          </div>
        </div>

        {/* Unit label */}
        <p className="text-center text-zinc-600 text-xs mt-3 tracking-widest uppercase">
          {title === "Weight" ? "kg" : "reps"}
        </p>
      </div>
    </div>
  );
}
