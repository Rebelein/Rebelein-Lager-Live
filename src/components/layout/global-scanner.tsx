
'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { InventoryItem, Machine, Commission, OrderItem } from '@/lib/types';
import { Camera, RefreshCw, Zap, ZapOff, ScanLine, X, PackagePlus, PackageMinus, Info, Archive, ClipboardList } from 'lucide-react';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

interface GlobalScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalScanner({ open, onOpenChange }: GlobalScannerProps) {
  const { items, commissions } = useAppContext();
  const toast = useToast();
  const router = useRouter();

  const [scannerType, setScannerType] = React.useState<'qr' | 'barcode'>('qr');
  const [scannedData, setScannedData] = React.useState<string | null>(null);
  const [scannedItem, setScannedItem] = React.useState<InventoryItem | Machine | Commission | null>(null);
  const [actionType, setActionType] = React.useState<'item' | 'machine' | 'commission' | 'delivery_note' | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const webcamRef = React.useRef<Webcam>(null);
  const lastScannedId = React.useRef<string | null>(null);
  
  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = React.useState<string | undefined>(undefined);
  const [torchSupported, setTorchSupported] = React.useState(false);
  const [torchOn, setTorchOn] = React.useState(false);

  const resetScannerState = () => {
    setScannedData(null);
    setScannedItem(null);
    setActionType(null);
    lastScannedId.current = null;
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetScannerState();
    }
    onOpenChange(isOpen);
  };
  
    React.useEffect(() => {
    if (open) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          const mediaDevices = await navigator.mediaDevices.enumerateDevices();
          handleDevices(mediaDevices);
          stream.getTracks().forEach(track => track.stop());
          setHasCameraPermission(true);
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
        }
      };
      getCameraPermission();
    }
  }, [open]);

    const handleDevices = React.useCallback((mediaDevices: MediaDeviceInfo[]) => {
        const videoDevices = mediaDevices.filter(({ kind }) => kind === 'videoinput');
        setDevices(videoDevices);
        const backCamera = videoDevices.find(device => device.label.toLowerCase().includes('back'));
        const newDeviceId = backCamera ? backCamera.deviceId : videoDevices[0]?.deviceId;
        if (newDeviceId) {
            setActiveDeviceId(newDeviceId);
        }
    }, []);

    const checkTorchSupport = React.useCallback(async () => {
        if (webcamRef.current?.stream) {
            try {
                const track = webcamRef.current.stream.getVideoTracks()[0];
                if (track) {
                    const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
                    setTorchSupported(!!capabilities.torch);
                }
            } catch (e) { console.error("Error checking torch support:", e); setTorchSupported(false); }
        }
    }, []);
    
    React.useEffect(() => {
        if (webcamRef.current?.stream) {
            checkTorchSupport();
        }
    }, [webcamRef.current?.stream, checkTorchSupport, activeDeviceId]);


  const handleScan = React.useCallback((data: string) => {
    lastScannedId.current = data;
    
    if (data.startsWith('item::')) {
        const itemId = data.split('::')[1];
        handleAction('/inventory-list', new URLSearchParams({ openStock: itemId }))
        return;
    } else if (data.startsWith('machine::')) {
        const machineId = data.split('::')[1];
        const machine = items.find(i => i.id === machineId);
        if (machine?.itemType === 'machine') {
            setScannedItem(machine);
            setActionType('machine');
        }
    } else if (data.startsWith('commission::')) {
        const commissionId = data.split('::')[1];
        const commission = commissions.find(c => c.id === commissionId);
        if (commission) {
            setScannedItem(commission);
            setActionType('commission');
        }
    } else if (data.startsWith('compartment::')) {
        const [, mainLoc, subLoc] = data.split('::');
        const searchParams = new URLSearchParams();
        searchParams.set('mainLocation', mainLoc);
        searchParams.set('subLocation', subLoc);
        toast.toast({ title: 'Lagerfach erkannt!', description: `Zeige Artikel für ${mainLoc} / ${subLoc}`});
        handleAction('/inventory-list', searchParams);
    } else {
      // Assume it's a delivery note barcode
      let found = false;
      for (const commission of commissions) {
        for (const item of commission.items) {
          if (item.source === 'external_order' && item.transactionNumber && data.includes(item.transactionNumber)) {
            setScannedItem(commission);
            setActionType('delivery_note');
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) {
        toast.toast({ title: 'Kein passender Eintrag gefunden', description: 'Der Code konnte keinem Artikel, keiner Maschine oder Kommission zugeordnet werden.', variant: 'destructive' });
        lastScannedId.current = null; // Allow rescanning
      }
    }
    onOpenChange(false);
  }, [items, commissions, onOpenChange, toast, router]);

    const captureCode = React.useCallback(() => {
        if (!webcamRef.current) return;
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        const image = new window.Image();
        image.src = imageSrc;
        image.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(image, 0, 0, image.width, image.height);
            const imageData = ctx.getImageData(0, 0, image.width, image.height);

            let codeFound = false;

            // Always check for QR first for internal codes
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
            if (qrCode && qrCode.data && lastScannedId.current !== qrCode.data) {
                codeFound = true;
                handleScan(qrCode.data);
            }
            
            // If no QR, or QR is not internal, check for barcode if enabled
            if (!codeFound && scannerType === 'barcode' && 'BarcodeDetector' in window) {
                try {
                    // @ts-expect-error BarcodeDetector is not in global types
                    const barcodeDetector = new window.BarcodeDetector({ formats: ['code_128', 'ean_13', 'code_39'] });
                    const barcodes = await barcodeDetector.detect(imageData);
                    if (barcodes.length > 0 && barcodes[0] && lastScannedId.current !== barcodes[0].rawValue) {
                        codeFound = true;
                        handleScan(barcodes[0].rawValue);
                    }
                } catch (e) { console.warn('BarcodeDetector API not available or failed.', e); }
            }

            if (codeFound) {
                setTimeout(() => { lastScannedId.current = null; }, 3000);
            }
        };
    }, [handleScan, scannerType]);

  React.useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (open && hasCameraPermission) {
      intervalId = setInterval(captureCode, 500);
    }
    return () => clearInterval(intervalId);
  }, [open, hasCameraPermission, captureCode]);

  const switchCamera = () => {
    if (devices.length > 1 && activeDeviceId) {
        const currentIndex = devices.findIndex(d => d.deviceId === activeDeviceId);
        setActiveDeviceId(devices[(currentIndex + 1) % devices.length]?.deviceId);
    }
  };

  const toggleTorch = async () => {
    if (webcamRef.current?.stream && torchSupported) {
        try {
            const track = webcamRef.current.stream.getVideoTracks()[0];
            if (track) await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
            setTorchOn(!torchOn);
        } catch (e) { console.error("Failed to toggle torch:", e); }
    }
  };
  
  const handleAction = (path: string, searchParams?: URLSearchParams) => {
    const url = searchParams ? `${path}?${searchParams.toString()}` : path;
    router.push(url);
    resetScannerState();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick-Scan</DialogTitle>
            <DialogDescription>Richten Sie die Kamera auf einen beliebigen Code in der App.</DialogDescription>
          </DialogHeader>
           <div className="flex items-center space-x-2 my-2 justify-center">
              <Label htmlFor="scanner-type-switch-global">QR-Code</Label>
              <Switch id="scanner-type-switch-global" checked={scannerType === 'barcode'} onCheckedChange={(c) => setScannerType(c ? 'barcode' : 'qr')} />
              <Label htmlFor="scanner-type-switch-global">Barcode</Label>
          </div>
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg border aspect-video">
            {hasCameraPermission === true ? (
              <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ deviceId: activeDeviceId }} className="h-full w-full object-cover" onUserMedia={checkTorchSupport} />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-muted p-4">
                <Alert variant="destructive">
                  <AlertTitle>Kamerazugriff erforderlich</AlertTitle>
                  <AlertDescription>Bitte erlauben Sie den Kamerazugriff.</AlertDescription>
                </Alert>
              </div>
            )}
            <div className={cn("absolute inset-0 border-[20px] border-black/20", scannerType === 'qr' ? 'rounded-lg' : '')}></div>
          </div>
           <div className="flex items-center justify-center gap-4">
                {devices.length > 1 && <Button variant="outline" onClick={switchCamera}><RefreshCw className="mr-2 h-4 w-4" /> Kamera wechseln</Button>}
                {torchSupported && <Button variant="outline" onClick={toggleTorch}>{torchOn ? <ZapOff className="mr-2 h-4 w-4" /> : <Zap className="mr-2 h-4 w-4" />} Licht</Button>}
            </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!scannedItem} onOpenChange={(isOpen) => !isOpen && resetScannerState()}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Code erkannt: {scannedItem?.name}</DialogTitle>
                <DialogDescription>Wählen Sie eine Aktion aus.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 pt-4">
                {actionType === 'machine' && (
                  <>
                    <Button size="lg" onClick={() => handleAction('/machines', new URLSearchParams({ action: 'rent', machineId: scannedItem!.id }))}>
                      Verleihen
                    </Button>
                    <Button size="lg" variant="destructive" onClick={() => handleAction('/machines', new URLSearchParams({ action: 'return', machineId: scannedItem!.id }))}>
                      Rückgabe
                    </Button>
                  </>
                )}
                {actionType === 'commission' && (
                    <>
                        <Button size="lg" variant="outline" onClick={() => handleAction('/commissioning', new URLSearchParams({ commissionId: scannedItem!.id, openDetails: 'true' }))}><Info className="mr-2 h-4 w-4"/> Details anzeigen</Button>
                        <Button size="lg" variant="outline" onClick={() => handleAction('/commissioning', new URLSearchParams({ commissionId: scannedItem!.id, openPrepare: 'true' }))}><ClipboardList className="mr-2 h-4 w-4"/> Vorbereiten</Button>
                        <Button size="lg" onClick={() => handleAction('/commissioning', new URLSearchParams({ action: 'withdraw', commissionId: scannedItem!.id }))}><Archive className="mr-2 h-4 w-4"/> Entnehmen</Button>
                    </>
                )}
                 {actionType === 'delivery_note' && (
                    <Button size="lg" onClick={() => handleAction('/commissioning', new URLSearchParams({ commissionId: scannedItem!.id, openPrepare: 'true' }))}>
                        <ClipboardList className="mr-2 h-4 w-4"/> Vorbereitung für Kommission öffnen
                    </Button>
                )}
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={resetScannerState}>Schließen</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
