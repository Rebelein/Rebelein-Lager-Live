

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
import { PlusCircle, Archive, PackageSearch, ChevronsUpDown, ClipboardList, Warehouse, CheckCircle, Circle, X, MoreHorizontal, Pencil, Trash2, ShoppingCart, Minus, Plus, Undo, Info, Printer, Mail, ScanLine, Save, RefreshCw, Zap, ZapOff, Camera, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import QRCode from 'react-qr-code';
import { toPng } from 'html-to-image';
import { Slider } from '@/components/ui/slider';
import jsPDF from 'jspdf';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { useCallback, useEffect } from 'react';


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
function CommissionPreparationDialog({
    commission,
    onOpenChange,
    onUpdateCommission,
}: {
    commission: Commission;
    onOpenChange: (open: boolean) => void;
    onUpdateCommission: (oldCommission: Commission, updatedCommission: Commission) => void;
}) {
    const { reduceStockForCommissionItem, increaseStockForCommissionItem } = useAppContext();
    const { toast } = useToast();
    const [localItems, setLocalItems] = React.useState<CommissionItem[]>(() => JSON.parse(JSON.stringify(commission.items)));
    const originalCommissionRef = React.useRef(commission);

    const handleToggleItem = (itemToToggle: CommissionItem) => {
        setLocalItems(currentItems =>
            currentItems.map(item =>
                item.id === itemToToggle.id
                    ? { ...item, status: item.status === 'ready' ? 'pending' : 'ready' }
                    : item
            )
        );
    };

    const handleFinalizePreparation = () => {
        const updatedCommission = { ...originalCommissionRef.current, items: localItems };

        localItems.forEach(updatedItem => {
            const originalItem = originalCommissionRef.current.items.find(oi => oi.id === updatedItem.id);
            if(!originalItem) return;

            const wasReady = originalItem.status === 'ready';
            const isReady = updatedItem.status === 'ready';
            
            if (originalItem.source === 'main_warehouse') {
                 if (isReady && !wasReady) {
                    reduceStockForCommissionItem(originalCommissionRef.current.id, originalItem.id, originalItem.quantity);
                } else if (!isReady && wasReady) {
                    increaseStockForCommissionItem(originalCommissionRef.current.id, originalItem.id, originalItem.quantity);
                }
            } else {
                 if (isReady && !wasReady) {
                    toast({ title: "Position bereitgestellt", description: `"${originalItem.name}" wurde als bereitgestellt markiert.` })
                } else if (!isReady && wasReady) {
                    toast({title: "Position zurückgesetzt", description: `"${originalItem.name}" wurde wieder auf 'ausstehend' gesetzt.`})
                }
            }
        });

        onUpdateCommission(originalCommissionRef.current, updatedCommission);
        onOpenChange(false);
    };

    const handleRemoveItem = (itemId: string) => {
         const itemToRemove = localItems.find(i => i.id === itemId);
         if (!itemToRemove) return;
         setLocalItems(currentItems => currentItems.filter(i => i.id !== itemId));
         toast({ title: 'Artikel entfernt', description: 'Der Artikel wurde aus der Vorbereitung entfernt. Klicken Sie auf "Bereitstellen", um zu speichern.', variant: 'destructive'});
    };
    
    const allItemsReady = localItems.length > 0 && localItems.every(i => i.status === 'ready');

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
                            {localItems.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-10">Noch keine Artikel hinzugefügt.</p>
                            )}
                            {localItems.map(item => (
                                <div key={item.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 group">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleItem(item)}>
                                        {item.status === 'ready' ? <CheckCircle className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                                    </Button>
                                    <div className="flex-1">
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">{item.source === 'external_order' ? `Vorgang: ${item.transactionNumber || 'N/A'}` : item.itemNumber}</p>
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
                    {allItemsReady ? (
                        <Button onClick={handleFinalizePreparation}>Jetzt bereitstellen</Button>
                    ) : (
                         <Button variant="secondary" onClick={() => onOpenChange(false)}>Schließen</Button>
                    )}
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


function CommissionDetailDialog({ commission, onOpenChange, onPrepare, onWithdraw, onEdit, onDelete, onPrint }: { commission: Commission | null, onOpenChange: (open: boolean) => void, onPrepare: (commission: Commission) => void, onWithdraw: (commission: Commission) => void, onEdit: (commission: Commission) => void, onDelete: (commission: Commission) => void, onPrint: (commission: Commission) => void }) {
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
                         <div className="flex-1">
                            <DialogTitle className="text-2xl pr-12">{commission.name}</DialogTitle>
                            <DialogDescription>Auftrags-Nr: {commission.orderNumber}</DialogDescription>
                         </div>
                         <div className="flex items-center gap-2">
                             <Badge variant={getStatusVariant(commission.status)} className="w-fit">{getStatusText(commission.status)}</Badge>
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

const presetLabelSizes = [
  { name: 'Klein (40x20mm)', width: 40, height: 20 },
  { name: 'Mittel (60x30mm)', width: 60, height: 30 },
  { name: 'Groß (80x40mm)', width: 80, height: 40 },
  { name: 'Versand (102x50mm)', width: 102, height: 50 },
];

const DPI = 96;
const MM_PER_INCH = 25.4;
const mmToPx = (mm: number) => (mm / MM_PER_INCH) * DPI;

function PrintCommissionLabelDialog({ commission, commissions = [], onOpenChange, onPrinted }: { commission?: Commission | null, commissions?: Commission[], onOpenChange: (open: boolean) => void, onPrinted?: (printedIds: string[]) => void}) {
    const { toast } = useToast();
    const { appSettings, updateAppSettings } = useAppContext();
    const qrCodeRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

    const [labelSize, setLabelSize] = React.useState({ width: 80, height: 40 });
    const [fontSize, setFontSize] = React.useState(70);
    
    const commissionsToPrint = commission ? [commission] : commissions;

    React.useEffect(() => {
        if(appSettings?.labelSettings?.commission) {
            setLabelSize({
                width: appSettings.labelSettings.commission.width,
                height: appSettings.labelSettings.commission.height,
            });
            setFontSize(appSettings.labelSettings.commission.fontSize);
        }
    }, [appSettings]);

    const generatePdf = React.useCallback(async (singleCommission: Commission): Promise<Blob> => {
        const qrCodeNode = qrCodeRefs.current[singleCommission.id];
        if (!qrCodeNode) throw new Error("Label element not found for " + singleCommission.name);
        
        const dataUrl = await toPng(qrCodeNode, {
          cacheBust: true,
          pixelRatio: 3,
          fontEmbedCSS: `@font-face {
            font-family: 'PT Sans';
            src: url('https://fonts.gstatic.com/s/ptsans/v17/jizaRExUiTo99u79D0-ExdGM.woff2') format('woff2');
            font-weight: normal;
            font-style: normal;
          }
          @font-face {
            font-family: 'PT Sans';
            src: url('https://fonts.gstatic.com/s/ptsans/v17/jizfRExUiTo99u79B_mh4O3f-A.woff2') format('woff2');
            font-weight: bold;
            font-style: normal;
          }`,
        });
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a6'
        });

        const xOffset = 10;
        let yOffset = 10;

        pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, labelSize.width, labelSize.height);
        yOffset += labelSize.height + 15;

        const itemsFromWarehouse = singleCommission.items.filter(item => item.source === 'main_warehouse');
        const itemsFromOrders = singleCommission.items.filter(item => item.source === 'external_order');

        pdf.setFont('PT Sans', 'bold');
        pdf.setFontSize(12);

        if (itemsFromWarehouse.length > 0) {
            pdf.text('Benötigtes Material aus Lager:', xOffset, yOffset);
            yOffset += 7;
            pdf.setFont('PT Sans', 'normal');
            pdf.setFontSize(10);
            itemsFromWarehouse.forEach(item => {
                if (yOffset > 138) { pdf.addPage(); yOffset = 10; }
                pdf.text(`- ${item.quantity}x ${item.name}`, xOffset, yOffset);
                yOffset += 5;
            });
            yOffset += 5;
        }
        
        if (itemsFromOrders.length > 0) {
            pdf.setFont('PT Sans', 'bold');
            pdf.setFontSize(12);
            if (yOffset > 138) { pdf.addPage(); yOffset = 10; }
            pdf.text('Erwartete externe Bestellungen:', xOffset, yOffset);
            yOffset += 7;
            pdf.setFont('PT Sans', 'normal');
            pdf.setFontSize(10);
            itemsFromOrders.forEach(item => {
                 if (yOffset > 138) { pdf.addPage(); yOffset = 10; }
                pdf.text(`- ${item.name} (${item.transactionNumber || 'N/A'})`, xOffset, yOffset);
                yOffset += 5;
            });
        }
        
        return pdf.output('blob');
    }, [labelSize]);

    const handleDownloadPng = React.useCallback(async () => {
        if (commissionsToPrint.length === 0) return;
        const printedIds: string[] = [];

        for (const comm of commissionsToPrint) {
            const qrCodeNode = qrCodeRefs.current[comm.id];
            if (!qrCodeNode) continue;
             try {
                const dataUrl = await toPng(qrCodeNode, {
                    cacheBust: true,
                    pixelRatio: 3,
                    fontEmbedCSS: `@font-face {
                        font-family: 'PT Sans';
                        src: url('https://fonts.gstatic.com/s/ptsans/v17/jizaRExUiTo99u79D0-ExdGM.woff2') format('woff2');
                        font-weight: normal;
                        font-style: normal;
                      }
                      @font-face {
                        font-family: 'PT Sans';
                        src: url('https://fonts.gstatic.com/s/ptsans/v17/jizfRExUiTo99u79B_mh4O3f-A.woff2') format('woff2');
                        font-weight: bold;
                        font-style: normal;
                      }`,
                });
                const link = document.createElement('a');
                link.download = `kommission-${comm.name.replace(/\s+/g, '-')}.png`;
                link.href = dataUrl;
                link.click();
                printedIds.push(comm.id);
            } catch (err) {
                console.error(err);
                toast({ title: `Fehler beim Erstellen von Etikett für ${comm.name}`, variant: 'destructive' });
            }
        }
        if(printedIds.length > 0) {
            toast({ title: `${printedIds.length} Etikett(en) heruntergeladen` });
            onPrinted?.(printedIds);
        }
    }, [commissionsToPrint, toast, onPrinted]);
    
    const handleSaveAsDefault = () => {
        if (!appSettings) return;
        updateAppSettings({
            ...appSettings,
            labelSettings: {
                ...appSettings.labelSettings,
                commission: {
                    width: labelSize.width,
                    height: labelSize.height,
                    fontSize,
                }
            }
        });
        toast({ title: 'Standardeinstellungen gespeichert', description: 'Die aktuellen Einstellungen wurden als Standard für Kommissions-Etiketten gespeichert.' });
    };

    const handleSendEmail = async () => {
        const printerEmail = appSettings?.commission?.printerEmail;
        if (!printerEmail) {
            toast({ title: 'E-Mail-Adresse fehlt', description: 'Bitte hinterlegen Sie die Drucker-E-Mail-Adresse in den Einstellungen.', variant: 'destructive' });
            return;
        }

        if (commissionsToPrint.length !== 1) {
            toast({ title: 'Aktion nicht möglich', description: 'E-Mail-Versand ist nur für ein einzelnes Etikett möglich.', variant: 'destructive' });
            return;
        }
        const singleCommission = commissionsToPrint[0];
        if (!singleCommission) return;

        try {
            const pdfBlob = await generatePdf(singleCommission);
            
            const reader = new FileReader();
            reader.readAsDataURL(pdfBlob); 
            reader.onloadend = function() {
                const mailtoLink = `mailto:${printerEmail}?subject=${encodeURIComponent(`Kommission: ${singleCommission.name}`)}&body=${encodeURIComponent(`Anhang: Kommission-${singleCommission.name.replace(/\s+/g, '-')}.pdf`)}`;
                
                const url = URL.createObjectURL(pdfBlob);
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                downloadLink.download = `Kommission-${singleCommission.name}.pdf`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(url);
                
                toast({ title: 'PDF heruntergeladen', description: 'Das PDF wurde heruntergeladen. Bitte hängen Sie es manuell an die E-Mail an.' });
                
                window.location.href = mailtoLink;
                onPrinted?.([singleCommission.id]);
            }
        } catch (err) {
            console.error(err);
            toast({ title: 'Fehler beim Erstellen des PDFs', variant: 'destructive' });
        }
    };


    const labelWidthPx = mmToPx(labelSize.width);
    const labelHeightPx = mmToPx(labelSize.height);

    if (commissionsToPrint.length === 0) return null;

    return (
        <Dialog open={true} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Etiketten für Kommissionen</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 max-h-[70vh]">
                     <div className="space-y-6 overflow-y-auto pr-4">
                        <div>
                            <Label className="mb-2 block">Voreinstellungen</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {presetLabelSizes.map(preset => (
                                    <Button key={preset.name} variant="outline" size="sm" onClick={() => setLabelSize({ width: preset.width, height: preset.height })}>
                                        {preset.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                             <div>
                                <Label htmlFor="label-width" className="mb-2 block text-sm font-medium">Breite ({labelSize.width}mm)</Label>
                                <Slider id="label-width" min={40} max={150} step={1} value={[labelSize.width]} onValueChange={v => setLabelSize(p => ({...p, width: v[0]!}))} />
                            </div>
                            <div>
                                <Label htmlFor="label-height" className="mb-2 block text-sm font-medium">Höhe ({labelSize.height}mm)</Label>
                                <Slider id="label-height" min={20} max={100} step={1} value={[labelSize.height]} onValueChange={v => setLabelSize(p => ({...p, height: v[0]!}))} />
                            </div>
                            <div>
                                <Label htmlFor="font-size" className="mb-2 block text-sm font-medium">Schriftgröße ({fontSize}%)</Label>
                                <Slider id="font-size" min={50} max={150} step={10} value={[fontSize]} onValueChange={v => setFontSize(v[0]!)} />
                            </div>
                        </div>
                    </div>
                     <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-4 rounded-md min-h-[200px] overflow-auto">
                        <div className="flex flex-wrap gap-2 justify-center">
                            {commissionsToPrint.map(comm => (
                                <div key={comm.id} ref={el => qrCodeRefs.current[comm.id] = el}>
                                    <div
                                        className="p-2 bg-white border flex items-stretch justify-center gap-2"
                                        style={{
                                            fontFamily: "'PT Sans', sans-serif",
                                            width: `${labelWidthPx}px`,
                                            height: `${labelHeightPx}px`,
                                            boxSizing: 'content-box'
                                        }}
                                    >
                                        <div className="flex-1 flex flex-col justify-between overflow-hidden p-1">
                                            <div>
                                                <p className="text-black font-bold" style={{ fontSize: `${Math.max(8, (labelHeightPx * 0.15) * (fontSize / 100))}px`, lineHeight: 1.1 }}>{comm.name}</p>
                                                <p className="text-gray-600" style={{ fontSize: `${Math.max(7, (labelHeightPx * 0.12) * (fontSize / 100))}px`, lineHeight: 1 }}>Auftrag: {comm.orderNumber}</p>
                                            </div>
                                            {comm.notes && <p className="text-gray-500 italic text-xs" style={{ fontSize: `${Math.max(6, (labelHeightPx * 0.1) * (fontSize / 100))}px`, lineHeight: 1.2 }}>&quot;{comm.notes}&quot;</p>}
                                        </div>
                                        <div className="h-full flex items-center justify-center p-1" style={{ width: `${Math.min(labelHeightPx - 8, 120)}px` }}>
                                            <QRCode value={`commission::${comm.id}`} size={Math.min(labelHeightPx - 8, 120)} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter className="justify-between">
                    <Button variant="outline" onClick={handleSaveAsDefault}><Save className="mr-2 h-4 w-4"/> Als Standard speichern</Button>
                    <div className="flex gap-2">
                        <DialogClose asChild><Button variant="secondary">Schließen</Button></DialogClose>
                        {commissionsToPrint.length === 1 && <Button variant="outline" onClick={handleSendEmail}><Mail className="mr-2 h-4 w-4"/> Per E-Mail senden</Button>}
                        <Button onClick={handleDownloadPng}><Printer className="mr-2 h-4 w-4"/> Herunterladen (Bild)</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type SortKey = 'name' | 'orderNumber' | 'createdAt' | 'status';

export default function CommissioningPage() {
  const { currentUser, items, wholesalers, mainWarehouse, addOrUpdateCommission, deleteCommission, commissions, isLoading: isContextLoading, updateUserSettings } = useAppContext();
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
  const [addingWholesaler, setAddingWholesaler] = React.useState<string | null>(null);
  const [wholesalerTransactionNumber, setWholesalerTransactionNumber] = React.useState('');
  
  const [preparingCommission, setPreparingCommission] = React.useState<Commission | null>(null);
  const [detailCommission, setDetailCommission] = React.useState<Commission | null>(null);
  const [printingCommission, setPrintingCommission] = React.useState<Commission | null>(null);
  const [scannedCommission, setScannedCommission] = React.useState<Commission | null>(null);

  const [commissionJustSaved, setCommissionJustSaved] = React.useState<Commission | null>(null);
  const [isPostSavePrintOpen, setIsPostSavePrintOpen] = React.useState(false);
  
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [scannerType, setScannerType] = React.useState<'qr' | 'barcode'>('qr');
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const webcamRef = React.useRef<Webcam>(null);
  const lastScannedId = React.useRef<string | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = React.useState(false);

  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = React.useState<string | undefined>(undefined);
  const [torchSupported, setTorchSupported] = React.useState(false);
  const [torchOn, setTorchOn] = React.useState(false);

  const [sortConfig, setSortConfig] = React.useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  const [openSections, setOpenSections] = React.useState<string[]>([]);
  const [isCompactView, setIsCompactView] = React.useState(false);
  
  const [isLabelQueueOpen, setIsLabelQueueOpen] = React.useState(false);
  const [selectedLabelsToPrint, setSelectedLabelsToPrint] = React.useState<Set<string>>(new Set());
  
   React.useEffect(() => {
    if (currentUser) {
      const initialOpen: string[] = [];
      if (!currentUser.commissioningView?.draftsCollapsed) {
        initialOpen.push('drafts');
      }
      if (!currentUser.commissioningView?.readyCollapsed) {
        initialOpen.push('ready');
      }
      setOpenSections(initialOpen);
      setIsCompactView(currentUser.commissioningView?.isCompact ?? false);
    }
  }, [currentUser]);

  const handleSectionToggle = (value: string[]) => {
    setOpenSections(value);
    if (currentUser) {
        updateUserSettings({
            commissioningView: {
                ...currentUser.commissioningView,
                draftsCollapsed: !value.includes('drafts'),
                readyCollapsed: !value.includes('ready'),
            }
        });
    }
  };
  
    const handleCompactViewChange = (checked: boolean) => {
        setIsCompactView(checked);
        if (currentUser) {
            updateUserSettings({
                commissioningView: {
                    ...currentUser.commissioningView,
                    isCompact: checked,
                }
            });
        }
    };


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
            transactionNumber: wholesalerTransactionNumber
        };
        setNewCommissionItems([...newCommissionItems, placeholderItem]);
        setAddingWholesaler(null);
        setWholesalerTransactionNumber('');
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

    const handleUpdateTransactionNumber = (itemId: string, transactionNumber: string) => {
        setNewCommissionItems(newCommissionItems.map(i => i.id === itemId ? { ...i, transactionNumber } : i));
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
    
    let commissionData: Commission;

    if (editingCommission) {
        handleUpdateCommission(editingCommission, {
          ...editingCommission,
          name: newCommissionName.trim(),
          orderNumber: newCommissionOrderNumber.trim(),
          notes: newCommissionNotes.trim(),
          items: newCommissionItems
        })
        toast({ title: 'Kommission aktualisiert', description: `Die Kommission "${newCommissionName.trim()}" wurde gespeichert.` });
    } else {
        commissionData = {
          id: `commission-${Date.now()}`,
          name: newCommissionName.trim(),
          orderNumber: newCommissionOrderNumber.trim(),
          notes: newCommissionNotes.trim(),
          status: 'draft',
          items: newCommissionItems,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.name,
          withdrawnAt: null,
          isNewlyReady: true,
          needsLabel: true, // Mark for printing
        };
        addOrUpdateCommission(commissionData); 
        toast({ title: 'Kommission erstellt', description: `Die Kommission "${commissionData.name}" wurde angelegt.` });
        
        setCommissionJustSaved(commissionData);
        setIsPostSavePrintOpen(true);
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

  const handleUpdateCommission = (oldCommission: Commission, updatedCommission: Commission) => {
      const allItemsReady = updatedCommission.items.length > 0 && updatedCommission.items.every(i => i.status === 'ready');
      
      let newStatus: Commission['status'] = updatedCommission.status;
      if(updatedCommission.status !== 'withdrawn') {
        newStatus = allItemsReady ? 'ready' : (updatedCommission.items.length > 0 ? 'preparing' : 'draft');
      }

      const commissionToSave: Commission = { ...updatedCommission, status: newStatus };

      const wasPreparing = oldCommission.status === 'draft' || oldCommission.status === 'preparing';
      const isNowReady = newStatus === 'ready';

      if (wasPreparing && isNowReady) {
        commissionToSave.isNewlyReady = true;
      }

      addOrUpdateCommission(commissionToSave);
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

  const handleRequestSort = (key: SortKey) => {
    setSortConfig(prev => {
        if (prev.key === key) {
            return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
        return { key, direction: 'asc' };
    });
  };

  const sortCommissions = (commissionList: Commission[]) => {
    return [...commissionList].sort((a, b) => {
        const { key, direction } = sortConfig;
        const dir = direction === 'asc' ? 1 : -1;
        
        switch(key) {
            case 'name': return a.name.localeCompare(b.name) * dir;
            case 'orderNumber': return a.orderNumber.localeCompare(b.orderNumber) * dir;
            case 'status': return getStatusText(a.status).localeCompare(getStatusText(b.status)) * dir;
            case 'createdAt':
            default: return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir * -1; // Default to desc
        }
    });
  };
  
  const readyCommissions = React.useMemo(() => {
    if (!commissions) return [];
    return sortCommissions(commissions.filter(c => c.status === 'ready'));
  }, [commissions, sortConfig]);

  const draftCommissions = React.useMemo(() => {
      if (!commissions) return [];
      return sortCommissions(commissions.filter(c => c.status === 'draft' || c.status === 'preparing'));
  }, [commissions, sortConfig]);

  const withdrawnCommissions = React.useMemo(() => {
    if (!commissions) return [];
    return [...commissions]
        .filter(c => c.status === 'withdrawn')
        .sort((a,b) => (new Date(b.withdrawnAt || b.createdAt).getTime() - new Date(a.withdrawnAt || a.createdAt).getTime()));
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
  
  React.useEffect(() => {
    if (!isContextLoading && commissions) {
      const urlParams = new URLSearchParams(window.location.search);
      const commissionId = urlParams.get('commissionId');
      if (commissionId) {
        const foundCommission = commissions.find(c => c.id === commissionId);
        if (foundCommission) {
          if (urlParams.get('openDetails')) {
            setDetailCommission(foundCommission);
          } else if (urlParams.get('openPrepare')) {
            setPreparingCommission(foundCommission);
          } else if (urlParams.get('action') === 'withdraw') {
            handleWithdraw(foundCommission);
          } else if (urlParams.get('openEdit')) {
            handleOpenForm(foundCommission);
          } else if (urlParams.get('openDelete')) {
            setCommissionToDelete(foundCommission);
          } else if (urlParams.get('openPrint')) {
            setPrintingCommission(foundCommission);
          }
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    }
  }, [isContextLoading, commissions]);

  const handleDevices = React.useCallback(
    (mediaDevices: MediaDeviceInfo[]) => {
        const videoDevices = mediaDevices.filter(({ kind }) => kind === 'videoinput');
        setDevices(videoDevices);
        const backCamera = videoDevices.find(device => device.label.toLowerCase().includes('back'));
        const newDeviceId = backCamera ? backCamera.deviceId : videoDevices[0]?.deviceId;
        if (newDeviceId) {
            setActiveDeviceId(newDeviceId);
        }
    },
    []
);

   const checkTorchSupport = React.useCallback(async () => {
        if (webcamRef.current?.stream) {
            try {
                const track = webcamRef.current.stream.getVideoTracks()[0];
                if (!track) {
                    setTorchSupported(false);
                    return;
                }
                const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
                setTorchSupported(!!capabilities.torch);
            } catch (e) {
                console.error("Error checking torch support:", e);
                setTorchSupported(false);
            }
        }
    }, []);

    const switchCamera = () => {
        if (devices.length > 1 && activeDeviceId) {
            const currentIndex = devices.findIndex(d => d.deviceId === activeDeviceId);
            const nextIndex = (currentIndex + 1) % devices.length;
            setActiveDeviceId(devices[nextIndex]?.deviceId);
        }
    };
  
  const openScanner = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        handleDevices(mediaDevices);
        stream.getTracks().forEach(track => track.stop());
        setIsScannerOpen(true);
    } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
            variant: 'destructive',
            title: 'Kamerazugriff verweigert',
            description: 'Bitte aktivieren Sie den Kamerazugriff in Ihren Browsereinstellungen.',
        });
    }
  };

  const handleScan = React.useCallback((scannedData: string) => {
    if (scannedData.startsWith('commission::')) {
        const commissionId = scannedData.split('::')[1];
        const foundCommission = commissions?.find(c => c.id === commissionId);
        if (foundCommission) {
            setScannedCommission(foundCommission);
            setIsScannerOpen(false);
            setIsActionDialogOpen(true);
        } else {
            toast({ title: 'Kommission nicht gefunden', variant: 'destructive'});
        }
    } else {
        const activeCommissions = [...draftCommissions, ...readyCommissions];
        for (const commission of activeCommissions) {
            for (const item of commission.items) {
                if (item.source === 'external_order' && item.transactionNumber && scannedData.includes(item.transactionNumber)) {
                    toast({ title: 'Lieferschein erkannt!', description: `Öffne Vorbereitung für Kommission "${commission.name}".`});
                    setPreparingCommission(commission);
                    setIsScannerOpen(false);
                    return;
                }
            }
        }
        toast({ title: 'Keine passende Kommission gefunden', description: 'Der gescannte Code konnte keiner externen Bestellung zugeordnet werden.', variant: 'destructive' });
    }
    lastScannedId.current = null;
  }, [draftCommissions, readyCommissions, commissions, toast]);

    const captureCode = React.useCallback(async () => {
        if (!webcamRef.current) return;
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        const image = new window.Image();
        image.src = imageSrc;
        await new Promise(resolve => image.onload = resolve);
        
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(image, 0, 0, image.width, image.height);
        const imageData = ctx.getImageData(0, 0, image.width, image.height);

        let codeFound = false;

        if (scannerType === 'qr') {
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
            if (qrCode && qrCode.data && lastScannedId.current !== qrCode.data) {
                lastScannedId.current = qrCode.data;
                codeFound = true;
                handleScan(qrCode.data);
            }
        } else if (scannerType === 'barcode' && 'BarcodeDetector' in window) {
            try {
                // @ts-expect-error BarcodeDetector is not in global types
                const barcodeDetector = new window.BarcodeDetector({ formats: ['code_128', 'ean_13', 'code_39'] });
                const barcodes = await barcodeDetector.detect(imageData);
                if (barcodes.length > 0 && barcodes[0] && lastScannedId.current !== barcodes[0].rawValue) {
                    lastScannedId.current = barcodes[0].rawValue;
                    codeFound = true;
                    handleScan(barcodes[0].rawValue);
                }
            } catch (e) { console.warn('BarcodeDetector API not available or failed.', e); }
        }

        if (codeFound) {
            setTimeout(() => { lastScannedId.current = null; }, 3000);
        }
    }, [handleScan, scannerType]);

    React.useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (isScannerOpen && hasCameraPermission) {
            intervalId = setInterval(captureCode, 500);
        }
        return () => clearInterval(intervalId);
    }, [isScannerOpen, hasCameraPermission, captureCode]);

    useEffect(() => {
        if (webcamRef.current?.stream) {
            checkTorchSupport();
        }
    }, [webcamRef.current?.stream, checkTorchSupport, activeDeviceId]);

    const toggleTorch = async () => {
        if (webcamRef.current?.stream && torchSupported) {
            try {
                const track = webcamRef.current.stream.getVideoTracks()[0];
                if (!track) return;
                await track.applyConstraints({
                    advanced: [{ torch: !torchOn } as MediaTrackConstraintSet]
                });
                setTorchOn(!torchOn);
            } catch (e) {
                console.error("Failed to toggle torch:", e);
                toast({ title: "Fehler", description: "Licht konnte nicht umgeschaltet werden.", variant: "destructive" });
            }
        }
    };
    
    const labelsToPrint = React.useMemo(() => {
        return commissions.filter(c => c.needsLabel);
    }, [commissions]);

    const handlePrintFromQueue = (printedIds: string[]) => {
        printedIds.forEach(id => {
            const commission = commissions.find(c => c.id === id);
            if (commission) {
                addOrUpdateCommission({ ...commission, needsLabel: false });
            }
        });
        setSelectedLabelsToPrint(new Set());
        if(printedIds.length === commissions.filter(c => selectedLabelsToPrint.has(c.id)).length) {
            setIsLabelQueueOpen(false);
        }
    }

    const CommissionCard = ({ commission }: { commission: Commission }) => {
        if (isCompactView) {
            return (
                <Collapsible>
                    <div className="rounded-lg bg-card shadow-sm border">
                        <div className="flex items-center justify-between p-3">
                            <CollapsibleTrigger className="flex-1 min-w-0 text-left">
                                <p className="font-semibold truncate">{commission.name}</p>
                                <p className="text-xs text-muted-foreground truncate">Auftrags-Nr: {commission.orderNumber}</p>
                            </CollapsibleTrigger>
                            <Badge variant={getStatusVariant(commission.status)}>{getStatusText(commission.status)}</Badge>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => setDetailCommission(commission)}><Info className="mr-2 h-4 w-4" /> Details</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleOpenForm(commission)}><Pencil className="mr-2 h-4 w-4" /> Bearbeiten</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setPrintingCommission(commission)}><Printer className="mr-2 h-4 w-4" /> Etikett</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => setCommissionToDelete(commission)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Löschen</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <CollapsibleContent>
                            <CardContent className="pt-0 border-t">
                                {commission.notes ? (
                                    <p className="text-sm text-muted-foreground italic h-10 overflow-hidden text-ellipsis pt-4">
                                        &quot;{commission.notes}&quot;
                                    </p>
                                ) : (
                                    <div className="h-10 pt-4"></div>
                                )}
                                <p className="text-xs text-muted-foreground mt-4">
                                    Erstellt von {commission.createdBy} am {format(new Date(commission.createdAt), 'dd.MM.yyyy', { locale: de })}
                                </p>
                            </CardContent>
                            <CardFooter className="grid grid-cols-2 gap-2">
                                <Button className={cn("w-full", commission.items.length === 0 && "hidden")} variant="outline" onClick={() => setPreparingCommission(commission)}>
                                    <ClipboardList className="mr-2 h-4 w-4"/> Vorbereiten
                                </Button>
                                <Button className={cn("w-full", commission.items.length === 0 && "col-span-2")} onClick={() => handleWithdraw(commission)} disabled={commission.status !== 'ready' && !(commission.status === 'draft' && commission.items.length === 0)}>
                                    <Archive className="mr-2 h-4 w-4"/> Entnehmen
                                </Button>
                            </CardFooter>
                        </CollapsibleContent>
                    </div>
                </Collapsible>
            );
        }

        return (
            <Card className="flex flex-col">
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
                                    <DropdownMenuItem onSelect={() => setDetailCommission(commission)}><Info className="mr-2 h-4 w-4" /> Details anzeigen</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleOpenForm(commission)}><Pencil className="mr-2 h-4 w-4" /> Bearbeiten</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setPrintingCommission(commission)}><Printer className="mr-2 h-4 w-4" /> Etikett drucken</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => setCommissionToDelete(commission)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Löschen</DropdownMenuItem>
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
                    <Button className={cn("w-full", commission.items.length === 0 && "hidden")} variant="outline" onClick={() => setPreparingCommission(commission)}>
                        <ClipboardList className="mr-2 h-4 w-4"/> Vorbereiten
                    </Button>
                    <Button className={cn("w-full", commission.items.length === 0 && "col-span-2")} onClick={() => handleWithdraw(commission)} disabled={commission.status !== 'ready' && !(commission.status === 'draft' && commission.items.length === 0)}>
                        <Archive className="mr-2 h-4 w-4"/> Entnehmen
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    const CommissionSection = ({ commissionsList }: { commissionsList: Commission[]}) => (
        <div className="space-y-4">
            {commissionsList.length > 0 ? (
                 <div className={cn("grid gap-4", !isCompactView && "md:grid-cols-2 lg:grid-cols-3")}>
                    {commissionsList.map(commission => (
                       <CommissionCard key={commission.id} commission={commission} />
                    ))}
                </div>
            ) : (
                 <Card className="mt-4">
                    <CardContent className="pt-6">
                        <div className="text-center text-muted-foreground py-12">
                            <PackageSearch className="mx-auto h-12 w-12" />
                            <h3 className="mt-4 text-lg font-semibold">Keine Kommissionen</h3>
                            <p className="mt-2 text-sm">Für diese Kategorie gibt es keine Kommissionen.</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );


  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-lg font-semibold md:text-2xl">Kommissionierung</h1>
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                        <ArrowUpDown className="h-4 w-4" /> Sortieren
                        {sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 text-muted-foreground" /> : <ArrowDown className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Sortieren nach</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={sortConfig.key} onValueChange={(value) => handleRequestSort(value as SortKey)}>
                        <DropdownMenuRadioItem value="createdAt">Erstelldatum</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="orderNumber">Auftrags-Nr.</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="status">Status</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-transparent">
                        <div className="flex items-center justify-between w-full">
                            <Label htmlFor="compact-view">Kompaktansicht</Label>
                            <Switch id="compact-view" checked={isCompactView} onCheckedChange={handleCompactViewChange} />
                        </div>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={openScanner}>
                <ScanLine className="h-4 w-4" />
                <span>Scannen</span>
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1 relative" onClick={() => setIsLabelQueueOpen(true)}>
                <Printer className="h-3.5 w-3.5" />
                {labelsToPrint.length > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 justify-center rounded-full">
                        {labelsToPrint.length}
                    </Badge>
                )}
            </Button>
          <Button size="sm" className="h-8 gap-1" onClick={() => handleOpenForm(null)}>
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
              ) : (
                <Accordion type="multiple" value={openSections} onValueChange={handleSectionToggle} className="w-full space-y-4 mt-4">
                    <AccordionItem value="ready" className="border-b-0">
                        <AccordionTrigger className="text-lg font-semibold bg-card px-4 py-3 rounded-lg border hover:no-underline">
                            Bereitgestellt ({readyCommissions.length})
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                            <CommissionSection commissionsList={readyCommissions} />
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="drafts" className="border-b-0">
                        <AccordionTrigger className="text-lg font-semibold bg-card px-4 py-3 rounded-lg border hover:no-underline">
                            Entwürfe & In Vorbereitung ({draftCommissions.length})
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                            <CommissionSection commissionsList={draftCommissions} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
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
                                            <DropdownMenuItem onSelect={() => setPrintingCommission(commission)}><Printer className="mr-2 h-4 w-4"/> Etikett</DropdownMenuItem>
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
            onPrepare={setPreparingCommission}
            onWithdraw={handleWithdraw}
            onEdit={(c) => { setDetailCommission(null); handleOpenForm(c); }}
            onDelete={(c) => { setDetailCommission(null); setCommissionToDelete(c); }}
            onPrint={(c) => { setDetailCommission(null); setPrintingCommission(c); }}
        />
      )}
      
      {printingCommission && (
        <PrintCommissionLabelDialog 
            commission={printingCommission}
            onOpenChange={() => setPrintingCommission(null)}
            onPrinted={(printedIds) => addOrUpdateCommission({ ...printingCommission, needsLabel: false })}
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
          
          <ScrollArea className="flex-grow min-h-0 -mx-6 px-6">
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
                                  <div className="space-y-3">
                                      {wholesalers.map(wholesaler => (
                                        <div key={wholesaler.id}>
                                            {addingWholesaler === wholesaler.id ? (
                                                <div className="p-3 border rounded-lg space-y-3">
                                                    <Label htmlFor={`transaction-${wholesaler.id}`}>Vorgangsnummer für {wholesaler.name}</Label>
                                                    <Input
                                                        id={`transaction-${wholesaler.id}`}
                                                        value={wholesalerTransactionNumber}
                                                        onChange={(e) => setWholesalerTransactionNumber(e.target.value)}
                                                        placeholder="Vorgangs- oder Kommissionsnummer"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="ghost" onClick={() => setAddingWholesaler(null)}>Abbrechen</Button>
                                                        <Button size="sm" onClick={() => handleAddWholesalerPlaceholder(wholesaler.name)}>Hinzufügen</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start"
                                                    onClick={() => setAddingWholesaler(wholesaler.id)}
                                                >
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    {wholesaler.name}
                                                </Button>
                                            )}
                                        </div>
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
                                    <div key={item.id} className="flex flex-col gap-2 p-2 rounded-md hover:bg-muted/50">
                                        <div className="flex items-center gap-3">
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
                                         {item.source === 'external_order' && (
                                            <div className="pl-6">
                                                <Label htmlFor={`tn-${item.id}`} className="text-xs text-muted-foreground">Vorgangs-Nr.</Label>
                                                <Input
                                                    id={`tn-${item.id}`}
                                                    value={item.transactionNumber || ''}
                                                    onChange={(e) => handleUpdateTransactionNumber(item.id, e.target.value)}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                          )}
                      </div>
                  </div>
                </div>
            </ScrollArea>
          
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
              Möchten Sie die Kommission &quot;{commissionToDelete?.name}&quot; wirklich endgültig löschen?
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

      <AlertDialog open={isPostSavePrintOpen} onOpenChange={setIsPostSavePrintOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Kommission erstellt</AlertDialogTitle>
                <AlertDialogDescription>
                    Möchten Sie jetzt ein Etikett für die Kommission &quot;{commissionJustSaved?.name}&quot; drucken?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="grid grid-cols-3 gap-2">
                <AlertDialogCancel asChild className="col-span-1">
                    <Button variant="secondary" onClick={() => { setIsPostSavePrintOpen(false); setCommissionJustSaved(null); }}>Schließen</Button>
                </AlertDialogCancel>
                 <Button variant="outline" className="col-span-1" onClick={() => { addOrUpdateCommission({ ...commissionJustSaved!, needsLabel: true }); setIsPostSavePrintOpen(false); setCommissionJustSaved(null); }}>Später drucken</Button>
                 <AlertDialogAction asChild className="col-span-1">
                    <Button onClick={() => {
                        if (commissionJustSaved) {
                            setPrintingCommission(commissionJustSaved);
                            addOrUpdateCommission({ ...commissionJustSaved, needsLabel: false });
                        }
                        setIsPostSavePrintOpen(false);
                        setCommissionJustSaved(null);
                    }}>Ja, jetzt drucken</Button>
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kommission scannen</DialogTitle>
            <DialogDescription>
              Richten Sie die Kamera auf den QR-Code eines Kommissions-Etiketts oder den Barcode eines Lieferscheins.
            </DialogDescription>
          </DialogHeader>
           <div className="flex items-center space-x-2 my-2 justify-center">
              <Label htmlFor="scanner-type-switch">QR-Code</Label>
              <Switch
                  id="scanner-type-switch"
                  checked={scannerType === 'barcode'}
                  onCheckedChange={(checked) => setScannerType(checked ? 'barcode' : 'qr')}
              />
              <Label htmlFor="scanner-type-switch">Barcode</Label>
          </div>
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg border aspect-video">
            {hasCameraPermission === true ? (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ deviceId: activeDeviceId, advanced: [{ autoFocus: 'continuous' } as MediaTrackConstraintSet] }}
                className="h-full w-full object-cover"
                onUserMedia={checkTorchSupport}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-muted p-4">
                <Alert variant="destructive">
                  <AlertTitle>Kamerazugriff erforderlich</AlertTitle>
                  <AlertDescription>
                    Bitte erlauben Sie den Zugriff auf die Kamera, um diese Funktion zu nutzen.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            {hasCameraPermission !== false && (
              <>
                <div className="absolute inset-0 rounded-lg border-[20px] border-black/20"></div>
                <div className={cn(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-destructive opacity-75",
                    scannerType === 'qr' ? 'h-2/3 w-2/3' : 'h-1/3 w-5/6'
                )}></div>
              </>
            )}
          </div>
           <div className="flex items-center justify-center gap-4">
                {devices.length > 1 && (
                    <Button variant="outline" onClick={switchCamera}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Kamera wechseln
                    </Button>
                )}
                {torchSupported && (
                    <Button variant="outline" onClick={toggleTorch}>
                        {torchOn ? <ZapOff className="mr-2 h-4 w-4" /> : <Zap className="mr-2 h-4 w-4" />}
                        Licht
                    </Button>
                )}
            </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsScannerOpen(false)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isActionDialogOpen} onOpenChange={(open) => { if (!open) setScannedCommission(null); setIsActionDialogOpen(open); }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Kommission gescannt: {scannedCommission?.name}</DialogTitle>
                <DialogDescription>Wählen Sie eine Aktion aus.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <Button variant="outline" size="lg" onClick={() => {
                    setDetailCommission(scannedCommission);
                    setIsActionDialogOpen(false);
                }}>Details</Button>
                 <Button variant="outline" size="lg" onClick={() => {
                    setPreparingCommission(scannedCommission);
                    setIsActionDialogOpen(false);
                }}>Vorbereiten</Button>
                <Button size="lg" onClick={() => {
                    if (scannedCommission) handleWithdraw(scannedCommission);
                    setIsActionDialogOpen(false);
                }} disabled={scannedCommission?.status !== 'ready' && !(scannedCommission?.status === 'draft' && scannedCommission?.items.length === 0)}>
                  <Archive className="mr-2 h-4 w-4" /> Entnehmen
                </Button>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLabelQueueOpen} onOpenChange={setIsLabelQueueOpen}>
          <DialogContent className="max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Ausstehende Etiketten</DialogTitle>
                  <DialogDescription>
                      Wählen Sie die Kommissionen aus, für die Sie jetzt Etiketten drucken möchten.
                  </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6 py-4">
                 {labelsToPrint.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">Keine ausstehenden Etiketten.</p>
                 ) : (
                    <div className="space-y-2">
                        <div className="flex items-center p-2 border-b">
                            <Checkbox 
                                id="select-all-labels"
                                checked={selectedLabelsToPrint.size === labelsToPrint.length}
                                onCheckedChange={(checked) => {
                                    if(checked) {
                                        setSelectedLabelsToPrint(new Set(labelsToPrint.map(l => l.id)))
                                    } else {
                                        setSelectedLabelsToPrint(new Set())
                                    }
                                }}
                            />
                            <Label htmlFor="select-all-labels" className="ml-3 font-semibold">Alle auswählen</Label>
                        </div>
                        {labelsToPrint.map(commission => (
                            <div key={commission.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                                <Checkbox 
                                    id={`label-${commission.id}`}
                                    checked={selectedLabelsToPrint.has(commission.id)}
                                    onCheckedChange={(checked) => {
                                        const newSet = new Set(selectedLabelsToPrint);
                                        if (checked) newSet.add(commission.id);
                                        else newSet.delete(commission.id);
                                        setSelectedLabelsToPrint(newSet);
                                    }}
                                />
                                <Label htmlFor={`label-${commission.id}`} className="flex-1 cursor-pointer">
                                    <p className="font-medium">{commission.name}</p>
                                    <p className="text-xs text-muted-foreground">Auftrag: {commission.orderNumber}</p>
                                </Label>
                            </div>
                        ))}
                    </div>
                 )}
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button variant="secondary">Schließen</Button></DialogClose>
                  <Button 
                    onClick={() => {
                        const commissionsToPrint = commissions.filter(c => selectedLabelsToPrint.has(c.id));
                        setPrintingCommission(commissionsToPrint[0]); // Hack to open the dialog
                        setIsLabelQueueOpen(false);
                    }}
                    disabled={selectedLabelsToPrint.size === 0}
                   >
                     {selectedLabelsToPrint.size} Etikett(en) drucken
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

       {isLabelQueueOpen && selectedLabelsToPrint.size > 0 && (
          <PrintCommissionLabelDialog 
            commissions={commissions.filter(c => selectedLabelsToPrint.has(c.id))}
            onOpenChange={(open) => { if (!open) setIsLabelQueueOpen(false); }}
            onPrinted={handlePrintFromQueue}
          />
      )}
    </div>
  );
}
