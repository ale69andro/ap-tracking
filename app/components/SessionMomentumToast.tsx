"use client";

import { useEffect, useState } from "react";

type Props = {
  message: string;
  onDismiss: () => void;
};

export default function SessionMomentumToast({ message, onDismiss }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeTimer  = setTimeout(() => setVisible(false), 1800);
    const closeTimer = setTimeout(() => onDismiss(), 2100);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="px-5 py-3 rounded-full bg-zinc-900 border border-zinc-700 shadow-lg whitespace-nowrap">
        <p className="text-sm font-semibold text-white">{message}</p>
      </div>
    </div>
  );
}
