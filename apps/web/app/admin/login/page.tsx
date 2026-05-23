"use client";

import { Suspense } from "react";
import LoginPage from "@/components/pages/LoginPage";

export default function AdminLoginRoute() {
  return (
    <Suspense fallback={null}>
      <LoginPage scope="admin" />
    </Suspense>
  );
}
