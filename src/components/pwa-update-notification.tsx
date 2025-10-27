'use client';

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function PwaUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    // This code only runs on the client
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.workbox !== undefined) {
      const wb = window.workbox;

      // A common UX pattern for progressive web apps is to show a banner when a service worker has updated and waiting to install.
      // NOTE: MUST set skipWaiting: true in next.config.js for this to trigger.
      const promptNewVersionAvailable = () => {
        setShowUpdate(true);
      };

      wb.addEventListener('waiting', promptNewVersionAvailable);
      wb.addEventListener('externalwaiting', promptNewVersionAvailable);

      // Never forget to call register as automatic registration is disabled.
      wb.register();
    }
  }, []);

  const handleUpdate = () => {
    const wb = window.workbox;
    // Send a message to the waiting service worker to activate.
    wb.messageSkipWaiting();
    setShowUpdate(false);
    // Directly reload the page to apply the update.
    window.location.reload();
  };

  return (
    <AlertDialog open={showUpdate}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update verfügbar</AlertDialogTitle>
          <AlertDialogDescription>
            Eine neue Version der Anwendung ist verfügbar. Klicken Sie auf &quot;Aktualisieren&quot;, um die neuesten Funktionen zu laden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction asChild>
            <Button onClick={handleUpdate}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Aktualisieren
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
