"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GameCanvas } from "@/components/games/game-canvas";
import { Gamepad } from "@/components/gamepad";
import { REAL_GAMES } from "@/components/games/registry";
import { RANKED_GAMES } from "@/lib/games";
import { GENERIC_PAD } from "@/lib/games/pads";
import { saveScore } from "@/app/juegos/[id]/jugar/actions";
import type { SaveScoreResult } from "@/lib/scores";
import { SKINS, type SkinId } from "@/lib/games/types";
const SKIN_KEY = "arcade-vault:skin";
const LIVES = 3;
type SaveState = { status: "idle" } | { status: "saving" } | SaveScoreResult;
// null = invitado; username null = con sesión pero sin perfil
export type PlayerSession = { username: string | null } | null;
export function GamePlayer({
  id,
  title,
  session,
}: {
  id: string;
  title: string;
  session: PlayerSession;
}) {
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
  const [skin, setSkin] = useState<SkinId>("clasico");
  // ponytail: una llamada a saveScore por partida; se rearma en restart
  const savedRun = useRef(false);
  const finalScore = useRef(0);
  const real = REAL_GAMES[id];
  useEffect(() => {
    try {
      const v = localStorage.getItem(SKIN_KEY) as SkinId | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratar desde localStorage tras el mount
      if (v && SKINS.includes(v)) setSkin(v);
    } catch {}
  }, []);
  const pickSkin = (s: SkinId) => {
    setSkin(s);
    try {
      localStorage.setItem(SKIN_KEY, s);
    } catch {}
  };
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
    savedRun.current = false;
  };
  const username = session?.username ?? null;
  const submit = async () => {
    setSave({ status: "saving" });
    try {
      setSave(await saveScore(id, finalScore.current));
    } catch {
      // ponytail: fallo de red; la Server Action ya devuelve sus errores como valor
      setSave({
        status: "error",
        message: "No se pudo guardar la puntuación.",
      });
    }
  };
  const finish = (final: number) => {
    finalScore.current = final;
    setOver(true);
    if (!ranked || !username || final < 1 || savedRun.current) return;
    savedRun.current = true;
    void submit();
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
              {ranked ? (username ?? "INVITADO") : name}
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
          <button className="btn magenta" onClick={() => finish(score)}>
            FIN
          </button>
          <Link href={`/juegos/${id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>
      {real?.skins && (
        <div
          role="group"
          aria-label="Skin"
          style={{
            display: "flex",
            flexWrap: "wrap", // sin scroll horizontal a 375 px
            gap: 8,
            alignItems: "center",
            margin: "0 0 12px",
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.16em",
              color: "var(--ink-dim)",
            }}
          >
            SKIN
          </span>
          {SKINS.map((s) => (
            <button
              key={s}
              className={`btn ${s === skin ? "yellow" : "ghost"}`}
              aria-pressed={s === skin}
              onClick={(e) => {
                e.currentTarget.blur();
                pickSkin(s);
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      <div className="crt">
        <div className="crt-screen">
          {real ? (
            <GameCanvas
              game={real}
              paused={paused || over}
              runKey={runKey}
              skin={skin}
              onStats={(s) => {
                setScore(s.score);
                setLives(s.lives);
                setEngineLevel(s.level);
              }}
              onGameOver={finish}
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
      <Gamepad layout={real ? real.pad : GENERIC_PAD} />
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {ranked ? (
              <div style={{ marginTop: 18 }}>
                {!username || save.status === "needs_login" ? (
                  <Link
                    href={session && !username ? "/login/username" : "/login"}
                    className="btn yellow"
                  >
                    {session && !username
                      ? "ELIGE UN NOMBRE PARA GUARDAR TU PUNTUACIÓN"
                      : "INICIA SESIÓN PARA GUARDAR TU PUNTUACIÓN"}
                  </Link>
                ) : (
                  <>
                    <div className="final-label">JUGADOR · {username}</div>
                    {save.status === "saving" && (
                      <div
                        className="toast-saved"
                        style={{ "--n": 13 } as React.CSSProperties}
                      >
                        ▸ GUARDANDO…_
                      </div>
                    )}
                    {save.status === "saved" && (
                      <div
                        className="toast-saved"
                        style={
                          { "--n": toast.length + 2 } as React.CSSProperties
                        }
                      >
                        ▸ {toast}_
                      </div>
                    )}
                    {save.status === "error" && (
                      <>
                        <div className="contact-error" role="alert">
                          [ERROR] {save.message}
                        </div>
                        <button
                          className="btn yellow"
                          style={{ marginTop: 10 }}
                          onClick={submit}
                        >
                          REINTENTAR
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ) : !saved ? (
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
                  <button className="btn yellow" onClick={() => setSaved(true)}>
                    GUARDAR PUNTUACIÓN
                  </button>
                </div>
              </>
            ) : (
              <div
                className="toast-saved"
                style={{ "--n": 22 } as React.CSSProperties}
              >
                ▸ PUNTUACIÓN GUARDADA_
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
