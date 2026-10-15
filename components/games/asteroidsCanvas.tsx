"use client";

import { useEffect, useRef } from "react";
import { createAsteroids } from "@/lib/games/asteroids/engine";
import { H, W } from "@/lib/games/asteroids/constants";
import type { AsteroidsCallbacks, AsteroidsEngine } from "@/lib/games/asteroids/types";

type Props = AsteroidsCallbacks & {
  paused: boolean;
  runKey: number; // al cambiar, se reinicia la partida
};

export function AsteroidsCanvas({ paused, runKey, onStats, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);
  const lastRunKey = useRef(runKey);
  // ponytail: callbacks por ref para no recrear el motor cuando cambian
  const cbRef = useRef({ onStats, onGameOver });

  useEffect(() => {
    cbRef.current = { onStats, onGameOver };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createAsteroids(canvas, {
      onStats: (s) => cbRef.current.onStats(s),
      onGameOver: (score) => cbRef.current.onGameOver(score),
    });
    engine.start();
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (paused) engineRef.current?.pause();
    else engineRef.current?.resume();
  }, [paused]);

  useEffect(() => {
    if (lastRunKey.current === runKey) return;
    lastRunKey.current = runKey;
    engineRef.current?.restart();
  }, [runKey]);

  return <canvas ref={canvasRef} width={W} height={H} className="asteroids-canvas" />;
}
