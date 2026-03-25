import { X } from "lucide-react";

type Props = {
  remaining: number;
  total: number;
  done: boolean;
  restedSeconds: number;
  onSkip: () => void;
  onAdjust: (delta: number) => void;
  onExtend: (seconds: number) => void;
};

export default function RestTimer({ remaining, total, done, restedSeconds, onSkip, onAdjust, onExtend }: Props) {
  const totalSeconds = Math.floor(restedSeconds);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const restedFormatted = `${m}:${String(s).padStart(2, '0')}`;
  return (
    <div className={`mx-2 mb-2 rounded-xl px-4 py-3 ${
      done
        ? "bg-emerald-500/10 border border-emerald-500/20"
        : "bg-zinc-900 border border-zinc-800"
    }`}>
      {done ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-black text-white leading-none">Ready</p>
            <p className="text-[11px] text-emerald-400 mt-0.5">Rested {restedFormatted}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExtend(30)}
              className="h-8 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-bold transition-colors tabular-nums"
            >
              +30s
            </button>
            <button
              onClick={() => onExtend(60)}
              className="h-8 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-bold transition-colors tabular-nums"
            >
              +60s
            </button>
            <button
              onClick={onSkip}
              className="text-zinc-500 hover:text-zinc-300 flex items-center justify-center px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-0.5">Resting</p>
            <p className="text-4xl font-black text-white tabular-nums leading-none">{remaining}s</p>
          </div>
          <div className="flex-1 flex flex-col gap-2.5 items-end">
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full"
                style={{ width: `${(remaining / total) * 100}%`, transition: 'width 500ms linear' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAdjust(-10)}
                className="w-10 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-bold transition-colors tabular-nums"
              >
                -10
              </button>
              <button
                onClick={() => onAdjust(+10)}
                className="w-10 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-bold transition-colors tabular-nums"
              >
                +10
              </button>
              <button
                onClick={onSkip}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-wider font-semibold ml-1"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
