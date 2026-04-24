import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Workspace } from "@/components/Workspace";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  const email = session.payload.email ?? session.payload.sub;
  return <Workspace email={email} />;
}
