"use client";

import { useState, useEffect, useRef } from "react";

// ── Cycle (≈5.2s total) ──────────────────────────────────────────────────────
//   0ms    : set 3 active — waiting
//   1400ms : button press visual
//   1600ms : set 3 completes, completed row fades in (opacity only, stays in place)
//   2600ms : result chip mounts → fades in
//   3900ms : chip fades out
//   4200ms : rows fade out (sets area goes invisible)
//   4450ms : state resets while invisible — no flash
//   4550ms : rows fade back in with fresh active set
//   5200ms : next cycle
// ─────────────────────────────────────────────────────────────────────────────

export default function AppMockupAnimated() {
  const [btnPressed,   setBtnPressed]   = useState(false);
  const [set3Done,     setSet3Done]     = useState(false);  // swap active → completed
  const [set3In,       setSet3In]       = useState(false);  // opacity fade for completed row
  const [chipMounted,  setChipMounted]  = useState(false);
  const [chipIn,       setChipIn]       = useState(false);
  const [rowsVisible,  setRowsVisible]  = useState(true);   // fades on loop reset

  const pendingRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const after = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      pendingRef.current.push(t);
    };

    const clearAll = () => {
      pendingRef.current.forEach(clearTimeout);
      pendingRef.current = [];
    };

    const cycle = () => {
      after(() => setBtnPressed(true),                                          1400);
      after(() => { setBtnPressed(false); setSet3Done(true); },                 1600);
      after(() => setSet3In(true),                                              1660);  // mount delay → fade in
      after(() => setChipMounted(true),                                         2600);
      after(() => setChipIn(true),                                              2660);
      after(() => setChipIn(false),                                             3900);  // chip exits
      after(() => setRowsVisible(false),                                        4200);  // rows fade out
      after(() => {                                                              // state reset (invisible)
        setSet3Done(false);
        setSet3In(false);
        setChipMounted(false);
      }, 4450);
      after(() => setRowsVisible(true),                                         4550);  // rows fade in with active set
      after(() => { clearAll(); cycle(); },                                     5200);
    };

    cycle();
    return clearAll;
  }, []);

  return (
    <div className="relative w-full max-w-[340px] mx-auto lg:mx-0 lg:ml-auto">
      {/* Ambient glow */}
      <div className="absolute -inset-6 bg-red-500/8 rounded-3xl blur-3xl pointer-events-none" />

      {/* Phone shell */}
      <div className="relative rounded-[32px] border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl shadow-black/70 ring-1 ring-white/5">

        {/* iOS status bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1">
          <span className="text-[11px] text-zinc-500 font-semibold tabular-nums">9:41</span>
          <div className="w-[72px] h-5 rounded-full bg-zinc-900 border border-zinc-800" />
          <div className="flex gap-1.5 items-center">
            <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
              <rect x="0"  y="4"   width="3" height="7"   rx="1" fill="#52525b" />
              <rect x="4"  y="2.5" width="3" height="8.5" rx="1" fill="#52525b" />
              <rect x="8"  y="1"   width="3" height="10"  rx="1" fill="#71717a" />
              <rect x="12" y="0"   width="3" height="11"  rx="1" fill="#71717a" />
            </svg>
          </div>
        </div>

        {/* App content */}
        <div className="px-3 pt-1 pb-6 space-y-3">

          {/* Workout header */}
          <div className="flex items-center justify-between px-1 py-2">
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">Push Day A</p>
              <p className="text-[13px] font-bold text-white leading-tight">Week 4 · Day 1</p>
            </div>
            <span className="text-[13px] font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg tabular-nums">
              32:14
            </span>
          </div>

          {/* ExerciseCard — exact styles from ExerciseCard.tsx */}
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden">

            {/* Card header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-4 border-b border-zinc-800/60">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white tracking-wide truncate">Bench Press</h3>
                <p className="text-[11px] text-zinc-600 mt-0.5 tracking-wide">Chest · Triceps</p>
                <p className="text-[11px] text-zinc-700 mt-0.5 tabular-nums">Last · 80 kg × 8</p>
              </div>
              <div className="ml-3 shrink-0 opacity-40">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="9"  cy="5"  r="1" fill="#71717a" />
                  <circle cx="9"  cy="12" r="1" fill="#71717a" />
                  <circle cx="9"  cy="19" r="1" fill="#71717a" />
                  <circle cx="15" cy="5"  r="1" fill="#71717a" />
                  <circle cx="15" cy="12" r="1" fill="#71717a" />
                  <circle cx="15" cy="19" r="1" fill="#71717a" />
                </svg>
              </div>
            </div>

            {/* Coach block — exact styles from ExerciseCard.tsx */}
            <div className="px-4 py-2 border-b border-zinc-800/40 space-y-0.5">
              <p className="text-[11px] text-zinc-500 tabular-nums">Last · 80 kg × 8</p>
              {/* CoachLabel exact: text-[10px] uppercase tracking-widest text-red-500 font-semibold mb-0.5 */}
              <p className="text-[10px] uppercase tracking-widest text-red-500 font-semibold mt-1 mb-0.5">COACH</p>
              <p className="text-[13px] font-bold text-white tabular-nums leading-tight">82.5 kg × 6–8</p>

              {/* Result chip — appears after set completes */}
              {chipMounted && (
                <div
                  className={`flex items-center gap-2 mt-2 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 transition-all duration-500 ${
                    chipIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-emerald-400 text-[10px] font-bold">New best</span>
                  <span className="text-zinc-500 text-[10px] tabular-nums">82.5 × 6</span>
                </div>
              )}
            </div>

            {/* Sets — fades as a unit on reset so there's no pop */}
            <div className={`px-3 pt-3 pb-1 transition-opacity duration-200 ${rowsVisible ? "opacity-100" : "opacity-0"}`}>

              {/* Column labels — grid-cols-[2rem_1fr_1fr_3.5rem] from ExerciseCard.tsx */}
              <div className="grid grid-cols-[2rem_1fr_1fr_3.5rem] gap-2 text-[10px] text-zinc-500 font-medium uppercase tracking-widest px-2 mb-1">
                <span /><span>kg</span><span>Reps</span><span />
              </div>

              <div className="space-y-2">

                {/* Sets 1 & 2 — completed, static */}
                <CompletedSetRow weight="80" reps="8" />
                <CompletedSetRow weight="80" reps="8" />

                {/* Set 3 — transitions between active and completed */}
                {!set3Done ? (
                  <ActiveSet3 btnPressed={btnPressed} />
                ) : (
                  /* Completed — exact SetRow.tsx completed styles */
                  /* opacity-only fade: completes in place, no slide */
                  <div
                    className={`grid grid-cols-[2rem_1fr_1fr_5rem] items-center gap-2 px-2 py-3 transition-opacity duration-300 ${
                      set3In ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {/* text-emerald-700 matches SetRow.tsx exactly */}
                    <span className="text-[11px] font-black text-center leading-none text-emerald-700">✓</span>
                    <span className="text-sm font-semibold text-zinc-600 tabular-nums text-center">
                      82.5<span className="text-zinc-700 font-normal text-xs ml-0.5">kg</span>
                    </span>
                    <span className="text-sm font-semibold text-zinc-600 tabular-nums text-center">
                      6<span className="text-zinc-700 font-normal text-xs ml-0.5">reps</span>
                    </span>
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-700"><IconUndo /></div>
                      <div className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-700"><IconTrash /></div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Add Set */}
            <div className="px-3 pb-1 pt-2">
              <div className="w-full py-2 rounded-xl border border-zinc-700 bg-zinc-800/50 text-zinc-500 text-xs font-semibold text-center">
                + Add Set
              </div>
            </div>

            {/* Rest toggle */}
            <div className="px-3 pb-3 pt-1">
              <div className="w-full py-1 text-[10px] text-zinc-700 uppercase tracking-widest font-semibold text-center">
                Rest ↓
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── Static sub-components ────────────────────────────────────────────────────

function CompletedSetRow({ weight, reps }: { weight: string; reps: string }) {
  return (
    <div className="grid grid-cols-[2rem_1fr_1fr_5rem] items-center gap-2 px-2 py-3">
      <span className="text-[11px] font-black text-center leading-none text-emerald-700">✓</span>
      <span className="text-sm font-semibold text-zinc-600 tabular-nums text-center">
        {weight}<span className="text-zinc-700 font-normal text-xs ml-0.5">kg</span>
      </span>
      <span className="text-sm font-semibold text-zinc-600 tabular-nums text-center">
        {reps}<span className="text-zinc-700 font-normal text-xs ml-0.5">reps</span>
      </span>
      <div className="flex items-center justify-center gap-1.5">
        <div className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-700"><IconUndo /></div>
        <div className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-700"><IconTrash /></div>
      </div>
    </div>
  );
}

function ActiveSet3({ btnPressed }: { btnPressed: boolean }) {
  return (
    /* Exact styles from SetRow.tsx isActive state */
    <div className="rounded-xl bg-red-500/[0.08] border border-red-500/30 shadow-[0_0_24px_rgba(239,68,68,0.14)]">
      {/* grid-cols-[2rem_1fr_1fr_2rem_3.5rem] from SetRow.tsx */}
      <div className="grid grid-cols-[2rem_1fr_1fr_2rem_3.5rem] items-stretch gap-2 px-2 pt-2">

        {/* Set number — bg-zinc-800/50 matches SetRow number button */}
        <div className="flex items-center justify-center rounded-lg bg-zinc-800/50 py-3.5">
          <span className="text-xs font-black text-zinc-500">3</span>
        </div>

        {/* Weight input — exact input styles from SetRow.tsx */}
        <div className="flex flex-col gap-1">
          <div className="w-full bg-zinc-800 border border-zinc-700/80 rounded-lg py-3.5 text-lg font-semibold text-center text-white tabular-nums">
            82.5
          </div>
          <div className="flex gap-1">
            {["-2.5", "+2.5", "+5"].map((d) => (
              <div key={d} className="flex-1 py-2.5 text-[10px] text-zinc-600 rounded text-center leading-none tabular-nums">{d}</div>
            ))}
          </div>
        </div>

        {/* Reps input */}
        <div className="flex flex-col gap-1">
          <div className="w-full bg-zinc-800 border border-zinc-700/80 rounded-lg py-3.5 text-lg font-semibold text-center text-white tabular-nums">
            6
          </div>
          <div className="flex gap-1">
            {["-1", "+1"].map((d) => (
              <div key={d} className="flex-1 py-2.5 text-[10px] text-zinc-600 rounded text-center leading-none tabular-nums">{d}</div>
            ))}
          </div>
        </div>

        {/* Delete placeholder */}
        <div className="flex items-center justify-center text-zinc-700">
          <IconTrash />
        </div>

        {/* Complete button — bg-red-600 rounded-xl from SetRow.tsx */}
        {/* Press: scale-[0.93] — subtle enough to read as a tap */}
        <div
          className={`flex items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-500/25 text-white font-black text-xl min-h-[44px] transition-all duration-100 ${
            btnPressed ? "scale-[0.93] opacity-80" : "scale-100 opacity-100"
          }`}
        >
          ✓
        </div>

      </div>
    </div>
  );
}

function IconUndo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14L4 9l5-5"/>
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}
