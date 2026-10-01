import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BlogNave — Administração WordPress com IA',
  description: 'Painel interno para gerenciar múltiplos sites WordPress e gerar conteúdo com IA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
