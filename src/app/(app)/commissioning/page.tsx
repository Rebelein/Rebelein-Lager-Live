
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';
import type { Commission } from '@/lib/types';
import { PlusCircle, Archive, PackageSearch } from 'lucide-react';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function CommissioningPage() {
  const { currentUser, commissions, isLoading } = useAppContext();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [newCommissionName, setNewCommissionName] = React.useState('');
  const [newCommissionOrderNumber, setNewCommissionOrderNumber] = React.useState('');
  const [newCommissionNotes, setNewCommissionNotes] = React.useState('');

  const handleSaveCommission = () => {
    if (!currentUser || !firestore) {
      toast({ title: 'Fehler', description: 'Benutzer nicht angemeldet oder Datenbankverbindung fehlt.', variant: 'destructive' });
      return;
    }
    if (!newCommissionName.trim() || !newCommissionOrderNumber.trim()) {
      toast({ title: 'Fehler', description: 'Name und Auftragsnummer sind Pflichtfelder.', variant: 'destructive' });
      return;
    }

    const commissionId = doc(collection(firestore, 'commissions')).id;
    const newCommission: Commission = {
      id: commissionId,
      name: newCommissionName.trim(),
      orderNumber: newCommissionOrderNumber.trim(),
      notes: newCommissionNotes.trim(),
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
    };

    const commissionRef = doc(firestore, 'commissions', commissionId);
    setDocumentNonBlocking(commissionRef, newCommission);

    toast({ title: 'Kommission erstellt', description: `Die Kommission "${newCommission.name}" wurde angelegt.` });

    setIsFormOpen(false);
    setNewCommissionName('');
    setNewCommissionOrderNumber('');
    setNewCommissionNotes('');
  };

  const handleWithdraw = (commission: Commission) => {
    // This is a placeholder for future functionality
    toast({ title: 'Aktion noch nicht implementiert', description: `Die Entnahme für "${commission.name}" ist noch nicht verfügbar.` });
  };
  
  const activeCommissions = React.useMemo(() => {
    return (commissions || []).filter(c => c.status === 'active').sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [commissions]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Kommissionierung</h1>
        <div className="ml-auto">
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Neue Kommission</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Kommission erstellen</DialogTitle>
                <DialogDescription>
                  Legen Sie hier eine neue Kommission für ein Projekt oder eine Baustelle an.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="order-number" className="text-right">Auftrags-Nr.</Label>
                  <Input id="order-number" value={newCommissionOrderNumber} onChange={(e) => setNewCommissionOrderNumber(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" value={newCommissionName} onChange={(e) => setNewCommissionName(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="notes" className="text-right pt-2">Weitere Infos</Label>
                  <Textarea id="notes" value={newCommissionNotes} onChange={(e) => setNewCommissionNotes(e.target.value)} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setIsFormOpen(false)}>Abbrechen</Button>
                <Button onClick={handleSaveCommission}>Speichern</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
                <p>Lade Kommissionen...</p>
            </CardContent>
        </Card>
      ) : activeCommissions.length === 0 ? (
        <Card>
            <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-12">
                    <PackageSearch className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">Keine aktiven Kommissionen</h3>
                    <p className="mt-2 text-sm">Erstellen Sie eine neue Kommission, um zu beginnen.</p>
                </div>
            </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeCommissions.map(commission => (
            <Card key={commission.id}>
              <CardHeader>
                <CardTitle className="truncate">{commission.name}</CardTitle>
                <CardDescription>Auftrags-Nr: {commission.orderNumber}</CardDescription>
              </CardHeader>
              <CardContent>
                {commission.notes ? (
                    <p className="text-sm text-muted-foreground italic h-10 overflow-hidden text-ellipsis">
                        &quot;{commission.notes}&quot;
                    </p>
                ) : (
                    <div className="h-10"></div>
                )}
                 <p className="text-xs text-muted-foreground mt-4">
                    Erstellt von {commission.createdBy} am {format(new Date(commission.createdAt), 'dd.MM.yyyy', { locale: de })}
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleWithdraw(commission)}>
                    <Archive className="mr-2 h-4 w-4"/>
                    Kommission entnehmen
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
