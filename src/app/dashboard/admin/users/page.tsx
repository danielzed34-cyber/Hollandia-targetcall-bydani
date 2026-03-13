"use client";

import { useState } from "react";
import { UsersTable } from "@/components/admin/users-table";
import { CreateUserForm } from "@/components/admin/create-user-form";

export default function AdminUsersPage() {
  const [tableKey, setTableKey] = useState(0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <CreateUserForm onCreated={() => setTableKey((k) => k + 1)} />
      <UsersTable key={tableKey} />
    </div>
  );
}
