

'use client'

import * as React from 'react'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppContext } from '@/context/AppContext'
import type { InventoryItem, Order, OrderItem, Location, Wholesaler } from '@/lib/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { ClipboardCopy, ShoppingCart, Inbox, Minus, Plus, X, Trash2, Truck, PackageCheck, Scan, Check, FileWarning, Camera, Zap, ZapOff, RefreshCw, Upload, ImagePlus, ClipboardPaste, AlertTriangle, FileDown } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { getOrderStatusBadgeVariant, getOrderStatusText, isInventoryItem } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { analyzeDeliveryNote, type AnalyzeDeliveryNoteOutput, type DeliveryNoteItem } from '@/ai/flows/analyze-delivery-note-flow'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import Webcam from 'react-webcam'
import { Slider } from '@/components/ui/slider'
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

// Configure the worker script path
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

function CopyOrderDialog({ order, onOpenChange }: { order: { orderNumber: string, items: (OrderItem[] | InventoryItem[]), isDraft: boolean } | null, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    const [copiedItems, setCopiedItems] = React.useState<Set<string>>(new Set());

    const copyToClipboard = (textToCopy: string, itemId: string, itemName: string) => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            toast({
                title: 'Artikelnummer kopiert',
                description: `Nummer für "${itemName}" wurde in die Zwischenablage kopiert.`
            });
            setCopiedItems(prev => new Set(prev).add(itemId));
        }).catch(err => {
            console.error('Failed to copy: ', err);
            toast({
                title: 'Fehler',
                description: 'Artikelnummer konnte nicht kopiert werden.',
                variant: 'destructive'
            });
        });
    };
    
    React.useEffect(() => {
        // Reset copied items when the dialog is opened with a new order
        if (order) {
            setCopiedItems(new Set());
        }
    }, [order]);


    if (!order) return null;

    return (
        <Dialog open={!!order} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Artikelnummer kopieren</DialogTitle>
                    <DialogDescription>
                        Klicken Sie auf einen Artikel, um die Artikelnummer zu kopieren. Bestell-Nr: {order.orderNumber}
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto my-4 pr-2">
                    <div className="space-y-2">
                        {order.items.map((item, index) => {
                            const isDraftItem = order.isDraft;
                            const itemId = (item as any).id || (item as any).itemId;
                            const itemNumber = isDraftItem
                                ? (item as OrderItem).wholesalerItemNumber || (item as OrderItem).itemNumber
                                : ('itemType' in item && item.itemType === 'item' ? ((item as InventoryItem).suppliers?.find((s: any) => s.wholesalerId === (item as InventoryItem).preferredWholesalerId)?.wholesalerItemNumber || (item as InventoryItem).manufacturerItemNumbers[0]?.number) : '');

                            const itemName = isDraftItem ? (item as OrderItem).itemName : (item as InventoryItem).name;
                            const isCopied = copiedItems.has(itemId);
                            
                            return (
                                <Button
                                    key={itemId || index}
                                    variant="outline"
                                    className={cn(
                                        "w-full h-auto justify-start py-2 transition-colors duration-200",
                                        isCopied && "bg-green-100 dark:bg-green-900/50 border-green-500 hover:bg-green-100/90"
                                    )}
                                    onClick={() => copyToClipboard(itemNumber || '', itemId, itemName)}
                                >
                                    <div className="flex-1 flex flex-col text-left">
                                        <span className="font-semibold">{itemName}</span>
                                        <span className="text-xs text-muted-foreground">{itemNumber}</span>
                                    </div>
                                    {isCopied && <Check className="h-5 w-5 text-green-600" />}
                                </Button>
                            )
                        })}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>Schließen</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function OrdersPage() {
  const { items, wholesalers, createOrder, confirmOrder, currentUser, orders, receiveOrderItem, removeItemFromDraftOrder, locations, addItemsToOrder, cancelArrangedOrder, loadCommissionedItem, appSettings, removeSingleItemFromArrangedOrder, updateDraftOrderItemQuantity } = useAppContext()
  const { toast } = useToast()
  const [isReceiveModalOpen, setIsReceiveModalOpen] = React.useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = React.useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = React.useState(false);
  const [isCommissionDialog, setIsCommissionDialog] = React.useState(false);
  const [cancellingInfo, setCancellingInfo] = React.useState<{ wholesalerId: string; itemsToCancel: InventoryItem[]; locationId: string; } | null>(null);
  
  const [isCopyModalOpen, setIsCopyModalOpen] = React.useState(false);
  const [copyModalContent, setCopyModalContent] = React.useState<{ orderNumber: string, items: (InventoryItem[] | OrderItem[]), isDraft: boolean } | null>(null);

  const [receivingInfo, setReceivingInfo] = React.useState<{ order: Order; item: OrderItem } | null>(null);
  const [receivedQuantity, setReceivedQuantity] = React.useState(0);
  
  const [orderCreationData, setOrderCreationData] = React.useState<{wholesalerId: string, itemsToOrder: InventoryItem[], location: Location} | null>(null);
  const [selectedExistingOrder, setSelectedExistingOrder] = React.useState<string>('new');
  
  const [isPreScanDialogOpen, setIsPreScanDialogOpen] = React.useState(false);

  const [isDeliveryNoteScannerOpen, setIsDeliveryNoteScannerOpen] = React.useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = React.useState(false);
  const [deliveryNoteImage, setDeliveryNoteImage] = React.useState<string | null>(null);
  const [ocrText, setOcrText] = React.useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<AnalyzeDeliveryNoteOutput | null>(null);
  const [analyzedOrder, setAnalyzedOrder] = React.useState<Order | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Camera state
    const webcamRef = React.useRef<Webcam>(null);
    const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);
    const [activeDeviceId, setActiveDeviceId] = React.useState<string | undefined>(undefined);
    const [torchOn, setTorchOn] = React.useState(false);
    const [zoom, setZoom] = React.useState(1);
    const [torchSupported, setTorchSupported] = React.useState(false);

    // State for scrolling
    const [activeTab, setActiveTab] = React.useState('suggestions');
    const orderRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

    const handleDevices = React.useCallback(
        (mediaDevices: MediaDeviceInfo[]) => {
            const videoDevices = mediaDevices.filter(({ kind }) => kind === 'videoinput');
            setDevices(videoDevices);
            if (!activeDeviceId && videoDevices.length > 0) {
                // Prefer back camera
                const backCamera = videoDevices.find(device => device.label.toLowerCase().includes('back'));
                setActiveDeviceId(backCamera ? backCamera.deviceId : videoDevices[0]?.deviceId);
            }
        },
        [activeDeviceId]
    );

    const checkTorchSupport = React.useCallback(async () => {
        if (webcamRef.current?.stream) {
            try {
                const track = webcamRef.current.stream.getVideoTracks()[0];
                if (!track) {
                    setTorchSupported(false);
                    return;
                }
                const capabilities = track.getCapabilities();
                setTorchSupported(!!((capabilities as any).torch));
            } catch (e) {
                console.error("Error checking torch support:", e);
                setTorchSupported(false);
            }
        }
    }, []);


    useEffect(() => {
        if (isCameraScannerOpen) {
            navigator.mediaDevices.enumerateDevices().then(handleDevices);
        }
    }, [isCameraScannerOpen, handleDevices]);
    
    useEffect(() => {
        if (webcamRef.current?.stream) {
            checkTorchSupport();
        }
    }, [webcamRef.current?.stream, checkTorchSupport]);

    const toggleTorch = async () => {
        if (webcamRef.current?.stream && torchSupported) {
            try {
                const track = webcamRef.current.stream.getVideoTracks()[0];
                if (!track) return;
                await track.applyConstraints({
                    advanced: [{ torch: !torchOn } as any]
                });
                setTorchOn(!torchOn);
            } catch (e) {
                console.error("Failed to toggle torch:", e);
                toast({ title: "Fehler", description: "Licht konnte nicht umgeschaltet werden.", variant: "destructive" });
            }
        }
    };
    
    const switchCamera = () => {
        if (devices.length > 1 && activeDeviceId) {
            const currentIndex = devices.findIndex(d => d.deviceId === activeDeviceId);
            const nextIndex = (currentIndex + 1) % devices.length;
            setActiveDeviceId(devices[nextIndex]?.deviceId);
        }
    };
    
   const takePicture = useCallback(async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setDeliveryNoteImage(imageSrc);
        setIsCameraScannerOpen(false);
        setIsDeliveryNoteScannerOpen(true);
        await processImageWithOCR(imageSrc);
      }
    }
  }, [webcamRef]);
  
  const arrangedItemsByLocation = React.useMemo(() => {
    const groupedByLocation: { [locationId: string]: InventoryItem[] } = {};
    items.forEach(item => {
      if (isInventoryItem(item)) {
        Object.keys(item.reorderStatus).forEach(locationId => {
          const status = item.reorderStatus[locationId];
          if (status?.status === 'arranged' && !status.orderId) {
            if (!groupedByLocation[locationId]) {
              groupedByLocation[locationId] = [];
            }
            groupedByLocation[locationId]!.push(item);
          }
        });
      }
    });
    return groupedByLocation;
  }, [items]);

  const draftOrders = React.useMemo(() => {
    return orders.filter(order => order.status === 'draft')
  }, [orders]);

  const openOrders = React.useMemo(() => {
    return orders.filter(order => order.status === 'ordered' || order.status === 'partially-received' || order.status === 'partially-commissioned').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders]);

  const commissionedItems = React.useMemo(() => {
    const allCommissioned: {order: Order, item: OrderItem}[] = [];
    orders.forEach(order => {
      if(order.locationId) { // Only vehicle orders can be commissioned
        order.items.forEach(item => {
          if (item.status === 'commissioned') {
            allCommissioned.push({ order, item });
          }
        });
      }
    });
    return allCommissioned;
  }, [orders]);

 const handleOpenCopyDialog = (orderNumber: string, items: (InventoryItem[] | OrderItem[]), isDraft: boolean) => {
    setCopyModalContent({ orderNumber, items, isDraft });
    setIsCopyModalOpen(true);
  };

  const handleDownloadCsv = (order: Order | {wholesalerId: string, itemsToOrder: InventoryItem[]}) => {
    const wholesalerId = 'wholesalerId' in order ? order.wholesalerId : '';
    const wholesaler = wholesalers.find(w => w.id === wholesalerId);
    
    if (!wholesaler?.csvExportFormat) {
        toast({
            title: 'Exportformat fehlt',
            description: `Für ${wholesaler?.name || 'diesen Großhändler'} wurde kein CSV-Format konfiguriert.`,
            variant: 'destructive'
        });
        return;
    }
    
    const { delimiter, includeHeader, columns } = wholesaler.csvExportFormat;
    
    let csvContent = '';
    
    if (includeHeader) {
        const header = [];
        header[columns.itemNumber.index] = 'Artikelnummer';
        header[columns.quantity.index] = 'Menge';
        csvContent += header.join(delimiter) + '\r\n';
    }

    const items = 'items' in order ? order.items : order.itemsToOrder;

    items.forEach(item => {
        const itemNumber = columns.itemNumber.type === 'manufacturer'
            ? 'itemNumber' in item ? item.itemNumber : (item.preferredManufacturerItemNumber || item.manufacturerItemNumbers[0]?.number)
            : ('wholesalerItemNumber' in item && item.wholesalerItemNumber)
                ? item.wholesalerItemNumber
                : item.suppliers.find(s => s.wholesalerId === wholesalerId)?.wholesalerItemNumber || '';
                
        const quantity = 'quantity' in item ? item.quantity : item.reorderStatus[Object.keys(item.reorderStatus)[0]]?.quantity;

        const row = [];
        row[columns.itemNumber.index] = itemNumber;
        row[columns.quantity.index] = quantity;
        csvContent += row.join(delimiter) + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `bestellung-${wholesaler.name.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenCreateOrderModal = (wholesalerId: string, itemsToOrder: InventoryItem[], location: Location) => {
    setOrderCreationData({ wholesalerId, itemsToOrder, location });
    setSelectedExistingOrder('new');
    setIsCreateOrderModalOpen(true);
  };
  
  const handleCreateOrder = () => {
    if (!currentUser || !orderCreationData) {
        toast({ title: 'Benutzer oder Bestelldaten nicht gefunden', description: 'Bitte wählen Sie einen Benutzer aus.', variant: 'destructive' });
        return;
    }
    
    if (selectedExistingOrder === 'new') {
      const { wholesalerId, itemsToOrder, location } = orderCreationData;
      const newOrder = createOrder(wholesalerId, itemsToOrder, location.id, location.isVehicle);
      toast({ title: 'Bestellung vorbereitet', description: `Bestellung ${newOrder.orderNumber} wurde erstellt.` });
    } else {
      addItemsToOrder(selectedExistingOrder, orderCreationData.itemsToOrder, orderCreationData.location.id);
      toast({ title: 'Artikel hinzugefügt', description: `Artikel wurden zur Bestellung hinzugefügt.` });
    }
    
    setIsCreateOrderModalOpen(false);
    setOrderCreationData(null);
  };
  
  const handleConfirmOrder = (orderId: string) => {
     if (!currentUser) {
        toast({ title: 'Benutzer nicht ausgewählt', description: 'Bitte wählen Sie einen Benutzer aus.', variant: 'destructive' });
        return;
    }
    confirmOrder(orderId);
    toast({ title: 'Bestellung als bestellt markiert', description: `Die Artikel wurden als bestellt markiert.` });
  };

  const handleRemoveItem = (orderId: string, itemId: string) => {
    removeItemFromDraftOrder(orderId, itemId);
    toast({ title: 'Artikel entfernt', description: 'Der Artikel wurde aus dem Bestellvorschlag entfernt.', variant: 'destructive' });
  };


  const handleOpenReceiveModal = (order: Order, item: OrderItem) => {
    const isVehicleOrder = !!order.locationId && locations.some(l => l.id === order.locationId && l.isVehicle);
    setReceivingInfo({ order, item });
    const remainingQuantity = item.quantity - item.receivedQuantity;
    setReceivedQuantity(remainingQuantity);
    if(isVehicleOrder && item.status !== 'commissioned') {
        setIsCommissionDialog(true);
    } else {
        setIsReceiveModalOpen(true);
    }
  };
  
  const handleConfirmReception = (commissionOnly = false) => {
    if (!receivingInfo || !currentUser) {
      toast({ title: 'Fehler', description: 'Ein unerwarteter Fehler ist aufgetreten.', variant: 'destructive' });
      return;
    }
    if (receivedQuantity <= 0 && !commissionOnly) {
      toast({ title: 'Fehler', description: 'Die Menge muss größer als 0 sein.', variant: 'destructive' });
      return;
    }
    
    const quantityToReceive = commissionOnly ? (receivingInfo.item.quantity - receivingInfo.item.receivedQuantity) : receivedQuantity;
    
    receiveOrderItem(receivingInfo.order.id, receivingInfo.item.itemId, quantityToReceive, commissionOnly);
    
    if (commissionOnly) {
        toast({
            title: 'Artikel kommissioniert',
            description: `${quantityToReceive}x ${receivingInfo.item.itemName} wurde für das Fahrzeug bereitgestellt.`
        });
    } else {
        toast({
          title: 'Wareneingang gebucht',
          description: `${quantityToReceive}x ${receivingInfo.item.itemName} wurden dem Bestand hinzugefügt.`
        });
    }
    
    setIsReceiveModalOpen(false);
    setIsCommissionDialog(false);
    setReceivingInfo(null);
    setReceivedQuantity(0);
  };
  
   const handleLoadCommissionedItem = (orderId: string, itemId: string) => {
    loadCommissionedItem(orderId, itemId);
    toast({
        title: "Material verladen",
        description: "Der Artikel wurde auf das Fahrzeug gebucht."
    });
  };

  const getGroupedByWholesaler = (itemList: InventoryItem[], locationId: string) => {
    const grouped: { [key: string]: InventoryItem[] } = {}
    itemList.forEach(item => {
      const wholesalerId = item.preferredWholesalerId || 'unbekannt'
      if (!grouped[wholesalerId]) {
        grouped[wholesalerId] = []
      }
      const itemForLocation = {...item, reorderStatus: {[locationId]: item.reorderStatus[locationId]}}
      grouped[wholesalerId]!.push(itemForLocation)
    })
    return grouped
  }
  
    const handleOpenCancelConfirm = (wholesalerId: string, itemsToCancel: InventoryItem[], locationId: string) => {
        setCancellingInfo({ wholesalerId, itemsToCancel, locationId });
        setIsCancelConfirmOpen(true);
    };

    const handleConfirmCancel = () => {
        if (cancellingInfo) {
            cancelArrangedOrder(cancellingInfo.itemsToCancel.map(item => item.id), cancellingInfo.locationId);
            toast({
                title: "Bestellvorschlag storniert",
                description: `Der Vorschlag für ${wholesalers.find(w => w.id === cancellingInfo.wholesalerId)?.name} wurde entfernt.`,
                variant: 'destructive'
            });
        }
        setIsCancelConfirmOpen(false);
        setCancellingInfo(null);
    };
    
    const handleOpenCancelSingleItem = (itemId: string, locationId: string) => {
        removeSingleItemFromArrangedOrder(itemId, locationId);
        toast({
            title: "Artikel entfernt",
            description: "Der Artikel wurde aus dem Bestellvorschlag entfernt.",
            variant: 'destructive'
        });
    }
  
    const handleOpenScanDialog = () => {
        setDeliveryNoteImage(null);
        setAnalysisResult(null);
        setAnalyzedOrder(null);
        setOcrText('');
        setIsPreScanDialogOpen(true);
    };

    const handleStartCamera = () => {
        setIsPreScanDialogOpen(false);
        setIsCameraScannerOpen(true);
    };

    const handleStartUpload = () => {
        setIsPreScanDialogOpen(false);
        setIsDeliveryNoteScannerOpen(true);
        // We delay the click to ensure the dialog is closed and the file input is ready
        setTimeout(() => fileInputRef.current?.click(), 100);
    };

    const processImageWithOCR = async (imageSrc: string) => {
        setIsAnalyzing(true);
        toast({ title: 'OCR gestartet', description: 'Erkenne Text auf dem Lieferschein...' });

        try {
            const result = await Tesseract.recognize(imageSrc, 'deu');
            
            setOcrText(result.data.text);
            
            toast({ title: 'Texterkennung erfolgreich!', description: 'Text wurde extrahiert.' });
        } catch (error) {
            console.error('OCR Error:', error);
            toast({ title: 'OCR-Fehler', description: 'Text konnte nicht erkannt werden.', variant: 'destructive' });
            setOcrText('');
        } finally {
            setIsAnalyzing(false);
        }
    };


    const handleDeliveryNoteImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        let dataUrl: string;

        try {
            if (file.type.startsWith('image/')) {
                dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target?.result as string);
                    reader.onerror = e => reject(e);
                    reader.readAsDataURL(file);
                });
            } else if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                const canvasContext = canvas.getContext('2d');
                if (!canvasContext) throw new Error('Could not get canvas context');

                await page.render({ canvasContext, viewport }).promise;
                dataUrl = canvas.toDataURL();
            } else {
                 toast({ title: "Dateityp nicht unterstützt", description: "Bitte wählen Sie eine Bild- oder PDF-Datei.", variant: "destructive" });
                 return;
            }

            setDeliveryNoteImage(dataUrl);
            await processImageWithOCR(dataUrl);

        } catch (error) {
            console.error("Error processing file:", error);
            toast({ title: "Fehler bei Dateiverarbeitung", description: "Die Datei konnte nicht verarbeitet werden.", variant: "destructive" });
        }
    };
    
    const handleAnalyzeDeliveryNote = async () => {
        if (ocrText.length === 0) {
            toast({ title: "Fehler", description: "Kein Text zum Analysieren vorhanden.", variant: 'destructive' });
            return;
        }

        const aiConfig = appSettings?.deliveryNoteAi;
        if (!aiConfig?.provider || !aiConfig?.model || !aiConfig?.apiKey) {
            toast({
                title: 'KI-Einstellungen unvollständig',
                description: 'Bitte konfigurieren Sie die KI für Lieferscheine in den Einstellungen.',
                variant: 'destructive',
            });
            return;
        }

        setIsAnalyzing(true);
        setAnalysisResult(null);
        setAnalyzedOrder(null);
        
        try {
            const allOpenOrderItems = openOrders.flatMap(order => 
                order.items.map(orderItem => {
                    const fullItem = items.find(i => i.id === orderItem.itemId);
                    const allSupplierNumbers = fullItem && isInventoryItem(fullItem) ? (fullItem.suppliers || []).map((s: any) => s.wholesalerItemNumber).filter(Boolean) as string[] : [];
                    if (orderItem.wholesalerItemNumber && !allSupplierNumbers.includes(orderItem.wholesalerItemNumber)) {
                        allSupplierNumbers.push(orderItem.wholesalerItemNumber);
                    }
                    
                    return {
                        ...orderItem,
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        allWholesalerItemNumbers: [...new Set(allSupplierNumbers)], 
                    };
                })
            );

            const result = await analyzeDeliveryNote({
                deliveryNoteText: ocrText,
                orderItems: allOpenOrderItems,
                provider: aiConfig.provider,
                model: aiConfig.model,
                apiKey: aiConfig.apiKey,
                serverUrl: aiConfig.provider === 'lokale_ki' ? (appSettings.deliveryNoteAi as any).serverUrl : undefined,
            });

            if (!result.orderNumber) {
                throw new Error("Die KI konnte keine Bestellnummer auf dem Lieferschein finden.");
            }

            const matchedOrder = openOrders.find(o => o.orderNumber === result.orderNumber);

            if (!matchedOrder) {
                throw new Error(`Keine offene Bestellung mit der Nummer "${result.orderNumber}" gefunden.`);
            }

            setAnalyzedOrder(matchedOrder);
            setAnalysisResult(result);
            toast({ title: 'Analyse erfolgreich!', description: `Lieferschein wurde Bestellung ${matchedOrder.orderNumber} zugeordnet.`});
        } catch (error: any) {
             if (error.message === 'IMAGE_NOT_SUPPORTED') {
                toast({
                    title: 'Bild-Upload nicht unterstützt',
                    description: 'Das ausgewählte OpenRouter-Modell unterstützt keine Bilder. Bitte wählen Sie ein anderes Modell.',
                    variant: 'destructive',
                });
            } else {
                console.error('AI analysis failed:', error);
                toast({
                    title: 'Analyse fehlgeschlagen',
                    description: error.message || 'Die KI konnte den Lieferschein nicht verarbeiten.',
                    variant: 'destructive'
                });
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleConfirmFullReceipt = () => {
        if (!analysisResult || !analyzedOrder || !currentUser) return;

        let itemsReceivedCount = 0;
        analysisResult.matchedItems.forEach(item => {
            const orderItem = analyzedOrder.items.find(oi => oi.itemId === item.itemId);
            if (!orderItem) return;

            if (item.matchStatus === 'ok' || item.matchStatus === 'partial' || item.matchStatus === 'extra') {
                const quantityToBook = item.deliveredQuantity;
                if(quantityToBook > 0) {
                    receiveOrderItem(analyzedOrder.id, item.itemId, quantityToBook, false);
                    itemsReceivedCount++;
                }
            }
        });
        
        toast({ title: 'Wareneingang gebucht', description: `${itemsReceivedCount} Positionen wurden verarbeitet.`});
        setIsDeliveryNoteScannerOpen(false);
    };

    const handleGoToManualBooking = () => {
        if (!analyzedOrder) return;
        
        setActiveTab('open');
        setIsDeliveryNoteScannerOpen(false);
        
        setTimeout(() => {
            const orderCard = orderRefs.current[analyzedOrder.id];
            orderCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            orderCard?.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
            setTimeout(() => {
                 orderCard?.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            }, 2000);
        }, 100);
    };
    
    const getMatchStatusColor = (status: DeliveryNoteItem['matchStatus']) => {
      switch (status) {
        case 'ok': return 'text-green-600';
        case 'partial': return 'text-yellow-600';
        case 'extra': return 'text-blue-600';
        case 'missing': return 'text-red-600';
        default: return 'text-muted-foreground';
      }
    };
    
    const getMatchStatusText = (status: DeliveryNoteItem['matchStatus']) => {
      switch (status) {
        case 'ok': return 'OK';
        case 'partial': return 'Teillieferung';
        case 'extra': return 'Mehrmenge';
        case 'missing': return 'Fehlt';
        default: return 'Unbekannt';
      }
    };
    
    const handleOcrTextChange = (newText: string) => {
        setOcrText(newText);
    };

    const isFullReceiptPossible = analysisResult?.matchedItems.every(item => item.matchStatus === 'ok') ?? false;

    const arrangedItemsCount = Object.values(arrangedItemsByLocation).reduce((sum, list) => sum + list.length, 0) + draftOrders.length;
  
    const availableOrdersForCreation = orderCreationData ? orders.filter(o => o.status === 'draft' && o.wholesalerId === orderCreationData.wholesalerId) : [];

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Bestellungen</CardTitle>
          <CardDescription>
            Verwalten Sie hier Ihre Bestellvorschläge und offenen Bestellungen.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
         <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto h-auto sm:h-10">
                <TabsTrigger value="suggestions">
                    Vorschl. ({arrangedItemsCount})
                </TabsTrigger>
                <TabsTrigger value="open">
                    Offen ({openOrders.length})
                </TabsTrigger>
                <TabsTrigger value="commissioning">
                    Kom. ({commissionedItems.length})
                </TabsTrigger>
            </TabsList>
            <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto" onClick={handleOpenScanDialog}>
                    <Scan className="mr-2 h-4 w-4" />
                    Lieferschein scannen
                </Button>
            </div>
        </div>
        <TabsContent value="suggestions">
            <Accordion type="multiple" className="w-full space-y-4 mt-4">
            {arrangedItemsCount === 0 ? (
                <Card>
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Aktuell sind keine Bestellungen angeordnet.</p>
                </CardContent>
                </Card>
            ) : (
              <>
                {draftOrders.map(order => (
                    <AccordionItem value={order.id} key={order.id} className="border-b-0">
                        <Card>
                            <div className="p-4 sm:p-6 rounded-t-lg data-[state=open]:rounded-b-none flex justify-between items-start gap-2">
                                <AccordionTrigger className="p-0 hover:no-underline flex-1">
                                    <div className="flex-1 min-w-0 text-left">
                                        <CardTitle className="break-words">{order.wholesalerName}</CardTitle>
                                        <CardDescription>
                                            {order.items.length} Artikel
                                            <span className="font-semibold text-foreground ml-2">Bestell-Nr: {order.orderNumber}</span>
                                        </CardDescription>
                                    </div>
                                </AccordionTrigger>
                                <div className="flex gap-2 self-start sm:self-center">
                                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadCsv(order); }}>
                                      <FileDown className="mr-2 h-4 w-4" />
                                      CSV
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenCopyDialog(order.orderNumber, order.items, true); }}>
                                      <ClipboardCopy className="mr-2 h-4 w-4" />
                                      Liste kopieren
                                  </Button>
                                </div>
                            </div>
                            <AccordionContent>
                              <CardContent className="pt-0">
                                  <div className="divide-y">
                                    {order.items.map(item => (
                                      <div key={item.itemId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium break-words">{item.itemName}</p>
                                          <p className="text-sm text-muted-foreground truncate">{item.wholesalerItemNumber || item.itemNumber}</p>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-2 ml-0 sm:ml-4 mt-2 sm:mt-0">
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateDraftOrderItemQuantity(order.id, item.itemId, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateDraftOrderItemQuantity(order.id, item.itemId, parseInt(e.target.value) || 1)}
                                                    className="w-14 h-8 text-center"
                                                />
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateDraftOrderItemQuantity(order.id, item.itemId, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(order.id, item.itemId)}>
                                                <X className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                              </CardContent>
                               <CardFooter className="justify-end rounded-b-lg">
                               <Button onClick={() => handleConfirmOrder(order.id)}>
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Als bestellt markieren
                                </Button>
                            </CardFooter>
                        </AccordionContent>
                        </Card>
                    </AccordionItem>
                ))}
                
                {Object.entries(arrangedItemsByLocation).map(([locationId, locationItems]) => {
                  const location = locations.find(l => l.id === locationId);
                  if (!location) return null;

                  const groupedByWholesaler = getGroupedByWholesaler(locationItems, locationId);
                  return (
                    <div key={locationId}>
                      <h2 className="text-xl font-semibold mb-2 mt-4">{location.name}</h2>
                       {Object.entries(groupedByWholesaler).map(([wholesalerId, itemsToOrder]) => {
                          const wholesaler = wholesalers.find(w => w.id === wholesalerId);
                          const wholesalerName = wholesaler?.name || 'Unbekannter Großhändler';
                          return (
                            <AccordionItem value={`${locationId}-${wholesalerId}`} key={`${locationId}-${wholesalerId}`} className="border-b-0 mb-4">
                                <Card>
                                     <div className="p-4 sm:p-6 rounded-t-lg data-[state=open]:rounded-b-none flex justify-between items-start gap-2">
                                        <AccordionTrigger className="p-0 hover:no-underline flex-1">
                                            <div className="flex-1 min-w-0 text-left">
                                                <CardTitle className="break-words">{wholesalerName}</CardTitle>
                                                <CardDescription>{itemsToOrder.length} Artikel</CardDescription>
                                            </div>
                                        </AccordionTrigger>
                                        <div className="flex gap-2 self-start sm:self-center">
                                          {wholesaler?.csvExportFormat && (
                                              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadCsv({wholesalerId, itemsToOrder}); }}>
                                                  <FileDown className="mr-2 h-4 w-4" />
                                                  CSV
                                              </Button>
                                          )}
                                          <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenCancelConfirm(wholesalerId, itemsToOrder, locationId); }}>
                                              <Trash2 className="h-4 w-4" />
                                              <span className="sr-only">Vorschlag löschen</span>
                                          </Button>
                                        </div>
                                    </div>
                                     <AccordionContent>
                                      <CardContent className="pt-0">
                                        <div className="divide-y">
                                            {itemsToOrder.map(item => {
                                                const supplierInfo = item.suppliers.find(s => s.wholesalerId === item.preferredWholesalerId)
                                                return (
                                                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2">
                                                      <div className="flex-1 min-w-0">
                                                          <p className="font-medium break-words">{item.name}</p>
                                                          <p className="text-sm text-muted-foreground truncate">{supplierInfo?.wholesalerItemNumber || (Array.isArray(item.manufacturerItemNumbers) && item.manufacturerItemNumbers[0]?.number) || ''}</p>
                                                      </div>
                                                      <div className="flex items-center justify-between sm:justify-end gap-4 ml-0 sm:ml-4 mt-2 sm:mt-0">
                                                        <span className="font-medium">{item.reorderStatus[locationId]?.quantity} Stk.</span>
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenCancelSingleItem(item.id, locationId)}>
                                                            <X className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                      </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                      </CardContent>
                                      <CardFooter className="justify-end rounded-b-lg">
                                        <Button onClick={() => handleOpenCreateOrderModal(wholesalerId, itemsToOrder, location)}>
                                            <ShoppingCart className="mr-2 h-4 w-4" />
                                            {location.isVehicle ? 'Materialanforderung erstellen' : 'Bestellung vorbereiten'}
                                        </Button>
                                      </CardFooter>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                          )
                      })}
                    </div>
                  )
                })}
              </>
            )}
            </Accordion>
        </TabsContent>
        <TabsContent value="open">
             <div className="flex flex-col gap-6 mt-4">
                {openOrders.length === 0 ? (
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-center text-muted-foreground">Es gibt keine offenen Bestellungen.</p>
                        </CardContent>
                    </Card>
                ) : (
                    openOrders.map(order => (
                        <Card key={order.id} ref={(el: HTMLDivElement | null) => { if (el) orderRefs.current[order.id] = el; }}>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="break-words">{order.orderNumber}</CardTitle>
                                    <CardDescription>{order.wholesalerName} - {new Date(order.date).toLocaleDateString()}</CardDescription>
                                  </div>
                                  <div className="flex items-center gap-2 self-start sm:self-center">
                                    <Badge variant={getOrderStatusBadgeVariant(order.status)} className="w-fit">
                                        {getOrderStatusText(order.status)}
                                    </Badge>
                                  </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="divide-y">
                                    {order.items.map(item => (
                                        <div key={item.itemId} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium break-words">{item.itemName}</p>
                                                <p className="text-sm text-muted-foreground truncate">{item.wholesalerItemNumber || item.itemNumber}</p>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0">
                                                <p className="font-medium text-sm">
                                                    {item.status === 'commissioned' ? <span><PackageCheck className="inline-block h-4 w-4 mr-1 text-blue-500" />{item.quantity} Stk.</span> : `${item.receivedQuantity} / ${item.quantity} Stk.` }
                                                </p>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => handleOpenReceiveModal(order, item)}
                                                    disabled={item.status === 'received' || item.status === 'commissioned'}
                                                    className="w-full sm:w-auto"
                                                >
                                                    <Inbox className="mr-2 h-4 w-4" /> 
                                                    Wareneingang
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
             </div>
        </TabsContent>
        <TabsContent value="commissioning">
            <div className="flex flex-col gap-6 mt-4">
              {commissionedItems.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    Keine Artikel zur Kommissionierung.
                  </CardContent>
                </Card>
              ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Bereitgestelltes Material</CardTitle>
                        <CardDescription>Dieses Material wurde im Lager empfangen und wartet darauf, auf die Fahrzeuge verladen zu werden.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6 sm:pt-0">
                       <div className="divide-y">
                           {commissionedItems.map(({order, item}) => {
                                const location = locations.find(l => l.id === item.locationId);
                                return (
                                    <div key={`${order.id}-${item.itemId}`} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium break-words">{item.itemName}</p>
                                            <p className="text-sm text-muted-foreground">Für: <span className="font-semibold">{location?.name || item.locationId}</span></p>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0">
                                            <p className="font-medium">{item.quantity} Stk.</p>
                                            <Button size="sm" onClick={() => handleLoadCommissionedItem(order.id, item.itemId)}>
                                               <Truck className="mr-2 h-4 w-4"/> Verladen
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                       </div>
                    </CardContent>
                </Card>
              )}
            </div>
        </TabsContent>
      </Tabs>

      <CopyOrderDialog order={copyModalContent} onOpenChange={setIsCopyModalOpen} />
      
      <Dialog open={isReceiveModalOpen} onOpenChange={setIsReceiveModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Wareneingang für {receivingInfo?.item.itemName}</DialogTitle>
                <DialogDescription>
                    Bestellnummer: {receivingInfo?.order.orderNumber}.
                    Bestellte Menge: {receivingInfo?.item.quantity}. Bereits erhalten: {receivingInfo?.item.receivedQuantity}.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="received-quantity" className="text-center block mb-2">Erhaltene Menge</Label>
                <div className="flex items-center justify-center gap-4">
                    <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-10 w-10"
                        onClick={() => setReceivedQuantity(q => Math.max(1, q - 1))}
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                        id="received-quantity"
                        type="number"
                        value={receivedQuantity}
                        onChange={(e) => setReceivedQuantity(Number(e.target.value))}
                        className="w-24 h-16 text-center text-3xl font-bold"
                        max={receivingInfo ? receivingInfo.item.quantity - receivingInfo.item.receivedQuantity : undefined}
                    />
                    <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-10 w-10"
                        onClick={() => setReceivedQuantity(q => Math.min(q + 1, receivingInfo ? receivingInfo.item.quantity - receivingInfo.item.receivedQuantity : q + 1))}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsReceiveModalOpen(false)}>Abbrechen</Button>
                <Button onClick={() => handleConfirmReception(false)}>Bestätigen</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isCommissionDialog} onOpenChange={setIsCommissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wareneingang für Fahrzeug</DialogTitle>
            <DialogDescription>
              Die Bestellung ist für das Fahrzeug &quot;{locations.find(l => l.id === receivingInfo?.order.locationId)?.name}&quot;. Wurde das Material direkt ins Fahrzeug geladen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="grid grid-cols-2 gap-4 pt-4">
             <Button variant="outline" size="lg" onClick={() => handleConfirmReception(true)}>Nein, im Lager kommissionieren</Button>
             <Button size="lg" onClick={() => handleConfirmReception(false)}>Ja, direkt verladen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isCreateOrderModalOpen} onOpenChange={setIsCreateOrderModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Bestellung vorbereiten</DialogTitle>
                <DialogDescription>
                  Möchten Sie eine neue Bestellung erstellen oder die Artikel einer bestehenden hinzufügen?
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <Select onValueChange={setSelectedExistingOrder} value={selectedExistingOrder}>
                    <SelectTrigger>
                        <SelectValue placeholder="Aktion wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="new">Neue Bestellung erstellen</SelectItem>
                        {availableOrdersForCreation.map(order => (
                          <SelectItem key={order.id} value={order.id}>
                            Zu Bestellung {order.orderNumber} hinzufügen ({order.items.length} Artikel)
                          </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsCreateOrderModalOpen(false)}>Abbrechen</Button>
                <Button onClick={handleCreateOrder}>Bestätigen</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Bestellvorschlag stornieren?</AlertDialogTitle>
                <AlertDialogDescription>
                   Möchten Sie diesen Bestellvorschlag wirklich stornieren? Alle {cancellingInfo?.itemsToCancel.length || 0} Artikel werden aus der Liste der angeordneten Bestellungen für diesen Lagerort entfernt.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive hover:bg-destructive/90">Stornieren</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isPreScanDialogOpen} onOpenChange={setIsPreScanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lieferschein scannen</DialogTitle>
            <DialogDescription>Wie möchten Sie den Lieferschein einlesen?</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
             <Button variant="outline" className="h-24" onClick={handleStartCamera}>
                <Camera className="mr-2 h-6 w-6"/> Kamera verwenden
             </Button>
             <Button variant="outline" className="h-24" onClick={handleStartUpload}>
                <Upload className="mr-2 h-6 w-6"/> Datei hochladen
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCameraScannerOpen} onOpenChange={setIsCameraScannerOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Lieferschein fotografieren</DialogTitle>
                <DialogDescription>
                    Fotografieren Sie den Lieferschein. Sorgen Sie für gute Beleuchtung.
                </DialogDescription>
            </DialogHeader>
            <div className="relative aspect-[4/5] w-full max-w-full mx-auto overflow-hidden rounded-lg border mt-4 bg-black">
                 <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      deviceId: activeDeviceId,
                      width: 1920,
                      height: 1080,
                      ...(zoom ? { zoom: zoom as any } : {}),
                      advanced: [{ autoFocus: 'continuous' } as any],
                    }}
                    onUserMedia={checkTorchSupport}
                    className="w-full h-full object-contain"
                />
            </div>
            <div className="flex flex-col gap-4 mt-4">
                <div className="flex items-center gap-4 bg-muted p-2 rounded-lg">
                    {devices.length > 1 && (
                        <Button variant="outline" size="icon" onClick={switchCamera} title="Kamera wechseln">
                            <RefreshCw className="h-5 w-5" />
                        </Button>
                    )}
                    <div className="flex-1 flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        <Slider id="zoom-slider" min={1} max={5} step={0.1} value={[zoom]} onValueChange={(val) => setZoom(val[0]!)} />
                    </div>
                    {torchSupported && (
                        <Button variant="outline" size="icon" onClick={toggleTorch} title={torchOn ? "Licht aus" : "Licht an"}>
                            {torchOn ? <ZapOff className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                        </Button>
                    )}
                </div>
                 <Button size="lg" className="rounded-full w-full h-16" onClick={takePicture}>
                    <Camera className="h-8 w-8"/>
                </Button>
            </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeliveryNoteScannerOpen} onOpenChange={setIsDeliveryNoteScannerOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Lieferschein scannen &amp; prüfen</DialogTitle>
                <DialogDescription>Überprüfen Sie den erkannten Text, bevor Sie ihn an die KI senden.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="space-y-4">
                    <Label>Lieferschein-Vorschau</Label>
                    <Card className="flex items-center justify-center h-60 border-dashed relative">
                        {deliveryNoteImage ? (
                            <div className="relative w-full h-full">
                                <Image src={deliveryNoteImage} alt="Vorschau Lieferschein" fill className="object-contain rounded-md"/>
                                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 z-10" onClick={() => setDeliveryNoteImage(null)}><X className="h-4 w-4"/></Button>
                            </div>
                        ) : (
                             <div className="text-center text-muted-foreground space-y-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4"/>Bild auswählen</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => { /* Implement paste here */ }}><ClipboardPaste className="mr-2 h-4 w-4" />Einfügen</Button>
                            </div>
                        )}
                         <Input type="file" className="hidden" ref={fileInputRef} accept="image/*,.pdf" onChange={handleDeliveryNoteImageUpload} />
                    </Card>
                     <Button className="w-full" onClick={handleAnalyzeDeliveryNote} disabled={ocrText.length === 0 || isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Scan className="mr-2 h-4 w-4" />}
                        Text an KI senden &amp; Abgleich starten
                    </Button>
                </div>
                <div className="space-y-4">
                     <Label>Erkannter Text</Label>
                    {isAnalyzing && !analysisResult ? (
                         <div className="flex flex-col items-center justify-center gap-4 h-full border rounded-lg bg-muted/50">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <p className="text-muted-foreground">Analysiere Lieferschein...</p>
                        </div>
                    ) : analysisResult && analyzedOrder ? (
                        <div className="space-y-4">
                             <h4 className="font-semibold">Abgleich für Bestellung: <span className="text-primary">{analyzedOrder.orderNumber}</span></h4>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Artikel</TableHead>
                                        <TableHead className="text-right">Menge</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analysisResult.matchedItems.map(item => (
                                        <TableRow key={item.itemId}>
                                            <TableCell>{item.itemName}</TableCell>
                                            <TableCell className="text-right">{item.deliveredQuantity} / {item.orderedQuantity}</TableCell>
                                            <TableCell className={`text-right font-semibold ${getMatchStatusColor(item.matchStatus)}`}>
                                                {getMatchStatusText(item.matchStatus)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                             </Table>
                              {isFullReceiptPossible ? (
                                <Button className="w-full" onClick={handleConfirmFullReceipt}>
                                    <Check className="mr-2 h-4 w-4" /> Vollständigen Wareneingang buchen
                                </Button>
                                ) : (
                                <div className="p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 dark:bg-yellow-900/50 dark:border-yellow-600 dark:text-yellow-300">
                                    <div className="flex">
                                        <div className="py-1"><FileWarning className="h-5 w-5 text-yellow-500 mr-3" /></div>
                                        <div>
                                            <p className="font-bold">Manuelle Buchung erforderlich</p>
                                            <p className="text-sm">Es gibt Abweichungen. Klicken Sie hier, um zur Bestellung zu springen und die Artikel einzeln zu buchen.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                             <Button variant="outline" className="w-full" onClick={handleGoToManualBooking}>
                                Zur manuellen Buchung
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 h-full">
                           <Textarea value={ocrText} onChange={(e) => handleOcrTextChange(e.target.value)} className="font-mono text-xs w-full min-h-[100px] flex-grow" />
                            {ocrText.length === 0 && (
                                <div className="flex items-center justify-center h-full border rounded-md bg-muted/50">
                                    <p className="text-muted-foreground text-center">Hier erscheint der erkannte Text.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsDeliveryNoteScannerOpen(false)}>Schließen</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
