import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <AppShell />;
}
