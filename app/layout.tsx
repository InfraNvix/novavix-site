import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Novavix - Gestao Inteligente de SST',
  description: 'Portal de documentos e laudos tecnicos de Seguranca do Trabalho',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased bg-white text-slate-900`}>{children}</body>
    </html>
  )
}
