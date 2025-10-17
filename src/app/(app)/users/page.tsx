'use client';

// This page is obsolete because user management has been moved to the AppShell.
// It is kept for routing purposes but can be considered for removal in the future.
// The redirect has been removed to prevent unnecessary routing loops.

export default function UsersPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>
        <p className="mt-2 text-muted-foreground">
            Die Benutzerverwaltung wurde in das Benutzerauswahl-Menü in der Kopfzeile integriert.
        </p>
    </div>
  );
}
