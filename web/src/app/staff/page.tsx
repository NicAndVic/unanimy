import { redirect } from "next/navigation";

import { getStaffAuthState } from "@/lib/staff";

export default async function StaffDashboardPage() {
  const authState = await getStaffAuthState();
  if (authState.status === "unauthenticated") redirect("/staff/login");
  if (authState.status === "forbidden") return <section>Not authorized.</section>;

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Staff admin console</h1>
      <p className="text-sm text-muted-foreground">Signed in as {authState.user.email}</p>
    </section>
  );
}
