import { Suspense } from "react";
import { HallOfFame } from "@/components/hall-of-fame";
import { RANKED_GAMES } from "@/lib/games";
import { getTopScores } from "@/lib/scores-db";
async function Ranking() {
  // ponytail: solo los RANKED_GAMES tienen datos reales; el resto sigue con seededScores
  const entries = await Promise.all(
    RANKED_GAMES.map(async (id) => [id, await getTopScores(id)] as const),
  );
  return <HallOfFame realRows={Object.fromEntries(entries)} />;
}
export default function Salon() {
  return (
    <Suspense fallback={null}>
      <Ranking />
    </Suspense>
  );
}
