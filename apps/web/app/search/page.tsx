"use client";
import { Suspense } from "react";
import SearchResultsPage from "@/components/pages/SearchResultsPage";
export default function Route() {
  return (
    <Suspense fallback={null}>
      <SearchResultsPage />
    </Suspense>
  );
}
