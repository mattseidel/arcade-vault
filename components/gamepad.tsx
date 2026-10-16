"use client";
import { useEffect, useRef, useState } from "react";
import type { PadButton, PadLayout } from "@/lib/games/pads";
const emit = (type: "keydown" | "keyup", code: string) =>
  window.dispatchEvent(
    new KeyboardEvent(type, { code, key: code, bubbles: true }),
  );
// flechas de la cruceta (SVG del Gamepad MK-II)
const ARROWS = {
  up: "M12 4 L20 16 L4 16 Z",
  right: "M8 4 L20 12 L8 20 Z",
  down: "M4 8 L20 8 L12 20 Z",
  left: "M16 4 L16 20 L4 12 Z",
} as const;
const POSITIONS = ["up", "right", "down", "left"] as const;
// Gamepad MK-II: cruceta + botones A/B. Cada botón emite un único keydown al
// pulsar y su keyup al soltar (o al perder el puntero, el foco o desmontar).
export function Gamepad({ layout }: { layout: PadLayout }) {
  const held = useRef(new Set<string>());
  const [on, setOn] = useState<ReadonlySet<string>>(new Set());
  const press = (code: string) => {
    if (held.current.has(code)) return;
    held.current.add(code);
    setOn(new Set(held.current));
    emit("keydown", code);
  };
  const release = (code: string) => {
    if (!held.current.delete(code)) return;
    setOn(new Set(held.current));
    emit("keyup", code);
  };
  useEffect(() => {
    const set = held.current;
    const releaseAll = () => {
      set.forEach((c) => {
        set.delete(c);
        emit("keyup", c);
      });
      setOn(new Set());
    };
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("blur", releaseAll);
      releaseAll();
    };
  }, []);
  const handlers = (code: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      press(code);
    },
    onPointerUp: () => release(code),
    onPointerCancel: () => release(code),
    onPointerLeave: () => release(code),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const dpad = layout.filter((b) => b.area === "dpad");
  // A = primera acción (derecha, magenta), B = segunda (izquierda, cian)
  const actions = layout.filter((b) => b.area === "action").slice(0, 2);
  const actionBtn = (b: PadButton, i: number) => {
    const letter = i === 0 ? "A" : "B";
    return (
      <div key={b.code} className="gp-ab-wrap">
        <button
          type="button"
          className={`gp-ab gp-${letter.toLowerCase()}`}
          aria-label={`${letter}: ${b.label}`}
          data-on={on.has(b.code) || undefined}
          {...handlers(b.code)}
        >
          <span className="gp-ab-ring" aria-hidden="true" />
          <span className="gp-ab-letter">{letter}</span>
        </button>
        {b.label !== letter && <span className="gp-cap">{b.label}</span>}
      </div>
    );
  };
  return (
    <div className="gamepad" role="group" aria-label="Controles táctiles">
      {dpad.length > 0 && (
        <div className="gp-dpad">
          {POSITIONS.map((pos) => {
            const b = dpad.find((d) => d.pos === pos);
            const arrow = (
              <svg className="gp-arrow" viewBox="0 0 24 24" aria-hidden="true">
                <path d={ARROWS[pos]} fill="currentColor" />
              </svg>
            );
            // posición que el juego no usa: hueco inerte para conservar la cruz
            if (!b)
              return (
                <div key={pos} className="gp-dp" data-pos={pos} data-off>
                  {arrow}
                </div>
              );
            return (
              <button
                key={pos}
                type="button"
                className="gp-dp"
                data-pos={pos}
                aria-label={b.label}
                data-on={on.has(b.code) || undefined}
                {...handlers(b.code)}
              >
                {arrow}
              </button>
            );
          })}
          <div className="gp-hub" aria-hidden="true">
            <span className="gp-gem" />
          </div>
        </div>
      )}
      {actions.length > 0 && (
        <div className="gp-actions">{actions.map(actionBtn).reverse()}</div>
      )}
    </div>
  );
}
