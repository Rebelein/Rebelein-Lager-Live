'use client';

import { AppShell } from '@/components/layout/app-shell';
import { AppProvider } from '@/context/AppContext';
import { FirebaseClientProvider } from '@/firebase';
import React from 'react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <FirebaseClientProvider>
      <AppProvider>
        {isClient ? <AppShell>{children}</AppShell> : null}
      </AppProvider>
    </FirebaseClientProvider>
  );
}
