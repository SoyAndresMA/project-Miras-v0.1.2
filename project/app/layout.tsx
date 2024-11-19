import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { MainLayout } from '@/components/layouts/MainLayout';
import { AppInitializerService } from '@/server/services/AppInitializerService';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Project Manager',
  description: 'A modern project management tool',
};

async function getInitialState() {
  const initializer = AppInitializerService.getInstance();
  return initializer.initialize();
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialState = await getInitialState();

  return (
    <html lang="en">
      <body className={inter.className}>
        <MainLayout initialState={initialState}>
          {children}
        </MainLayout>
      </body>
    </html>
  );
}