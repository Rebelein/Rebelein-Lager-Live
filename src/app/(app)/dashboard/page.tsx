

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardTrigger } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { differenceInDays, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileClock, Truck, Package, PackagePlus, PackageMinus, History, Warehouse, Wrench, Calendar, User, GripVertical, Car, Settings2, LayoutGrid, PackageSearch, CheckCircle2, ScanLine, ClipboardCheck, StickyNote, Expand, X, Info, Circle, Archive, ClipboardList, Pencil, Trash2, Printer, MoreHorizontal } from 'lucide-react';
import { getChangeLogActionText, getOrderStatusBadgeVariant, getOrderStatusText, isInventoryItem } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InventoryItem, DashboardCardLayout, ChangeLogEntry, Commission, CommissionItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const useIsDesktop = () => {
    const [isDesktop, setIsDesktop] = React.useState(false);

    React.useEffect(() => {
        const checkScreenSize = () => {
            setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    return isDesktop;
};

const getCardTitle = (id: string) => {
    switch (id) {
        case 'machines': return 'Maschinenstatus';
        case 'commissions': return 'Kommissionen';
        case 'lowStock': return 'Artikel unter Mindestbestand';
        case 'arranged': return 'Angeordnete Bestellungen';
        case 'ordered': return 'Bestellte Artikel';
        case 'totalItems': return 'Artikelvarianten';
        case 'totalStock': return 'Gesamtlagerbestand';
        case 'main-warehouse-activities': return 'Aktivitäten Hauptlager';
        case 'other-locations-activities': return 'Aktivitäten Fahrzeuge';
        case 'inventory-status': return 'Inventurstatus';
        case 'turnover': return 'Lagerbewegungen';
        default: return 'Unbekannte Kachel';
    }
}

const ScannerModeDashboard = () => {
    const router = useRouter();

    const handleScanClick = (page: string) => {
        if (page.startsWith('/')) {
            router.push(page);
        } else {
            const event = new CustomEvent('openGlobalScanner', { detail: { type: page } });
            window.dispatchEvent(event);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full gap-8 p-4">
            <h1 className="text-3xl font-bold text-center">Scanner-Modus</h1>
            <div className="grid w-full max-w-md gap-6">
                <Button className="h-24 text-xl" onClick={() => handleScanClick('inventory-list')}>
                    <Package className="mr-4 h-8 w-8" />
                    Lagerbestand
                </Button>
                <Button className="h-24 text-xl" onClick={() => handleScanClick('commissioning')}>
                    <PackageSearch className="mr-4 h-8 w-8" />
                    Kommission
                </Button>
                <Button className="h-24 text-xl" onClick={() => handleScanClick('/inventory')}>
                    <ClipboardCheck className="mr-4 h-8 w-8" />
                    Inventur
                </Button>
            </div>
        </div>
    );
};


function CommissionDetailDialog({ commission, onOpenChange, onPrepare, onWithdraw, onEdit, onDelete, onPrint }: { commission: Commission | null, onOpenChange: (open: boolean) => void, onPrepare: (commission: Commission) => void, onWithdraw: (commission: Commission) => void, onEdit: (commission: Commission) => void, onDelete: (commission: Commission) => void, onPrint: (commission: Commission) => void}) {
    if (!commission) {
        return null;
    }
    
    const itemsFromWarehouse = commission.items.filter(item => item.source === 'main_warehouse');
    const itemsFromOrders = commission.items.filter(item => item.source === 'external_order');

    const getItemStatusIcon = (status: CommissionItem['status']) => {
        switch (status) {
            case 'pending': return <Circle className="h-5 w-5 text-muted-foreground" />;
            case 'ready': return <CheckCircle2 className="h-5 w-5 text-primary" />;
            default: return null;
        }
    };

    return (
        <Dialog open={!!commission} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-start justify-between">
                         <div className='flex-1'>
                            <DialogTitle className="text-2xl pr-12">{commission.name}</DialogTitle>
                            <DialogDescription>Auftrags-Nr: {commission.orderNumber}</DialogDescription>
                         </div>
                         <div className="flex items-center gap-2">
                             <Badge variant={getOrderStatusBadgeVariant(commission.status)} className="w-fit">{getOrderStatusText(commission.status)}</Badge>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => onEdit(commission)}><Pencil className="mr-2 h-4 w-4" /> Bearbeiten</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => onPrint(commission)}><Printer className="mr-2 h-4 w-4" /> Etikett drucken</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => onDelete(commission)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Löschen</DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                         </div>
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
                                                        <p className="text-xs text-muted-foreground">Vorgang: {item.transactionNumber || 'N/A'}</p>
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
                 <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                    <DialogClose asChild><Button variant="secondary" className="w-full sm:w-auto">Schließen</Button></DialogClose>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        {commission.status !== 'ready' && commission.status !== 'withdrawn' && (
                            <Button variant="outline" onClick={() => { onOpenChange(false); onPrepare(commission); }}>
                                <ClipboardList className="mr-2 h-4 w-4" /> Vorbereiten
                            </Button>
                        )}
                        <Button onClick={() => { onOpenChange(false); onWithdraw(commission); }} disabled={commission.status !== 'ready' && !(commission.items.length === 0 && commission.status === 'draft')}>
                            <Archive className="mr-2 h-4 w-4" /> Entnehmen
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function DashboardPage() {
    const { items, allChangelog, locations, dashboardLayout, setDashboardLayout, currentUser, allDashboardCards, commissions, addOrUpdateCommission } = useAppContext();
    const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
    const [isManageCardsOpen, setIsManageCardsOpen] = React.useState(false);
    const [expandedCardId, setExpandedCardId] = React.useState<string | null>(null);
    const isDesktop = useIsDesktop();
    const [detailCommission, setDetailCommission] = React.useState<Commission | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    const stats = React.useMemo(() => {
        if (!items || !locations) return { lowStockItems: [], arrangedItems: [], orderedItems: [], totalItems: 0, totalStock: 0 };
        
        const lowStockItems: {item: InventoryItem, locationName: string}[] = [];
        const arrangedItems: {item: InventoryItem, locationName: string, quantity: number}[] = [];
        const orderedItems: {item: InventoryItem, locationName: string, quantity: number}[] = [];


        items.forEach(item => {
          if (isInventoryItem(item)) {
            (item.stocks || []).forEach(stock => {
              const minStock = (item.minStocks || []).find(ms => ms.locationId === stock.locationId)?.quantity ?? 0;
              const reorderStatus = (item.reorderStatus || {})[stock.locationId];
              if (stock.quantity < minStock && !reorderStatus?.status) {
                const location = locations.find(l => l.id === stock.locationId);
                lowStockItems.push({ item: item, locationName: location?.name || 'Unbekannt' });
              }
            });

            Object.entries(item.reorderStatus || {}).forEach(([locationId, status]) => {
              const location = locations.find(l => l.id === locationId);
              if (status?.status === 'arranged') {
                  arrangedItems.push({ item: item, locationName: location?.name || 'Unbekannt', quantity: status.quantity || 0 });
              }
              if (status?.status === 'ordered') {
                  orderedItems.push({ item: item, locationName: location?.name || 'Unbekannt', quantity: status.quantity || 0 });
              }
            });
          }
        });

        const totalStock = items.reduce((acc, item) => acc + (item.stocks || []).reduce((sAcc, s) => sAcc + s.quantity, 0), 0);

        return { lowStockItems, arrangedItems, orderedItems, totalItems: items.length, totalStock };
    }, [items, locations]);
    
    const mainWarehouse = React.useMemo(() => locations.find(l => !l.isVehicle), [locations]);

    const mainWarehouseChangelog = React.useMemo(() => {
        if (!mainWarehouse) return [];
        return allChangelog.filter(log => log.locationId === mainWarehouse.id);
    }, [allChangelog, mainWarehouse]);
    
    const otherLocationsChangelog = React.useMemo(() => {
        if (!mainWarehouse) return allChangelog;
        return allChangelog.filter(log => log.locationId !== mainWarehouse.id);
    }, [allChangelog, mainWarehouse]);

    const sensors = useSensors(
      useSensor(PointerSensor, {
          activationConstraint: {
            distance: 8,
          },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = dashboardLayout.layout.findIndex(item => item.id === active.id);
            const newIndex = dashboardLayout.layout.findIndex(item => item.id === over.id);
            const newLayout = arrayMove(dashboardLayout.layout, oldIndex, newIndex);
            setDashboardLayout(newLayout);
        }
        setActiveDragId(null);
    };

    const handleDragStart = (event: DragEndEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleSizeChange = (id: string, size: 'small' | 'default' | 'wide') => {
        const newLayout = dashboardLayout.layout.map(item => 
            item.id === id ? { ...item, size } : item
        );
        setDashboardLayout(newLayout);
    };

    const handleVisibilityChange = (id: string, isVisible: boolean) => {
         const newLayout = dashboardLayout.layout.map(item => 
            item.id === id ? { ...item, hidden: !isVisible } : item
        );
        setDashboardLayout(newLayout);
    };
    
    const handleWithdraw = (commission: Commission) => {
        addOrUpdateCommission({ ...commission, status: 'withdrawn', withdrawnAt: new Date().toISOString() });
        toast({ title: 'Kommission entnommen', description: `Die Kommission "${commission.name}" wurde als entnommen markiert.` });
    };

    const handlePrepare = (commission: Commission) => {
        router.push(`/commissioning?commissionId=${commission.id}&openPrepare=true`);
    };
    
    const handleEdit = (commission: Commission) => {
        router.push(`/commissioning?commissionId=${commission.id}&openEdit=true`);
    }

    const handleDelete = (commission: Commission) => {
        router.push(`/commissioning?commissionId=${commission.id}&openDelete=true`);
    }

    const handlePrint = (commission: Commission) => {
        router.push(`/commissioning?commissionId=${commission.id}&openPrint=true`);
    }

    if (currentUser?.isScannerMode) {
        return <ScannerModeDashboard />;
    }


    const getCardComponent = (cardLayout: DashboardCardLayout) => {
        const { id, size } = cardLayout;
        const key = id;
        const cardProps = {
            id,
            size,
            onSizeChange: (newSize: 'small' | 'default' | 'wide') => handleSizeChange(id, newSize),
            isExpanded: expandedCardId === id,
            onToggleExpand: () => setExpandedCardId(expandedCardId === id ? null : id)
        };
        switch (id) {
            case 'machines': return <MachinesCard key={key} {...cardProps} />;
            case 'commissions': return <CommissionsCard key={key} {...cardProps} onCommissionClick={setDetailCommission} />;
            case 'lowStock': return <StatCard key={key} {...cardProps} title="Artikel unter Mindestbestand" value={stats.lowStockItems.length} icon={AlertCircle} description="Benötigen Aufmerksamkeit">{stats.lowStockItems.length > 0 ? (<div className="space-y-2 text-sm max-h-56 overflow-y-auto pr-2">{stats.lowStockItems.map(({item, locationName}) => (<div key={`${item.id}-${locationName}`} className="flex justify-between"><span>{item.name}</span><span className="text-muted-foreground">{locationName}</span></div>))}</div>) : (<p className="text-sm text-muted-foreground">Alle Bestände sind im grünen Bereich.</p>)}</StatCard>;
            case 'arranged': return <StatCard key={key} {...cardProps} title="Angeordnete Bestellungen" value={stats.arrangedItems.length} icon={FileClock} description="Warten auf Bestellung">{stats.arrangedItems.length > 0 ? (<div className="space-y-2 text-sm max-h-56 overflow-y-auto pr-2">{stats.arrangedItems.map(({item, locationName, quantity}) => (<div key={`${item.id}-${locationName}`} className="flex justify-between"><span>{quantity}x {item.name}</span><span className="text-muted-foreground">{locationName}</span></div>))}</div>) : (<p className="text-sm text-muted-foreground">Keine Bestellungen angeordnet.</p>)}</StatCard>;
            case 'ordered': return <StatCard key={key} {...cardProps} title="Bestellte Artikel" value={stats.orderedItems.length} icon={Truck} description="Warten auf Lieferung">{stats.orderedItems.length > 0 ? (<div className="space-y-2 text-sm max-h-56 overflow-y-auto pr-2">{stats.orderedItems.map(({item, locationName, quantity}) => (<div key={`${item.id}-${locationName}`} className="flex justify-between"><span>{quantity}x {item.name}</span><span className="text-muted-foreground">{locationName}</span></div>))}</div>) : (<p className="text-sm text-muted-foreground">Aktuell keine offenen Bestellungen.</p>)}</StatCard>;
            case 'totalItems': return <StatCard key={key} {...cardProps} title="Artikelvarianten" value={stats.totalItems} icon={Package} description="Anzahl einzigartiger Artikel" />;
            case 'totalStock': return <StatCard key={key} {...cardProps} title="Gesamtlagerbestand" value={stats.totalStock} icon={Warehouse} description="Anzahl aller Teile im Lager" />;
            case 'main-warehouse-activities': return <ActivityCard key={key} {...cardProps} title="Aktivitäten Hauptlager" icon={Warehouse} changelog={mainWarehouseChangelog} />;
            case 'other-locations-activities': return <ActivityCard key={key} {...cardProps} title="Aktivitäten Fahrzeuge" icon={Car} changelog={otherLocationsChangelog} />;
            case 'inventory-status': return <InventoryStatusCard key={key} {...cardProps} />;
            case 'turnover': return <TurnoverCard key={key} {...cardProps} />;
            default: return null;
        }
    };
    
    const getGridSpan = (id: string, size: 'small' | 'default' | 'wide') => {
        if (expandedCardId) {
            return { col: 'lg:col-span-3', row: 'lg:row-span-3' };
        }
        const isActivityCard = id.includes('activities');
        const isCommissionOrMachineCard = id === 'commissions' || id === 'machines';
        switch(size) {
            case 'small': return { col: 'lg:col-span-1', row: 'lg:row-span-1' };
            case 'wide': return { col: 'lg:col-span-2', row: 'lg:row-span-2' };
            default: 
                 if (isActivityCard || isCommissionOrMachineCard) {
                    return { col: 'lg:col-span-1', row: 'lg:row-span-2' };
                }
                return { col: 'lg:col-span-1', row: 'lg:row-span-1' };
        }
    }

    if (!items || !allChangelog) {
        return <div>Loading...</div>
    }

    const visibleCards = expandedCardId 
        ? dashboardLayout.layout.filter(l => l.id === expandedCardId) 
        : dashboardLayout.layout.filter(l => !l.hidden);

    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-6">
             <div className="flex items-center gap-4">
                <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
                {currentUser?.isDashboardEditing && <Badge variant="destructive" className="ml-2 animate-pulse">Bearbeitungsmodus</Badge>}
                <div className="ml-auto">
                    {currentUser?.isDashboardEditing && (
                        <Button variant="outline" size="sm" onClick={() => setIsManageCardsOpen(true)}>
                            <LayoutGrid className="h-4 w-4 mr-2" />
                            Kacheln verwalten
                        </Button>
                    )}
                </div>
            </div>
            
            <div className={cn(
                "gap-4", 
                isDesktop ? "grid lg:grid-cols-3 auto-rows-fr" : "flex flex-col",
                expandedCardId && "grid lg:grid-cols-1 lg:grid-rows-1 h-[80vh]"
            )}>
                <SortableContext items={dashboardLayout.layout.map(item => item.id)} disabled={!dashboardLayout.isEditing || !isDesktop || !!expandedCardId}>
                    {visibleCards.map((cardLayout) => {
                        const cardComponent = getCardComponent(cardLayout);
                        if (!cardComponent) return null;
                        
                        const spans = getGridSpan(cardLayout.id, cardLayout.size);

                        if (isDesktop) {
                             return <div key={cardLayout.id} className={cn(spans.col, spans.row)}>{cardComponent}</div>;
                        }

                        return <div key={cardLayout.id}>{cardComponent}</div>
                    })}
                </SortableContext>
            </div>
        </div>
         <Dialog open={isManageCardsOpen} onOpenChange={setIsManageCardsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Kacheln verwalten</DialogTitle>
                    <DialogDescription>
                        Wählen Sie aus, welche Kacheln auf Ihrem Dashboard angezeigt werden sollen.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {dashboardLayout.layout.map(card => (
                        <div key={card.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor={`visibility-${card.id}`} className="font-medium">
                                {getCardTitle(card.id)}
                            </Label>
                            <Switch
                                id={`visibility-${card.id}`}
                                checked={!card.hidden}
                                onCheckedChange={(checked) => handleVisibilityChange(card.id, checked)}
                            />
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button onClick={() => setIsManageCardsOpen(false)}>Fertig</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <CommissionDetailDialog 
          commission={detailCommission} 
          onOpenChange={() => setDetailCommission(null)} 
          onPrepare={handlePrepare}
          onWithdraw={handleWithdraw}
          onEdit={(c) => { setDetailCommission(null); handleEdit(c); }}
          onDelete={(c) => { setDetailCommission(null); handleDelete(c); }}
          onPrint={(c) => { setDetailCommission(null); handlePrint(c); }}
        />
      </DndContext>
    );
}

// Helper components for cards to keep the main component cleaner

const DraggableCardWrapper = ({ id, onSizeChange, currentSize, children }: { id: string; onSizeChange: (size: 'small' | 'default' | 'wide') => void; currentSize: 'small' | 'default' | 'wide'; children: React.ReactNode }) => {
    const { dashboardLayout } = useAppContext();
    const isDesktop = useIsDesktop();
    const canDrag = dashboardLayout.isEditing && isDesktop;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !canDrag });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style} className={"relative h-full"}>
             {canDrag && (
                <div className="absolute top-1 right-1 z-20 flex gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-muted-foreground/50 hover:text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                                <Settings2 className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuLabel>Größe ändern</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={currentSize} onValueChange={(value) => onSizeChange(value as 'small' | 'default' | 'wide')}>
                                <DropdownMenuRadioItem value="small">Klein</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="default">Standard</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="wide">Breit</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                     <div {...listeners} {...attributes} className="p-1 cursor-grab text-muted-foreground/50 hover:text-muted-foreground">
                        <GripVertical className="h-5 w-5" />
                    </div>
                </div>
            )}
            {children}
        </div>
    );
}

const MachinesCard = ({ id, size, onSizeChange }: { id: string; size: 'small' | 'default' | 'wide', onSizeChange: (size: 'small' | 'default' | 'wide') => void }) => {
    const { items } = useAppContext();
    const isDesktop = useIsDesktop();
    const machines = React.useMemo(() => items.filter(item => item.itemType === 'machine'), [items]);
    const rentedMachines = React.useMemo(() => machines.filter(m => m.rentalStatus === 'rented'), [machines]);
    const repairMachines = React.useMemo(() => machines.filter(m => m.rentalStatus === 'in_repair'), [machines]);

    const DesktopView = () => (
        <div className="grid grid-cols-2 gap-4 h-full">
            <div className="space-y-2">
                <h4 className="font-semibold text-center text-sm border-b pb-2">Verliehen ({rentedMachines.length})</h4>
                <div className="space-y-2 pt-2 text-sm">
                    {rentedMachines.length > 0 ? rentedMachines.map(m => (
                        <div key={m.id} className="p-2 border rounded-md">
                            <p className="font-medium truncate">{m.name}</p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><User className="h-3 w-3"/> {m.rentedBy?.name}</p>
                        </div>
                    )) : <p className="text-xs text-muted-foreground text-center">Keine</p>}
                </div>
            </div>
             <div className="space-y-2">
                <h4 className="font-semibold text-center text-sm border-b pb-2 text-destructive">Reparatur ({repairMachines.length})</h4>
                 <div className="space-y-2 pt-2 text-sm">
                    {repairMachines.length > 0 ? repairMachines.map(m => (
                        <div key={m.id} className="p-2 border border-destructive/50 bg-destructive/10 rounded-md">
                            <p className="font-medium truncate text-destructive">{m.name}</p>
                        </div>
                    )) : <p className="text-xs text-muted-foreground text-center">Keine</p>}
                </div>
            </div>
        </div>
    );

    const MobileView = () => (
         <Tabs defaultValue="rented" className="flex flex-col flex-grow">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="rented">Verliehen ({rentedMachines.length})</TabsTrigger>
                <TabsTrigger value="repair">Reparatur ({repairMachines.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="rented" className="mt-4 flex-grow">{rentedMachines.length > 0 ? <div className="space-y-4">{rentedMachines.map(machine => (<div key={machine.id} className="flex items-center gap-4 p-2 rounded-lg border"><Wrench className="h-5 w-5 text-primary" /><div className="flex-1"><p className="font-semibold">{machine.name}</p><p className="text-sm text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {machine.rentedBy?.name}</p></div></div>))}</div> : <p className="text-center text-muted-foreground py-8">Aktuell sind keine Maschinen verliehen.</p>}</TabsContent>
            <TabsContent value="repair" className="mt-4 flex-grow">{repairMachines.length > 0 ? <div className="space-y-4">{repairMachines.map(machine => (<div key={machine.id} className="flex items-center gap-4 p-2 rounded-lg border border-destructive/50 bg-destructive/10"><Wrench className="h-5 w-5 text-destructive" /><div className="flex-1"><p className="font-semibold text-destructive">{machine.name}</p></div></div>))}</div> : <p className="text-center text-muted-foreground py-8">Keine Maschinen in Reparatur.</p>}</TabsContent>
        </Tabs>
    );

    return (
        <DraggableCardWrapper id={id} currentSize={size} onSizeChange={onSizeChange}>
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle>Maschinenstatus</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                    {isDesktop ? <DesktopView /> : <MobileView />}
                </CardContent>
            </Card>
        </DraggableCardWrapper>
    );
}

const CommissionsCard = ({ id, size, onSizeChange, isExpanded, onToggleExpand, onCommissionClick }: { id: string; size: 'small' | 'default' | 'wide', onSizeChange: (size: 'small' | 'default' | 'wide') => void, isExpanded: boolean, onToggleExpand: () => void, onCommissionClick: (commission: Commission) => void }) => {
    const { commissions, addOrUpdateCommission } = useAppContext();
    const router = useRouter();
    const { toast } = useToast();
    
    const [editingNote, setEditingNote] = React.useState<Commission | null>(null);
    const [noteContent, setNoteContent] = React.useState('');

    const draftCommissions = React.useMemo(() => {
        return (commissions || []).filter(c => c.status === 'draft' || c.status === 'preparing');
    }, [commissions]);

    const readyCommissions = React.useMemo(() => {
        return (commissions || []).filter(c => c.status === 'ready');
    }, [commissions]);

    const handleToggleGlow = (e: React.MouseEvent, commission: Commission) => {
        e.stopPropagation();
        addOrUpdateCommission({ ...commission, isNewlyReady: !commission.isNewlyReady });
    };

    const handleOpenNote = (e: React.MouseEvent, commission: Commission) => {
        e.stopPropagation();
        setNoteContent(commission.notes || '');
        setEditingNote(commission);
    };

    const handleSaveNote = () => {
        if (!editingNote) return;
        addOrUpdateCommission({ ...editingNote, notes: noteContent });
        toast({ title: 'Notiz gespeichert', description: `Notiz für Kommission "${editingNote.name}" wurde aktualisiert.` });
        setEditingNote(null);
    };
    
    const CommissionSection = ({ title, commissionsList }: { title: string, commissionsList: Commission[] }) => {
        const itemsToShow = isExpanded ? commissionsList : commissionsList.slice(0, 10);
        return (
            <div className="space-y-2 flex flex-col">
                <h4 className="font-semibold text-center text-sm border-b pb-2">{title} ({commissionsList.length})</h4>
                <div className={cn("space-y-2 pt-2 text-sm flex-grow", isExpanded && "overflow-y-auto")}>
                    {itemsToShow.length > 0 ? itemsToShow.map(c => {
                        const isNew = c.isNewlyReady;
                        return (
                        <div key={c.id} className={cn("p-0.5 rounded-lg", isNew && title === 'Bereitgestellt' && "bg-green-500 animate-glow-green")}>
                            <div className="p-2 border rounded-md cursor-pointer hover:bg-muted bg-card relative" onClick={() => onCommissionClick(c)}>
                                <p className="font-medium truncate">{c.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{c.orderNumber}</p>
                                {c.notes && <p className="text-xs text-muted-foreground italic truncate">&quot;{c.notes}&quot;</p>}
                                <div className='absolute top-0 right-0 flex'>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-yellow-500" onClick={(e) => handleOpenNote(e, c)}>
                                        <StickyNote className={cn("h-5 w-5", c.notes && "text-yellow-500 fill-yellow-100")} />
                                    </Button>
                                    {title === 'Bereitgestellt' && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-green-600" onClick={(e) => handleToggleGlow(e, c)}>
                                            <CheckCircle2 className={cn("h-5 w-5", isNew && "text-green-600")} />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                        )
                    }) : <p className="text-xs text-muted-foreground text-center">Keine</p>}
                </div>
            </div>
        )
    };


    return (
        <DraggableCardWrapper id={id} currentSize={size} onSizeChange={onSizeChange}>
            <Card className="h-full flex flex-col">
                <CardHeader className="flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <PackageSearch className="h-5 w-5 text-primary" />
                        <CardTitle>Kommissionen</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleExpand}>
                       {isExpanded ? <X className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
                    </Button>
                </CardHeader>
                <CardContent className="flex-grow grid grid-cols-2 gap-4 overflow-hidden">
                    <CommissionSection title="Entwurf" commissionsList={draftCommissions} />
                    <CommissionSection title="Bereitgestellt" commissionsList={readyCommissions} />
                </CardContent>
            </Card>
            {editingNote && (
                 <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Notiz für: {editingNote.name}</DialogTitle>
                            <DialogDescription>
                                Fügen Sie eine Notiz zu dieser Kommission hinzu oder bearbeiten Sie die bestehende.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Textarea
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                placeholder="Ihre Notiz hier..."
                                className="min-h-[100px]"
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setEditingNote(null)}>Abbrechen</Button>
                            <Button onClick={handleSaveNote}>Speichern</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </DraggableCardWrapper>
    );
};


const ActivityCard = ({ id, size, onSizeChange, title, icon: Icon, changelog }: { id: string; size: 'small' | 'default' | 'wide'; onSizeChange: (size: 'small' | 'default' | 'wide') => void; title: string; icon: React.ElementType; changelog: ChangeLogEntry[] }) => {
    return (
        <DraggableCardWrapper id={id} currentSize={size} onSizeChange={onSizeChange}>
            <Card className="h-full flex flex-col">
                <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5 text-primary" /> {title}</CardTitle></CardHeader>
                <CardContent className="flex-grow overflow-hidden pl-2"><div className="space-y-4 h-full overflow-y-auto">{changelog.slice(0, 10).map((log, index) => (<div key={`${log.id}-${index}`} className="flex items-center gap-4 pr-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">{log.type === 'in' || log.type === 'received' ? <PackagePlus className="h-4 w-4 text-green-500" /> : log.type === 'out' ? <PackageMinus className="h-4 w-4 text-red-500" /> : <History className="h-4 w-4 text-gray-500" />}</div><div className="grid gap-1 flex-1"><p className="text-sm font-medium leading-none truncate">{log.itemName || 'Artikel'}</p><p className="text-sm text-muted-foreground">{getChangeLogActionText(log)} von {log.userName}</p></div><div className="ml-auto font-medium text-sm text-muted-foreground">{format(new Date(log.date), 'dd.MM HH:mm', { locale: de })}</div></div>))}</div></CardContent>
            </Card>
        </DraggableCardWrapper>
    );
};

const StatCard = ({ id, size, onSizeChange, title, value, icon: Icon, description, children }: { id: string; size: 'small' | 'default' | 'wide'; onSizeChange: (size: 'small' | 'default' | 'wide') => void; title: string; value: string | number; icon: React.ElementType; description: string; children?: React.ReactNode }) => {
    return (
        <DraggableCardWrapper id={id} currentSize={size} onSizeChange={onSizeChange}>
            {children ? (
                 <Collapsible asChild>
                     <Card className="h-full flex flex-col">
                        <CardTrigger className="w-full text-left flex-grow">
                           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                                <Icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{value}</div>
                                {size !== 'small' && <p className="text-xs text-muted-foreground">{description}</p>}
                            </CardContent>
                        </CardTrigger>
                        <CollapsibleContent><CardContent className="pt-4">{children}</CardContent></CollapsibleContent>
                     </Card>
                 </Collapsible>
            ) : (
                <Card className="h-full">
                   <div className={cn("flex h-full flex-col justify-between p-4", size === 'small' ? 'items-center justify-center text-center' : '')}>
                         <div className={cn("flex w-full items-start justify-between", size === 'small' ? 'flex-col items-center gap-1' : '')}>
                            <CardTitle className="text-sm font-medium">{title}</CardTitle>
                            {size !== 'small' && <Icon className="h-4 w-4 text-muted-foreground" />}
                         </div>
                        <div className={cn("mt-auto", size === 'small' ? 'text-center' : '')}>
                            <div className="text-2xl font-bold">{value}</div>
                            {size !== 'small' && <p className="text-xs text-muted-foreground">{description}</p>}
                        </div>
                    </div>
                </Card>
            )}
        </DraggableCardWrapper>
    );
};

const InventoryStatusCard = ({ id, size, onSizeChange }: { id: string; size: 'small' | 'default' | 'wide', onSizeChange: (size: 'small' | 'default' | 'wide') => void }) => {
    const { items } = useAppContext();
    const inventoryStatusData = React.useMemo(() => {
        const data = [
          { status: 'ok', name: 'Aktuell (< 8T)', value: 0, fill: 'hsl(var(--chart-2))' },
          { status: 'due', name: 'Fällig (8-30T)', value: 0, fill: 'hsl(var(--chart-3))' },
          { status: 'overdue', name: 'Überfällig (>30T)', value: 0, fill: 'hsl(var(--chart-5))' },
        ];
        if (!items) return data;
        items.forEach(item => {
          if (isInventoryItem(item)) {
            if (!item.lastInventoriedAt) {
              data[2].value++;
              return;
            }
            const allDates = Object.values(item.lastInventoriedAt).filter(Boolean) as string[];
            if (allDates.length === 0) {
              data[2].value++;
              return;
            }
            const latestDate = allDates.reduce((latest, current) => new Date(current) > new Date(latest) ? current : latest);
            const days = differenceInDays(new Date(), new Date(latestDate));
            
            if (days <= 7) data[0].value++;
            else if (days <= 30) data[1].value++;
            else data[2].value++;
          } else {
            // For machines, assume not inventoried or handle differently
            data[2].value++;
          }
        });
        return data.filter(d => d.value > 0);
    }, [items]);

    const chartConfig = {
        ok: { label: 'Aktuell', color: 'hsl(var(--chart-2))' },
        due: { label: 'Fällig', color: 'hsl(var(--chart-3))' },
        overdue: { label: 'Überfällig', color: 'hsl(var(--chart-5))' },
    } satisfies React.ComponentProps<typeof ChartContainer>["config"];

    return (
    <DraggableCardWrapper id={id} currentSize={size} onSizeChange={onSizeChange}>
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Inventurstatus</CardTitle>
        <CardDescription>Verteilung der Artikel nach letzter Zählung</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full w-full">
            <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <Pie data={inventoryStatusData} dataKey="value" nameKey="name" innerRadius={40} strokeWidth={5}>
                    {inventoryStatusData.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} className="focus:outline-none" />
                    ))}
                </Pie>
            </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
    </DraggableCardWrapper>
    )
}

const TurnoverCard = ({ id, size, onSizeChange }: { id: string; size: 'small' | 'default' | 'wide', onSizeChange: (size: 'small' | 'default' | 'wide') => void }) => {
    const { allChangelog } = useAppContext();
    const stockTurnoverData = React.useMemo(() => {
        const last30days = new Date();
        last30days.setDate(last30days.getDate() - 30);
        
        if (!allChangelog) return [];
        
        const ins = allChangelog.filter(log => log.type === 'in' && new Date(log.date) > last30days).reduce((acc, log) => acc + (log.quantity || 0), 0);
        const outs = allChangelog.filter(log => log.type === 'out' && new Date(log.date) > last30days).reduce((acc, log) => acc + (log.quantity || 0), 0);

        return [
            { name: 'Zugänge', value: ins, fill: 'hsl(var(--chart-2))' },
            { name: 'Abgänge', value: outs, fill: 'hsl(var(--chart-5))' },
        ];
    }, [allChangelog]);
    
    return (
    <DraggableCardWrapper id={id} currentSize={size} onSizeChange={onSizeChange}>
    <Card className="h-full flex flex-col">
       <CardHeader>
        <CardTitle>Lagerbewegungen</CardTitle>
        <CardDescription>Zugänge vs. Abgänge (letzte 30 Tage)</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={{}} className="h-full w-full">
            <BarChart data={stockTurnoverData} layout="vertical" margin={{left: 0, right: 10}}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{fill: "hsl(var(--muted-foreground))", fontSize: 12}} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="value" radius={5} />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
    </DraggableCardWrapper>
    )
}

    





