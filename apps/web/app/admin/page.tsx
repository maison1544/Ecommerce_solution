"use client";
import { Suspense } from "react";
import AdminPage from "@/components/pages/AdminPage";
export default function Route() {
  return (
    <Suspense fallback={null}>
      <AdminPage />
    </Suspense>
  );
}
