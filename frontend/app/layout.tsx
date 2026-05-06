import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LEXIA — Plataforma Legal IA",
  description: "AI para estudios jurídicos argentinos",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0A0F1E] text-[#F1F5F9]">
        {children}
      </body>
    </html>
  );
}
