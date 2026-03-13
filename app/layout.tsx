import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Configuração da fonte Inter para um visual moderno e limpo
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Novavix - Gestão Inteligente de SST",
  description: "Portal de documentos e laudos técnicos de Segurança do Trabalho",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased bg-white text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
