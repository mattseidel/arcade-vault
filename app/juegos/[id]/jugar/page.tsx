import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game-player";
import { GAMES } from "@/lib/games";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

async function Player({
  params,
}: Pick<PageProps<"/juegos/[id]/jugar">, "params">) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let session = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    session = { username: profile?.username ?? null };
  }

  return <GamePlayer id={game.id} title={game.title} session={session} />;
}

export default function Jugar({ params }: PageProps<"/juegos/[id]/jugar">) {
  return (
    <Suspense fallback={null}>
      <Player params={params} />
    </Suspense>
  );
}
