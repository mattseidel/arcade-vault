import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
export default function Login() {
  // AuthForm lee ?error= con useSearchParams, que exige Suspense con cacheComponents
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
