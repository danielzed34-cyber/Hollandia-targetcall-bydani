import { redirect } from "next/navigation";

/**
 * Root route – always redirect to /dashboard.
 * Auth middleware will catch unauthenticated users and send them to /login.
 */
export default function Home() {
  redirect("/dashboard");
}
