"use client";
import { Suspense } from "react";
import CheckoutPage from "@/components/pages/CheckoutPage";
export default function Route() {
  return (
    <Suspense fallback={null}>
      <CheckoutPage />
    </Suspense>
  );
}
