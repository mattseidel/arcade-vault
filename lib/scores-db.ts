import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { ScoreRow } from "@/lib/scores";
// Fecha en UTC para que servidor y cliente rendericen lo mismo.
const formatDate = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
};
export async function getTopScores(
  gameId: string,
  limit = 12,
): Promise<ScoreRow[]> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, updated_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data.map((r, i) => ({
    rank: i + 1,
    name: r.player_name,
    score: r.score,
    date: formatDate(r.updated_at),
  }));
}
