import { cookies } from "next/headers";
import { connection } from "next/server";
import { Nav } from "@/components/nav";
import { createClient } from "@/utils/supabase/server";
export async function NavSession() {
  // supabase.auth usa Date.now(): exige request-time real, no solo cookies() (prefetch/runtime prerender)
  await connection();
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <Nav />;
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  return <Nav user={{ id: user.id, username: profile?.username ?? null }} />;
}
