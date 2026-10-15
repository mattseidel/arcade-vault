"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GameCanvas } from "@/components/games/game-canvas";
import { REAL_GAMES } from "@/components/games/registry";
import { RANKED_GAMES } from "@/lib/games";
import { saveScore } from "@/app/juegos/[id]/jugar/actions";
import type { SaveScoreResult } from "@/lib/scores";
const LIVES = 3;
type SaveState = { status: "idle" } | { status: "saving" } | SaveScoreResult;
export function GamePlayer({ id, title }: { id: string; title: string }) {
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  // ponytail: `saved` es el guardado visual de los juegos simulados; `save` es el real de los RANKED_GAMES
  const [saved, setSaved] = useState(false);
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const [lives, setLives] = useState(LIVES);
  const [engineLevel, setEngineLevel] = useState(1);
  const [runKey, setRunKey] = useState(0);
  const real = REAL_GAMES[id];
  const ranked = (RANKED_GAMES as readonly string[]).includes(id);
  // ponytail: en los juegos simulados el nivel se deriva de la puntuación
  const level = real ? engineLevel : 1 + Math.floor(score / 2500);
  useEffect(() => {
    if (real || over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [real, over, paused]);
  const restart = () => {
    setScore(0);
    setLives(LIVES);
    setEngineLevel(1);
    setRunKey((k) => k + 1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSave({ status: "idle" });
  };
  const submit = async () => {
    setSave({ status: "saving" });
    try {
      setSave(await saveScore(id, name, score));
    } catch {
      // ponytail: fallo de red; la Server Action ya devuelve sus errores como valor
      setSave({
        status: "error",
        message: "No se pudo guardar la puntuación.",
      });
    }
  };
  const toast =
    save.status !== "saved"
      ? "PUNTUACIÓN GUARDADA"
      : save.improved
        ? "NUEVO RÉCORD PERSONAL"
        : `TU MEJOR MARCA ES ${save.best.toLocaleString("es-ES", { useGrouping: "always" })}`;
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          {(!real || real.lives) && (
            <div className="hud-stat lives">
              <div className="l">Vidas</div>
              <div className="v">{"♥ ".repeat(lives).trim()}</div>
            </div>
          )}
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            className="btn yellow"
            onClick={(e) => {
              // ponytail: sin foco, Espacio no vuelve a activar PAUSA/REANUDAR mientras se juega
              e.currentTarget.blur();
              setPaused((p) => !p);
            }}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={() => setOver(true)}>
            FIN
          </button>
          <Link href={`/juegos/${id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>
      <div className="crt">
        <div className="crt-screen">
          {real ? (
            <GameCanvas
              game={real}
              paused={paused || over}
              runKey={runKey}
              onStats={(s) => {
                setScore(s.score);
                setLives(s.lives);
                setEngineLevel(s.level);
              }}
              onGameOver={() => setOver(true)}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {real && <div className="keyboard-notice">REQUIERE TECLADO</div>}
          {paused && !over && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved && save.status !== "saved" ? (
              <>
                <div className="input-row">
                  <input
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value.toUpperCase().slice(0, 10))
                    }
                    placeholder="TUS INICIALES"
                    aria-label="Tus iniciales"
                  />
                  {/* ponytail: los juegos simulados no persisten nada, solo los RANKED_GAMES guardan */}
                  <button
                    className="btn yellow"
                    disabled={save.status === "saving"}
                    onClick={ranked ? submit : () => setSaved(true)}
                  >
                    {save.status === "saving"
                      ? "GUARDANDO…"
                      : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {save.status === "error" && (
                  <div className="contact-error" role="alert">
                    [ERROR] {save.message} Inténtalo de nuevo.
                  </div>
                )}
              </>
            ) : (
              <div
                className="toast-saved"
                style={{ "--n": toast.length + 2 } as React.CSSProperties}
              >
                ▸ {toast}_
              </div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/biblioteca" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
