import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { ChannelsClient } from "./channels-client";

export default async function ChannelsPage() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) redirect("/dashboard");

  return <ChannelsClient />;
}
