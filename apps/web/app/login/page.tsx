"use client";
import { Suspense } from "react";
import LoginPage from "@/components/pages/LoginPage";
export default function Route() { return <Suspense fallback={null}><LoginPage /></Suspense>; }
