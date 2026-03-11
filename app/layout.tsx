import './globals.css'

export const metadata = {
  title: 'Novavix - Gestão de SST',
  description: 'Portal de Documentos e Sincronização SST',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  )
}
