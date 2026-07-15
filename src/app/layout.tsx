import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stock Alerts",
  description: "Painel para acompanhar regras de alerta de ativos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full [scrollbar-gutter:stable] antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster closeButton position="bottom-right" richColors />
      </body>
    </html>
  );
}
