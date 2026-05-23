"use client";

import { ReactNode } from "react";
import { AppScopeProvider } from "@/context/AppScopeContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ShopLayout } from "@/components/layout/ShopLayout";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AppScopeProvider>
        <AuthProvider>
          <CartProvider>
            <ShopLayout>{children}</ShopLayout>
          </CartProvider>
        </AuthProvider>
      </AppScopeProvider>
    </ThemeProvider>
  );
}
