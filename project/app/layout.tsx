import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { MainLayout } from '@/components/layouts/MainLayout';
import { CasparServer } from '@/server/device/caspar/CasparServer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Project Manager',
  description: 'A modern project management tool',
};

async function getInitialState() {
  const server = await CasparServer.getInstance({
    id: 1,
    name: 'LENOVO',
    host: '192.168.0.194',
    port: 5250,
    enabled: true
  });

  return {
    currentProject: null,
    isMenuOpen: false,
    dynamicInfo: '',
    isProjectSelectorOpen: false,
    isSettingsOpen: false,
    error: null,
    loading: false,
    isSaving: false,
    hasUnsavedChanges: false,
    lastSavedAt: null,
    appVersion: 'v0.1.2',
    menuItems: [],
    availableUnions: [],
    servers: [await CasparServer.getState(1)]
  };
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
        <MainLayout initialState={initialState}>{children}</MainLayout>
      </body>
    </html>
  );
}