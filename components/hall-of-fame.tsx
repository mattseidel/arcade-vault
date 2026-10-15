"use client";
import Link from "next/link";
import { useState } from "react";
import { GAMES } from "@/lib/games";
import { seededScores, type ScoreRow } from "@/lib/scores";
// Un hueco vacío mantiene al campeón centrado cuando hay menos de 3 filas.
function slot(r: ScoreRow | undefined, cls: string, n: string) {
  if (!r) return <div key={cls} className="podium-gap" aria-hidden />;
  const gold = cls === "gold";
  return (
    <div key={cls} className={`podium-slot ${cls}`}>
      {gold && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={gold ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {n}
      </div>
      <div className="name">{r.name}</div>
      <div className="score" style={gold ? { fontSize: 20 } : undefined}>
        {r.score.toLocaleString("es-ES")}
      </div>
      <div className="date">{r.date}</div>
    </div>
  );
}

export function HallOfFame({
  realRows,
}: {
  realRows: Record<string, ScoreRow[]>;
}) {
  const [tab, setTab] = useState(GAMES[0].id);
  // ponytail: solo rocas tiene datos reales; el resto sigue con seededScores
  const rows = realRows[tab] ?? seededScores(tab.length * 23 + 7, 12);
  const [first, second, third] = rows;
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <div className="hall-tabs">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="hall-empty">
          <div className="pixel">AÚN NO HAY PUNTUACIONES — SÉ EL PRIMERO</div>
          <Link href={`/juegos/${tab}/jugar`} className="btn yellow">
            JUGAR AHORA
          </Link>
        </div>
      ) : (
        <>
          <div className="podium">
            {slot(second, "silver", "02")}
            {slot(first, "gold", "01")}
            {slot(third, "bronze", "03")}
          </div>
          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={tab + r.name}
                className={"tr" + (i < 3 ? ` top${i + 1}` : "")}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
