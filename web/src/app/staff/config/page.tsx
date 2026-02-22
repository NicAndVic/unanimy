import { redirect } from "next/navigation";

import StaffConfigClient from "./ConfigClient";
import { getStaffAuthState } from "@/lib/staff";

export default async function StaffConfigPage() {
  const authState = await getStaffAuthState();
  if (authState.status === "unauthenticated") redirect("/staff/login");
  if (authState.status === "forbidden") return <section>Not authorized.</section>;
  return <StaffConfigClient />;
}
