import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { NotificationChecker } from "@/components/shared/NotificationChecker";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Estudio de Abril Barchilon - CRM",
  description:
    "CRM del Estudio de Abril Barchilon. Pipeline de casos, clasificacion de clientes y seguimiento inteligente.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex overflow-x-hidden" suppressHydrationWarning>
        <TooltipProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen w-0">
            <Header />
            <main className="flex-1 p-3 md:p-6 bg-background pb-24 md:pb-6">
              {children}
            </main>
          </div>
          <BottomNav />
          <Toaster />
          <NotificationChecker />
        </TooltipProvider>
      </body>
    </html>
  );
}
