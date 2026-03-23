// Soft double-beep for rest-timer completion.
// Uses Web Audio API synthesis — no audio files needed.
// Must be unlocked via unlockAudio() after a user gesture (Safari/iOS requirement).

let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    if (!ctx) {
      ctx = new AudioContext();
    }
    if (ctx.state === "suspended") {
      ctx.resume();
    }
  } catch {
    // unsupported — fail silently
  }
}

export async function playRestChime(): Promise<void> {
  try {
    if (!ctx) return;

    // iOS re-suspends AudioContext during long silences (rest period).
    // Resume here — safe after a prior user-gesture unlock.
    if (ctx.state !== "running") {
      await ctx.resume();
    }

    if (ctx.state !== "running") return; // gave up — fail silently

    const now = ctx.currentTime;

    // Two sequential beeps: 650 Hz then 780 Hz, separated by a 120ms gap.
    // Beep 1 at t=now, Beep 2 at t=now+0.24 (120ms duration + 120ms gap).
    // Triangle wave adds odd harmonics (1950, 3250 Hz…) that cut through gym noise
    // without sounding harsh. Rising pitch creates a natural confirmation feel.
    ([
      [650, now],
      [780, now + 0.24],
    ] as [number, number][]).forEach(([freq, start]) => {
      const osc  = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      // Short attack (10ms), fast exponential decay — silent by 120ms
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.23, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      osc.connect(gain);
      gain.connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.13); // tiny buffer after envelope reaches silence
    });
  } catch {
    // fail silently
  }
}
