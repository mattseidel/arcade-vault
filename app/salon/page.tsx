import { Suspense } from "react";
import { HallOfFame } from "@/components/hall-of-fame";
import { getTopScores } from "@/lib/scores-db";
async function Ranking() {
  // ponytail: solo rocas tiene juego real; el resto de pestañas sigue con seededScores
  const rocas = await getTopScores("rocas");
  return <HallOfFame realRows={{ rocas }} />;
}
export default function Salon() {
  return (
    <Suspense fallback={null}>
      <Ranking />
    </Suspense>
  );
}
