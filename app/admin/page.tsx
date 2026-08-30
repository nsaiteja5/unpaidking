import { cookies } from "next/headers";
import { AdminPanel } from "@/components/admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const store = await cookies();
  const loggedIn =
    Boolean(process.env.ADMIN_PASSWORD) &&
    store.get("unpaid_king_admin")?.value === process.env.ADMIN_PASSWORD;

  return <AdminPanel loggedIn={loggedIn} />;
}
