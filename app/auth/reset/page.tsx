import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ResetForm } from "@/components/resetForm";
import { createClient } from "@/utils/supabase/server";
// cookies() es dinámico con cacheComponents: la comprobación va dentro de Suspense
async function Gate() {
  await connection(); // supabase.auth usa Date.now()
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <ResetForm />;
}
export default function Reset() {
  return (
    <Suspense>
      <Gate />
    </Suspense>
  );
}
