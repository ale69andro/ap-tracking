// Soft two-tone chime for rest-timer completion.
// Uses Web Audio API synthesis — no audio files needed.
// Must be unlocked via unlockAudio() after a user gesture (Safari/iOS requirement).

let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      // DEBUG — remove after confirming iOS playback
      console.log("[restSound] AudioContext created, state:", ctx.state);
    }
    if (ctx.state === "suspended") {
      ctx.resume().then(() => {
        // DEBUG — remove after confirming iOS playback
        console.log("[restSound] unlockAudio resume resolved, state:", ctx!.state);
      });
    }
  } catch {
    // unsupported — fail silently
  }
}

// DEBUG gain — 0.45 for testing audibility on iPhone speaker.
// TODO: revert to 0.18 once playback is confirmed working.
const GAIN = 0.45;

export async function playRestChime(): Promise<void> {
  try {
    if (!ctx) return;

    // DEBUG — remove after confirming iOS playback
    console.log("[restSound] playRestChime called, ctx.state:", ctx.state);

    // iOS re-suspends AudioContext during long silences (rest period).
    // Resume here — this is safe after a prior user-gesture unlock.
    if (ctx.state !== "running") {
      await ctx.resume();
      // DEBUG — remove after confirming iOS playback
      console.log("[restSound] ctx.resume() resolved, state now:", ctx.state);
    }

    if (ctx.state !== "running") return; // gave up — fail silently

    const now = ctx.currentTime;
    // Two soft sine tones: root → fifth, short overlap
    [[523.25, 0], [783.99, 0.12]].forEach(([freq, delay]) => {
      const osc  = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(GAIN, now + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.35);
      osc.connect(gain);
      gain.connect(ctx!.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.4);
    });
  } catch {
    // fail silently
  }
}
