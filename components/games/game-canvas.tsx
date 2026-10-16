"use client";
import { useEffect, useRef } from "react";
import type { GameCallbacks, GameEngine, SkinId } from "@/lib/games/types";
import type { RealGame } from "./registry";
type Props = GameCallbacks & {
  game: RealGame;
  paused: boolean;
  runKey: number; // al cambiar, se reinicia la partida
  skin: SkinId; // al cambiar, se aplica con engine.setSkin sin reiniciar
};
export function GameCanvas({
  game,
  paused,
  runKey,
  skin,
  onStats,
  onGameOver,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const auxRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const lastRunKey = useRef(runKey);
  // ponytail: callbacks por ref para no recrear el motor cuando cambian
  const cbRef = useRef({ onStats, onGameOver });
  useEffect(() => {
    cbRef.current = { onStats, onGameOver };
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = game.create(
      canvas,
      {
        onStats: (s) => cbRef.current.onStats(s),
        onGameOver: (score) => cbRef.current.onGameOver(score),
      },
      auxRef.current,
      skin,
    );
    engine.start();
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // ponytail: skin inicial por closure; los cambios van por setSkin (abajo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);
  useEffect(() => {
    engineRef.current?.setSkin?.(skin);
  }, [skin]);
  useEffect(() => {
    if (paused) engineRef.current?.pause();
    else engineRef.current?.resume();
  }, [paused]);
  useEffect(() => {
    if (lastRunKey.current === runKey) return;
    lastRunKey.current = runKey;
    engineRef.current?.restart();
  }, [runKey]);
  const { width, height, aux } = game;
  if (!aux)
    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="game-canvas"
      />
    );
  return (
    <div className="game-canvas-wrap">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="game-canvas-main"
      />
      <div className="game-aux">
        <div className="game-aux-label">SIGUIENTE</div>
        <canvas ref={auxRef} width={aux.width} height={aux.height} />
      </div>
    </div>
  );
}
