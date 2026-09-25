import { ADMIN_COOKIE, readSessionToken } from "@/lib/security/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import OperationsDashboard from "./operations-dashboard";

export const dynamic = "force-dynamic";

export default function OperationsPage() {
    const session = readSessionToken(cookies().get(ADMIN_COOKIE)?.value);
    if (session?.role !== "admin") redirect("/admin/login");

    return <OperationsDashboard />;
}
