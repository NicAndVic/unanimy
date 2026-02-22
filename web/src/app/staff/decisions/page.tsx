import { redirect } from "next/navigation";

import StaffDecisionsClient from "./DecisionsClient";
import { getStaffAuthState } from "@/lib/staff";

export default async function StaffDecisionsPage() {
  const authState = await getStaffAuthState();
  if (authState.status === "unauthenticated") redirect("/staff/login");
  if (authState.status === "forbidden") return <section>Not authorized.</section>;
  return <StaffDecisionsClient />;
}
