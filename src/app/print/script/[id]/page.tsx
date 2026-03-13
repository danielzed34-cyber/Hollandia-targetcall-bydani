/**
 * Print page — clean white page outside the dashboard layout.
 * Accessible to the rep (own approved script) or any admin.
 */

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintPageClient } from "@/components/script/print-page-client";
import type { Database } from "@/types/supabase";

type CallScriptRow = Database["public"]["Tables"]["call_scripts"]["Row"];

export default async function PrintScriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data } = await supabase
    .from("call_scripts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const script = data as CallScriptRow | null;
  if (!script) notFound();

  const isOwner = script.rep_id === user.id;
  const isAdmin = profile?.role === "Admin";

  if (!isOwner && !isAdmin) notFound();
  if (script.status !== "approved" && !isAdmin) notFound();

  return <PrintPageClient script={script} />;
}
