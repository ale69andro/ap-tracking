// Soft two-tone chime for rest-timer completion.
// Uses Web Audio API synthesis — no audio files needed.
// Must be unlocked via unlockAudio() after a user gesture (Safari/iOS requirement).

let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
  } catch {
    // unsupported — fail silently
  }
}

export function playRestChime(): void {
  try {
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime;
    // Two soft sine tones: root → fifth, short overlap
    [[523.25, 0], [783.99, 0.12]].forEach(([freq, delay]) => {
      const osc   = ctx!.createOscillator();
      const gain  = ctx!.createGain();
      osc.type    = "sine";
      osc.frequency.value = freq;
      // Gentle envelope: fast attack, smooth decay
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.015);
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
