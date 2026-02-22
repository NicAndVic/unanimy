import { redirect } from "next/navigation";

import StaffUsageClient from "./UsageClient";
import { getStaffAuthState } from "@/lib/staff";

export default async function StaffUsagePage() {
  const authState = await getStaffAuthState();
  if (authState.status === "unauthenticated") redirect("/staff/login");
  if (authState.status === "forbidden") return <section>Not authorized.</section>;
  return <StaffUsageClient />;
}
