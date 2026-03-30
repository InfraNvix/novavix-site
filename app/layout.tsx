import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Novavix | Software de Gestão de SST e eSocial",
  description: "Solução completa para PGR, PCMSO e envio automatizado dos eventos de SST para o eSocial (S-2210, S-2220, S-2240 e S-2241). Gestão ocupacional inteligente.",
  keywords: "SST, eSocial, PGR, PCMSO, Segurança do Trabalho, software SST, gestão ocupacional, S-2240, Novavix GO",
  authors: [{ name: "Novavix Sistemas" }],
  openGraph: {
    title: "Novavix | Software de Gestão de SST e eSocial",
    description: "Gestão completa de SST, PGR e PCMSO com envio automático para o eSocial.",
    url: "https://novavix.com.br",
    siteName: "Novavix Sistemas",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
