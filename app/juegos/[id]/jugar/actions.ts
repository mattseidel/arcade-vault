"use server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { RANKED_GAMES } from "@/lib/games";
import type { SaveScoreResult } from "@/lib/scores";
const NAME_RE = /^[A-Z0-9_ ]{1,10}$/;
const MAX_SCORE = 10_000_000;
const fail = (): SaveScoreResult => ({
  status: "error",
  message: "No se pudo guardar la puntuación.",
});
export async function saveScore(
  gameId: string,
  name: string,
  score: number,
): Promise<SaveScoreResult> {
  const player = String(name ?? "")
    .trim()
    .toUpperCase();
  if (
    !(RANKED_GAMES as readonly string[]).includes(gameId) ||
    !NAME_RE.test(player)
  )
    return fail();
  if (!Number.isInteger(score) || score < 1 || score > MAX_SCORE) return fail();
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.rpc("submit_score", {
      p_game_id: gameId,
      p_player_name: player,
      p_score: score,
    });
    if (error || !data?.[0]) {
      console.error("[scores] submit_score:", error);
      return fail();
    }
    return { status: "saved", improved: data[0].improved, best: data[0].best };
  } catch (e) {
    console.error("[scores] submit_score:", e);
    return fail();
  }
}
