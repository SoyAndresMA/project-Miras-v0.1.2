import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { MainLayout } from '@/components/layouts/MainLayout';
import { ServerStateProvider } from '@/components/providers/ServerStateProvider';
import { initializeServer } from './actions/server';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Project Manager',
  description: 'A modern project management tool',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const serverState = await initializeServer();

  return (
    <html lang="en">
      <body className={inter.className}>
        <ServerStateProvider initialState={serverState}>
          <MainLayout>
            {children}
          </MainLayout>
        </ServerStateProvider>
      </body>
    </html>
  );
}