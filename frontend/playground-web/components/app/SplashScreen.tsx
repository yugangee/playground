"use client";

import { useState, useEffect } from "react";

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 300);
    const t2 = setTimeout(() => setPhase("exit"), 1500);
    const t3 = setTimeout(() => onFinish(), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-black"
      style={{
        opacity: phase === "exit" ? 0 : 1,
        transition: "opacity 0.4s ease-out",
      }}
    >
      <h1
        className="text-3xl font-black tracking-tight text-black dark:text-white"
        style={{
          opacity: phase === "enter" ? 0 : 1,
          transition: "opacity 0.3s ease",
        }}
      >
        PLAYGROUND
      </h1>
    </div>
  );
}
