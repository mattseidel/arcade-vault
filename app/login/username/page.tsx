import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { UsernameForm } from "@/components/usernameForm";
import { createClient } from "@/utils/supabase/server";
// cookies() es dinámico con cacheComponents: la comprobación va dentro de Suspense
async function Gate() {
  await connection(); // supabase.auth usa Date.now()
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile) redirect("/");
  return <UsernameForm />;
}
export default function ChooseUsername() {
  return (
    <Suspense>
      <Gate />
    </Suspense>
  );
}
