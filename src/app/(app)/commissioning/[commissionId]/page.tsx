
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';
import type { Commission, CommissionItem, InventoryItem } from '@/lib/types';
import { PlusCircle, Archive, PackageSearch, ChevronsUpDown, ClipboardList, Warehouse, CheckCircle, Circle, X, MoreHorizontal, Pencil, Trash2, ShoppingCart, Minus, Plus, Undo, Info } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { isInventoryItem } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';


const getStatusVariant = (status: Commission['status']) => {
  switch (status) {
    case 'draft':
      return 'secondary';
    case 'preparing':
      return 'default';
    case 'ready':
      return 'default';
    case 'withdrawn':
      return 'outline';
    default:
      return 'outline';
  }
};

const getStatusText = (status: Commission['status']) => {
    switch (status) {
        case 'draft': return 'Entwurf';
        case 'preparing': return 'In Vorbereitung';
        case 'ready': return 'Bereitgestellt';
        case 'withdrawn': return 'Entnommen';
        default: return 'Unbekannt';
    }
}

// *** Commission Detail/Preparation Dialog ***
function CommissionPreparationDialog({ commission, onOpenChange, onUpdateCommission }: { commission: Commission, onOpenChange: (open: boolean) => void, onUpdateCommission: (commission: Commission) => void }) {
    const { reduceStockForCommissionItem, increaseStockForCommissionItem } = useAppContext();
    const { toast } = useToast();

    const handleToggleItem = (item: CommissionItem) => {
        const isCurrentlyReady = item.status === 'ready';
        const newStatus = isCurrentlyReady ? 'pending' : 'ready';
        
        const updatedItems: CommissionItem[] = commission.items.map(i => 
            i.id === item.id ? { ...i, status: newStatus } : i
        );
        onUpdateCommission({ ...commission, items: updatedItems });

        if (item.source === 'main_warehouse') {
            if (isCurrentlyReady) {
                // Un-checking the item
                increaseStockForCommissionItem(commission.id, item.id, item.quantity);
            } else {
                // Checking the item
                reduceStockForCommissionItem(commission.id, item.id, item.quantity);
            }
        } else {
             if (isCurrentlyReady) {
                toast({title: "Position zurückgesetzt", description: `"${item.name}" wurde wieder auf 'ausstehend' gesetzt.`})
            } else {
                toast({title: "Position bereitgestellt", description: `"${item.name}" wurde als bereitgestellt markiert.`})
            }
        }
    }
    
    const allItemsReady = commission.items.every(i => i.status === 'ready');
    
    React.useEffect(() => {
        if (commission.items.length > 0 && allItemsReady && commission.status !== 'ready') {
            onUpdateCommission({ ...commission, status: 'ready', isNewlyReady: true });
        } else if (commission.items.length > 0 && !allItemsReady && commission.status === 'ready') {
             // Retain the isNewlyReady flag if it was already set
             onUpdateCommission({ ...commission, status: 'preparing', isNewlyReady: commission.isNewlyReady });
        }
    }, [commission.items, allItemsReady, commission, onUpdateCommission]);

    const handleRemoveItem = (itemId: string) => {
        const itemToRemove = commission.items.find(i => i.id === itemId);
        if (!itemToRemove) return;

        if (itemToRemove.status === 'ready' && itemToRemove.source === 'main_warehouse') {
            increaseStockForCommissionItem(commission.id, itemId, itemToRemove.quantity);
        }

        const updatedItems = commission.items.filter(i => i.id !== itemId);
        onUpdateCommission({ ...commission, items: updatedItems });
        toast({ title: 'Artikel entfernt', description: 'Der Artikel wurde aus der Kommission entfernt.', variant: 'destructive'});
    };


    return (
        <Dialog open={true} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl h-[70vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Kommission vorbereiten: {commission.name}</DialogTitle>
                    <DialogDescription>Auftrags-Nr: {commission.orderNumber}. Haken Sie die Artikel ab, um sie zu kommissionieren und den Bestand zu reduzieren.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="border rounded-lg h-full">
                        <div className="p-4 space-y-3">
                            {commission.items.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-10">Noch keine Artikel hinzugefügt.</p>
                            )}
                            {commission.items.map(item => (
                                <div key={item.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 group">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleItem(item)}>
                                        {item.status === 'ready' ? <CheckCircle className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                                    </Button>
                                    <div className="flex-1">
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">{item.source === 'external_order' ? 'Externe Bestellung' : item.itemNumber}</p>
                                    </div>
                                    <div className="font-semibold">{item.quantity} Stk.</div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100"
                                        onClick={() => handleRemoveItem(item.id)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="secondary">Schließen</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const getItemStatusIcon = (status: CommissionItem['status']) => {
  switch (status) {
    case 'pending': return <Circle className="h-5 w-5 text-muted-foreground" />;
    case 'ready': return <CheckCircle className="h-5 w-5 text-primary" />;
    default: return null;
  }
};


function CommissionDetailDialog({ commission, onOpenChange }: { commission: Commission | null, onOpenChange: (open: boolean) => void}) {
    if (!commission) {
        return null;
    }
    
    const itemsFromWarehouse = commission.items.filter(item => item.source === 'main_warehouse');
    const itemsFromOrders = commission.items.filter(item => item.source === 'external_order');

    return (
        <Dialog open={!!commission} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-start justify-between">
                         <div>
                            <DialogTitle className="text-2xl">{commission.name}</DialogTitle>
                            <DialogDescription>Auftrags-Nr: {commission.orderNumber}</DialogDescription>
                         </div>
                         <Badge variant={getStatusVariant(commission.status)} className="w-fit">{getStatusText(commission.status)}</Badge>
                    </div>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full pr-6 -mr-6">
                        <div className="flex flex-col gap-6 py-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Details</CardTitle>
                                </CardHeader>
                                <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Erstellt am</span>
                                        <span className="font-semibold">{format(new Date(commission.createdAt), 'dd.MM.yyyy, HH:mm', { locale: de })}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-muted-foreground">Erstellt von</span>
                                        <span className="font-semibold">{commission.createdBy}</span>
                                    </div>
                                    {commission.withdrawnAt && (
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground">Entnommen am</span>
                                            <span className="font-semibold">{format(new Date(commission.withdrawnAt), 'dd.MM.yyyy, HH:mm', { locale: de })}</span>
                                        </div>
                                    )}
                                    {commission.notes && (
                                        <div className="flex flex-col sm:col-span-2 md:col-span-3">
                                            <span className="text-muted-foreground">Notizen</span>
                                            <p className="font-semibold italic bg-muted/50 p-3 rounded-md mt-1">&quot;{commission.notes}&quot;</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            
                            <div className="grid md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Material aus Lager</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {itemsFromWarehouse.length > 0 ? (
                                        <ul className="space-y-3">
                                            {itemsFromWarehouse.map(item => (
                                                <li key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                                    {getItemStatusIcon(item.status)}
                                                    <div className="flex-1">
                                                        <p className="font-semibold">{item.name}</p>
                                                        <p className="text-xs text-muted-foreground">{item.itemNumber}</p>
                                                    </div>
                                                    <div className="font-bold">{item.quantity} Stk.</div>
                                                </li>
                                            ))}
                                        </ul>
                                        ) : (
                                            <p className="text-muted-foreground text-center py-8">Kein Material aus dem Lager.</p>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Externe Bestellungen</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {itemsFromOrders.length > 0 ? (
                                        <ul className="space-y-3">
                                            {itemsFromOrders.map(item => (
                                                <li key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                                    {getItemStatusIcon(item.status)}
                                                    <div className="flex-1">
                                                        <p className="font-semibold">{item.name}</p>
                                                    </div>
                                                    <div className="font-bold">{item.quantity} Stk.</div>
                                                </li>
                                            ))}
                                        </ul>
                                        ) : (
                                            <p className="text-muted-foreground text-center py-8">Keine externen Bestellungen.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="secondary">Schließen</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function CommissioningPage() {
  const { currentUser, items, wholesalers, mainWarehouse, addOrUpdateCommission, deleteCommission, commissions, isLoading: isContextLoading } = useAppContext();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCommission, setEditingCommission] = React.useState<Commission | null>(null);
  const [commissionToDelete, setCommissionToDelete] = React.useState<Commission | null>(null);
  
  const [selectedWithdrawn, setSelectedWithdrawn] = React.useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);

  const [newCommissionName, setNewCommissionName] = React.useState('');
  const [newCommissionOrderNumber, setNewCommissionOrderNumber] = React.useState('');
  const [newCommissionNotes, setNewCommissionNotes] = React.useState('');
  const [newCommissionItems, setNewCommissionItems] = React.useState<CommissionItem[]>([]);
  const [isWarehouseSearchOpen, setIsWarehouseSearchOpen] = React.useState(false);
  
  const [preparingCommission, setPreparingCommission] = React.useState<Commission | null>(null);
  const [detailCommission, setDetailCommission] = React.useState<Commission | null>(null);
  
  const mainWarehouseItems = React.useMemo(() => {
    if (!mainWarehouse) return [];
    return items.filter(item => 
        isInventoryItem(item) && 
        Array.isArray(item.stocks) &&
        item.stocks.some(s => s.locationId === mainWarehouse.id && s.quantity > 0)
    ) as InventoryItem[];
}, [items, mainWarehouse]);

    const handleAddWholesalerPlaceholder = (wholesalerName: string) => {
        const placeholderItem: CommissionItem = {
            id: `wholesaler-${wholesalerName}-${Date.now()}`,
            name: `Externe Bestellung: ${wholesalerName}`,
            itemNumber: 'PLATZHALTER',
            source: 'external_order',
            quantity: 1,
            status: 'pending',
        };
        setNewCommissionItems([...newCommissionItems, placeholderItem]);
    };

  const handleAddItemToNewCommission = (item: InventoryItem) => {
    const existingItem = newCommissionItems.find(i => i.id === item.id);
    
    if (existingItem) {
        setNewCommissionItems(newCommissionItems.map(i => i.id === existingItem.id ? {...i, quantity: i.quantity + 1} : i));
    } else {
        const newItem: CommissionItem = {
            id: item.id,
            name: item.name,
            itemNumber: item.preferredManufacturerItemNumber || (Array.isArray(item.manufacturerItemNumbers) && item.manufacturerItemNumbers[0]?.number) || '',
            source: 'main_warehouse',
            quantity: 1,
            status: 'pending',
        };
        setNewCommissionItems([...newCommissionItems, newItem]);
    }
  };

  const handleRemoveItemFromNewCommission = (itemId: string) => {
      setNewCommissionItems(newCommissionItems.filter(i => i.id !== itemId));
  };
  
    const handleUpdateItemQuantity = (itemId: string, newQuantity: number) => {
        setNewCommissionItems(newCommissionItems.map(i => i.id === itemId ? {...i, quantity: Math.max(1, newQuantity)} : i));
    };

  const handleSaveCommission = () => {
    if (!currentUser) {
      toast({ title: 'Fehler', description: 'Benutzer nicht angemeldet oder Datenbankverbindung fehlt.', variant: 'destructive' });
      return;
    }
    if (!newCommissionName.trim() || !newCommissionOrderNumber.trim()) {
      toast({ title: 'Fehler', description: 'Name und Auftragsnummer sind Pflichtfelder.', variant: 'destructive' });
      return;
    }
    
    const allItemsReady = newCommissionItems.length > 0 && newCommissionItems.every(i => i.status === 'ready');
    
    const commissionData: Omit<Commission, 'id' | 'createdAt' | 'createdBy'> = {
        name: newCommissionName.trim(),
        orderNumber: newCommissionOrderNumber.trim(),
        notes: newCommissionNotes.trim(),
        status: allItemsReady ? 'ready' : (newCommissionItems.length > 0 ? 'preparing' : 'draft'),
        items: newCommissionItems,
        withdrawnAt: null,
        isNewlyReady: allItemsReady,
    };

    if (editingCommission) {
        addOrUpdateCommission({ ...editingCommission, ...commissionData });
        toast({ title: 'Kommission aktualisiert', description: `Die Kommission "${commissionData.name}" wurde gespeichert.` });
    } else {
        const newCommission: Commission = {
          id: `commission-${Date.now()}`,
          ...commissionData,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.name,
        };
        addOrUpdateCommission(newCommission);
        toast({ title: 'Kommission erstellt', description: `Die Kommission "${newCommission.name}" wurde angelegt.` });
    }
    
    setIsFormOpen(false);
  };
  
  const handleOpenForm = (commission: Commission | null) => {
    setEditingCommission(commission);
    setNewCommissionName(commission?.name || '');
    setNewCommissionOrderNumber(commission?.orderNumber || '');
    setNewCommissionNotes(commission?.notes || '');
    setNewCommissionItems(commission?.items || []);
    setIsFormOpen(true);
  };

  const handleUpdateCommission = (commission: Commission) => {
      addOrUpdateCommission(commission);
      if (preparingCommission && preparingCommission.id === commission.id) {
        setPreparingCommission(commission);
      }
      if (detailCommission && detailCommission.id === commission.id) {
        setDetailCommission(commission);
      }
  }
  
  const handleWithdraw = (commission: Commission) => {
    addOrUpdateCommission({ ...commission, status: 'withdrawn', withdrawnAt: new Date().toISOString() });
    toast({ title: 'Kommission entnommen', description: `Die Kommission "${commission.name}" wurde als entnommen markiert.` });
  };
  
  const handleDelete = (commission: Commission) => {
    deleteCommission(commission.id);
    toast({ title: 'Kommission gelöscht', variant: 'destructive', description: `Die Kommission "${commission.name}" wurde gelöscht.` });
    setCommissionToDelete(null);
  };

  const activeCommissions = React.useMemo(() => {
    return (commissions || []).filter(c => c.status !== 'withdrawn').sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [commissions]);

  const withdrawnCommissions = React.useMemo(() => {
    return (commissions || []).filter(c => c.status === 'withdrawn').sort((a, b) => new Date(b.withdrawnAt || b.createdAt).getTime() - new Date(a.withdrawnAt || a.createdAt).getTime());
  }, [commissions]);
  
  const handleReactivate = (commission: Commission) => {
      addOrUpdateCommission({ ...commission, status: 'preparing', withdrawnAt: null });
      toast({ title: "Kommission reaktiviert", description: `"${commission.name}" ist wieder aktiv.` });
  };

  const handleSelectWithdrawn = (commissionId: string, checked: boolean) => {
      const newSelection = new Set(selectedWithdrawn);
      if (checked) {
          newSelection.add(commissionId);
      } else {
          newSelection.delete(commissionId);
      }
      setSelectedWithdrawn(newSelection);
  };
  
  const handleSelectAllWithdrawn = (checked: boolean) => {
      if (checked) {
          setSelectedWithdrawn(new Set(withdrawnCommissions.map(c => c.id)));
      } else {
          setSelectedWithdrawn(new Set());
      }
  };

  const handleBulkDelete = () => {
      selectedWithdrawn.forEach(id => deleteCommission(id));
      toast({ title: 'Kommissionen gelöscht', description: `${selectedWithdrawn.size} entnommene Kommissionen wurden gelöscht.`, variant: 'destructive' });
      setSelectedWithdrawn(new Set());
      setIsBulkDeleteOpen(false);
  };


  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-lg font-semibold md:text-2xl">Kommissionierung</h1>
        <div className="sm:ml-auto">
          <Button size="sm" className="h-8 gap-1 w-full sm:w-auto" onClick={() => handleOpenForm(null)}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Neue Kommission</span>
          </Button>
        </div>
      </div>
      
       <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Aktiv</TabsTrigger>
            <TabsTrigger value="withdrawn">Entnommen</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
             {isContextLoading ? (
                <Card className="mt-4">
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        <p>Lade Kommissionen...</p>
                    </CardContent>
                </Card>
              ) : activeCommissions.length === 0 ? (
                <Card className="mt-4">
                    <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground py-12">
                            <PackageSearch className="mx-auto h-12 w-12" />
                            <h3 className="mt-4 text-lg font-semibold">Keine aktiven Kommissionen</h3>
                            <p className="mt-2 text-sm">Erstellen Sie eine neue Kommission, um zu beginnen.</p>
                        </div>
                    </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                  {activeCommissions.map(commission => (
                    <Card key={commission.id} className="flex flex-col">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                           <div className="flex-1 min-w-0">
                                <CardTitle className="truncate pr-2">{commission.name}</CardTitle>
                                <CardDescription>Auftrags-Nr: {commission.orderNumber}</CardDescription>
                           </div>
                           <div className="flex items-center">
                                <Badge variant={getStatusVariant(commission.status)}>{getStatusText(commission.status)}</Badge>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
                                          <DropdownMenuItem onSelect={() => setDetailCommission(commission)}>
                                              <Info className="mr-2 h-4 w-4" /> Details anzeigen
                                          </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleOpenForm(commission)}>
                                            <Pencil className="mr-2 h-4 w-4" /> Bearbeiten
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onSelect={() => setCommissionToDelete(commission)}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Löschen
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                           </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow">
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
                      <CardFooter className="grid grid-cols-2 gap-2">
                        <Button className="w-full" variant="outline" onClick={() => setPreparingCommission(commission)}>
                            <ClipboardList className="mr-2 h-4 w-4"/>
                            Vorbereiten
                        </Button>
                        <Button className="w-full" onClick={() => handleWithdraw(commission)} disabled={commission.status !== 'ready'}>
                            <Archive className="mr-2 h-4 w-4"/>
                            Entnehmen
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
        </TabsContent>
        <TabsContent value="withdrawn">
            <div className="mt-4">
                 {selectedWithdrawn.size > 0 && (
                    <div className="mb-4 flex justify-end">
                        <Button variant="destructive" onClick={() => setIsBulkDeleteOpen(true)}>
                            <Trash2 className="mr-2 h-4 w-4"/> {selectedWithdrawn.size} Auswahl löschen
                        </Button>
                    </div>
                )}
                {withdrawnCommissions.length === 0 ? (
                    <Card><CardContent className="pt-6 text-center text-muted-foreground">Keine entnommenen Kommissionen.</CardContent></Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="hidden">
                            <Checkbox id="select-all-withdrawn" 
                                checked={selectedWithdrawn.size === withdrawnCommissions.length && withdrawnCommissions.length > 0} 
                                onCheckedChange={handleSelectAllWithdrawn}
                            />
                        </div>
                        {withdrawnCommissions.map(commission => (
                            <Card key={commission.id} className="relative opacity-70 hover:opacity-100 transition-opacity">
                                <div className="absolute top-2 right-2 z-10">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => setDetailCommission(commission)}><Info className="mr-2 h-4 w-4" /> Details</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleReactivate(commission)}><Undo className="mr-2 h-4 w-4"/> Wieder aktivieren</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setCommissionToDelete(commission)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Löschen</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="absolute top-2 left-2 z-10">
                                     <Checkbox
                                        checked={selectedWithdrawn.has(commission.id)}
                                        onCheckedChange={(checked) => handleSelectWithdrawn(commission.id, !!checked)}
                                        className="h-5 w-5"
                                    />
                                </div>
                                <CardHeader>
                                    <CardTitle className="truncate pr-10">{commission.name}</CardTitle>
                                    <CardDescription>Auftrags-Nr: {commission.orderNumber}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <p className="text-xs text-muted-foreground">Entnommen am {commission.withdrawnAt ? format(new Date(commission.withdrawnAt), 'dd.MM.yyyy HH:mm', { locale: de }) : 'N/A'}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </TabsContent>
      </Tabs>

      {preparingCommission && (
          <CommissionPreparationDialog
            commission={preparingCommission}
            onOpenChange={() => setPreparingCommission(null)}
            onUpdateCommission={handleUpdateCommission}
        />
      )}

      {detailCommission && (
          <CommissionDetailDialog
            commission={detailCommission}
            onOpenChange={() => setDetailCommission(null)}
        />
      )}

      <Dialog open={isFormOpen} onOpenChange={(open) => {
          if (!open) setEditingCommission(null);
          setIsFormOpen(open);
      }}>
        <DialogContent className="max-w-4xl flex flex-col h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingCommission ? 'Kommission bearbeiten' : 'Neue Kommission erstellen'}</DialogTitle>
            <DialogDescription>
                Legen Sie hier eine Kommission an und fügen Sie benötigtes Material hinzu.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow min-h-0">
            <ScrollArea className="h-full -mx-6 px-6">
                <div className="grid md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="order-number">Auftrags-Nr.</Label>
                          <Input id="order-number" value={newCommissionOrderNumber} onChange={(e) => setNewCommissionOrderNumber(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input id="name" value={newCommissionName} onChange={(e) => setNewCommissionName(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="notes">Weitere Infos</Label>
                          <Textarea id="notes" value={newCommissionNotes} onChange={(e) => setNewCommissionNotes(e.target.value)} />
                      </div>
                      
                      <Accordion type="multiple" className="w-full">
                          <AccordionItem value="warehouse">
                              <AccordionTrigger>
                                  <h4 className="font-medium text-sm flex items-center gap-2"><Warehouse className="h-4 w-4"/>Material aus Hauptlager</h4>
                              </AccordionTrigger>
                              <AccordionContent>
                                  <Popover open={isWarehouseSearchOpen} onOpenChange={setIsWarehouseSearchOpen}>
                                      <PopoverTrigger asChild>
                                          <Button variant="outline" role="combobox" className="w-full justify-between">
                                              Artikel suchen...
                                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                           <Command>
                                              <CommandInput placeholder="Artikel suchen..." />
                                              <CommandList className="max-h-[300px] overflow-y-auto">
                                                  <CommandEmpty>Keine Artikel gefunden.</CommandEmpty>
                                                  {Object.entries(mainWarehouseItems.reduce((acc, item) => {
                                                      const groupKey = item.mainLocation || 'Unsortiert';
                                                      if (!acc[groupKey]) acc[groupKey] = [];
                                                      acc[groupKey].push(item);
                                                      return acc;
                                                  }, {} as Record<string, InventoryItem[]>)).map(([mainLocation, subItems]) => (
                                                    <Collapsible key={mainLocation} asChild>
                                                        <CommandGroup>
                                                            <CollapsibleTrigger className="w-full">
                                                              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-left cursor-pointer hover:bg-accent/50 rounded-sm">{mainLocation}</div>
                                                            </CollapsibleTrigger>
                                                            <CollapsibleContent>
                                                                {subItems.map(item => (
                                                                <CommandItem key={item.id} onSelect={() => {
                                                                    handleAddItemToNewCommission(item);
                                                                    setIsWarehouseSearchOpen(false);
                                                                }} className="ml-2">
                                                                    <div className="flex justify-between items-center w-full">
                                                                        <span>{item.name}</span>
                                                                        <span className="text-xs text-muted-foreground">Verf: {item.stocks.find(s => s.locationId === mainWarehouse?.id)?.quantity || 0}</span>
                                                                    </div>
                                                                </CommandItem>
                                                                ))}
                                                            </CollapsibleContent>
                                                        </CommandGroup>
                                                    </Collapsible>
                                                  ))}
                                              </CommandList>
                                          </Command>
                                      </PopoverContent>
                                  </Popover>
                              </AccordionContent>
                          </AccordionItem>
                           <AccordionItem value="external_order">
                              <AccordionTrigger>
                                  <h4 className="font-medium text-sm flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Externe Bestellung hinzufügen</h4>
                              </AccordionTrigger>
                              <AccordionContent>
                                  <p className="text-xs text-muted-foreground mb-2">Fügt einen Platzhalter für eine Lieferung hinzu.</p>
                                  <div className="space-y-2">
                                      {wholesalers.map(wholesaler => (
                                          <Button
                                              key={wholesaler.id}
                                              variant="outline"
                                              className="w-full justify-start"
                                              onClick={() => handleAddWholesalerPlaceholder(wholesaler.name)}
                                          >
                                              <PlusCircle className="mr-2 h-4 w-4" />
                                              {wholesaler.name}
                                          </Button>
                                      ))}
                                  </div>
                              </AccordionContent>
                          </AccordionItem>
                      </Accordion>
                  </div>

                  <div className="flex flex-col gap-4">
                      <h3 className="font-semibold">Benötigtes Material ({newCommissionItems.length})</h3>
                      <div className="border rounded-lg flex-1 flex flex-col min-h-[200px]">
                          {newCommissionItems.length === 0 ? (
                              <div className="flex-1 flex items-center justify-center">
                                <p className="text-sm text-muted-foreground text-center py-10">Fügen Sie links Artikel hinzu.</p>
                            </div>
                          ) : (
                            <div className="p-4 space-y-3">
                                {newCommissionItems.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                                        <div className="flex-1">
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.source === 'main_warehouse' ? 'Aus Hauptlager' : 'Externe Bestellung'}
                                            </p>
                                        </div>
                                          <div className="flex items-center gap-2">
                                            <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleUpdateItemQuantity(item.id, item.quantity - 1)}>
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <Input 
                                                type="number" 
                                                value={item.quantity} 
                                                onChange={(e) => handleUpdateItemQuantity(item.id, parseInt(e.target.value) || 1)} 
                                                className="w-12 h-8 text-center"
                                            />
                                            <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => handleUpdateItemQuantity(item.id, item.quantity + 1)}>
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveItemFromNewCommission(item.id)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                          )}
                      </div>
                  </div>
                </div>
            </ScrollArea>
          </div>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveCommission}>{editingCommission ? 'Änderungen speichern' : 'Kommission anlegen'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={!!commissionToDelete} onOpenChange={() => setCommissionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kommission löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die Kommission &quot;{commissionToDelete?.name}&quot; wirklich endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => commissionToDelete && handleDelete(commissionToDelete)}
            >
              Ja, löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
       <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Auswahl löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                    Möchten Sie die {selectedWithdrawn.size} ausgewählten Kommissionen wirklich endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">Ja, alle löschen</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
