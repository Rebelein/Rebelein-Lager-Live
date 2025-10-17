
'use client';
import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAppContext } from '@/context/AppContext';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { navItems } from '@/lib/nav-items';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2, PlusCircle, Pencil, X } from 'lucide-react';
import { testAiConnection } from './actions';
import type { AppSettings, Wholesaler, WholesalerMask } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import Image from 'next/image';
import * as pdfjsLib from 'pdfjs-dist';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';


// Configure the worker script path
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}


const availableModels = {
    google: [
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Leistungsstärkstes Modell)' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Schnell & Günstig)' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Vorgänger)' },
        { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image (Bild-Generierung)' },
        { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite (Sehr schnell)' },
        { id: 'text-embedding-004', name: 'Text Embedding (für RAG)' },
    ],
    openrouter: [
        { id: 'deepseek/deepseek-chat-v3.1:free', name: 'DeepSeek Chat (Empfohlen)' },
        { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (Free)' },
        { id: 'google/gemini-flash-1.5', name: 'Google Gemini Flash 1.5' },
    ]
}

function MaskEditorDialog({
  open,
  onOpenChange,
  onSave,
  mask: initialMask,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, redactionPhrases: string[], backgroundImage: string | null) => void;
  mask: WholesalerMask | null;
}) {
    const [maskName, setMaskName] = React.useState('');
    const [backgroundImage, setBackgroundImage] = React.useState<string | null>(null);
    const [redactionPhrases, setRedactionPhrases] = React.useState('');
    const { toast } = useToast();

    React.useEffect(() => {
        if (open) {
            setMaskName(initialMask?.name || 'Standard-Maske');
            setBackgroundImage(initialMask?.backgroundImage || null);
            setRedactionPhrases((initialMask?.redactionPhrases || []).join('\n'));
        }
    }, [initialMask, open]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setBackgroundImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 2 });
                
                const canvas = document.createElement('canvas');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                const canvasContext = canvas.getContext('2d');
                if (!canvasContext) throw new Error('Could not get canvas context');

                await page.render({ canvasContext, viewport }).promise;
                setBackgroundImage(canvas.toDataURL());
            } catch (error) {
                console.error("Error rendering PDF:", error);
                toast({
                    title: "PDF-Fehler",
                    description: "Die PDF-Datei konnte nicht verarbeitet werden.",
                    variant: "destructive",
                });
            }
        }
    };
    
    const handleSave = () => {
        if (!maskName.trim()) {
            toast({ title: "Name fehlt", description: "Bitte geben Sie der Maske einen Namen.", variant: "destructive" });
            return;
        }
        const phrases = redactionPhrases.split('\n').map(p => p.trim()).filter(Boolean);
        onSave(maskName, phrases, backgroundImage);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{initialMask ? 'Maske bearbeiten' : 'Neue Maske erstellen'}</DialogTitle>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-6 py-4 max-h-[70vh]">
                  <ScrollArea className="md:pr-6 h-full">
                    <div className="space-y-4">
                       <div className="space-y-2">
                           <Label htmlFor="mask-name">Name der Maske</Label>
                           <Input id="mask-name" value={maskName} onChange={e => setMaskName(e.target.value)} placeholder="z.B. Standard, Online-Abholschein"/>
                       </div>
                        <div className="space-y-2">
                            <Label>Beispiel-Lieferschein (Bild oder PDF)</Label>
                            <Input type="file" onChange={handleFileChange} accept="image/*,.pdf" />
                        </div>
                        <div className="relative w-full border rounded-lg bg-muted" style={{ aspectRatio: '1 / 1.414' }}>
                           {backgroundImage ? (
                             <div className="relative w-full h-full">
                                <Image src={backgroundImage} alt="Lieferschein" layout="fill" objectFit="contain" />
                                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 z-10" onClick={() => setBackgroundImage(null)}><X className="h-4 w-4"/></Button>
                            </div>
                           ) : <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Vorschaubild</div>}
                        </div>
                    </div>
                  </ScrollArea>
                   <ScrollArea className="h-full">
                      <div className="space-y-2 pr-2">
                           <h4 className="font-semibold">Zu entfernende Textbausteine</h4>
                          <p className="text-sm text-muted-foreground">Geben Sie hier die genauen Textbausteine ein, die vor der KI-Analyse entfernt werden sollen (ein Eintrag pro Zeile).</p>
                          <Textarea 
                            value={redactionPhrases}
                            onChange={(e) => setRedactionPhrases(e.target.value)}
                            className="h-80 font-mono text-xs"
                            placeholder={'Kundennummer:\nRechnungsadresse\nUSt-IdNr.'}
                          />
                      </div>
                   </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>Abbrechen</Button>
                    <Button onClick={handleSave}>Maske speichern</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function MaskManagementDialog({ wholesaler, open, onOpenChange, onUpdateWholesaler }: { wholesaler: Wholesaler | null, open: boolean, onOpenChange: (open: boolean) => void, onUpdateWholesaler: (updatedWholesaler: Wholesaler) => void }) {
    const [isEditorOpen, setIsEditorOpen] = React.useState(false);
    const [editingMask, setEditingMask] = React.useState<WholesalerMask | null>(null);

    if (!wholesaler) return null;

    const handleSaveMask = (name: string, redactionPhrases: string[], backgroundImage: string | null) => {
        let updatedMasks: WholesalerMask[];
        if (editingMask) { // Editing existing mask
            updatedMasks = (wholesaler.masks || []).map(m => m.id === editingMask.id ? { ...m, name, redactionPhrases, backgroundImage: backgroundImage || undefined } : m);
        } else { // Adding new mask
            const newMask: WholesalerMask = { id: new Date().toISOString(), name, redactionPhrases, backgroundImage: backgroundImage || undefined };
            updatedMasks = [...(wholesaler.masks || []), newMask];
        }
        onUpdateWholesaler({ ...wholesaler, masks: updatedMasks });
        setIsEditorOpen(false);
        setEditingMask(null);
    };

    const handleDeleteMask = (maskId: string) => {
        const updatedMasks = (wholesaler.masks || []).filter(m => m.id !== maskId);
        onUpdateWholesaler({ ...wholesaler, masks: updatedMasks });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Masken für: {wholesaler.name}</DialogTitle>
                        <DialogDescription>Verwalten Sie die verschiedenen Lieferschein-Masken für diesen Großhändler.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {(wholesaler.masks || []).length === 0 ? (
                             <p className="text-sm text-muted-foreground text-center py-8">Noch keine Masken für diesen Großhändler erstellt.</p>
                        ) : (
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                                {(wholesaler.masks || []).map(mask => (
                                    <div key={mask.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <span className="font-medium">{mask.name}</span>
                                        <div className="flex items-center">
                                            <Button variant="ghost" size="sm" onClick={() => { setEditingMask(mask); setIsEditorOpen(true); }}><Pencil className="mr-2 h-4 w-4"/>Bearbeiten</Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteMask(mask.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                         <Button className="w-full" onClick={() => { setEditingMask(null); setIsEditorOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Neue Maske hinzufügen
                        </Button>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">Schließen</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {isEditorOpen && (
                <MaskEditorDialog
                    open={isEditorOpen}
                    onOpenChange={setIsEditorOpen}
                    mask={editingMask}
                    onSave={handleSaveMask}
                />
            )}
        </>
    );
}

const useIsDesktop = () => {
    const [isDesktop, setIsDesktop] = React.useState(true);

    React.useEffect(() => {
        const checkScreenSize = () => {
            setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
        };
        checkScreenSize(); // Initial check
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    return isDesktop;
};


export default function SettingsPage() {
    const { currentUser, updateUserSettings, appSettings, updateAppSettings, wholesalers, setWholesalers } = useAppContext();
    const { toast } = useToast();
    const isDesktop = useIsDesktop();
    
    // State for Article Analysis AI
    const [articleAiProvider, setArticleAiProvider] = React.useState('google');
    const [articleGoogleApiKey, setArticleGoogleApiKey] = React.useState('');
    const [articleOpenRouterApiKey, setArticleOpenRouterApiKey] = React.useState('');
    const [articleSelectedModel, setArticleSelectedModel] = React.useState('');
    const [isTestingArticleConnection, setIsTestingArticleConnection] = React.useState(false);

    // State for Delivery Note AI
    const [deliveryNoteAiProvider, setDeliveryNoteAiProvider] = React.useState('google');
    const [deliveryNoteGoogleApiKey, setDeliveryNoteGoogleApiKey] = React.useState('');
    const [deliveryNoteOpenRouterApiKey, setDeliveryNoteOpenRouterApiKey] = React.useState('');
    const [deliveryNoteSelectedModel, setDeliveryNoteSelectedModel] = React.useState('');
    const [isTestingDeliveryNoteConnection, setIsTestingDeliveryNoteConnection] = React.useState(false);
    
    const [managingWholesaler, setManagingWholesaler] = React.useState<Wholesaler | null>(null);
    const [isMaskManagementOpen, setIsMaskManagementOpen] = React.useState(false);


    React.useEffect(() => {
        if (appSettings?.ai) {
            const { provider, model, apiKey } = appSettings.ai;
            setArticleAiProvider(provider || 'google');
            setArticleSelectedModel(model || '');
            if (provider === 'google') setArticleGoogleApiKey(apiKey || '');
            else if (provider === 'openrouter') setArticleOpenRouterApiKey(apiKey || '');
        }
        if (appSettings?.deliveryNoteAi) {
            const { provider, model, apiKey } = appSettings.deliveryNoteAi;
            setDeliveryNoteAiProvider(provider || 'google');
            setDeliveryNoteSelectedModel(model || '');
            if (provider === 'google') setDeliveryNoteGoogleApiKey(apiKey || '');
            else if (provider === 'openrouter') setDeliveryNoteOpenRouterApiKey(apiKey || '');
        }
    }, [appSettings]);


    const handleSaveAiSettings = () => {
        let articleApiKey = '';
        if (articleAiProvider === 'google') articleApiKey = articleGoogleApiKey;
        if (articleAiProvider === 'openrouter') articleApiKey = articleOpenRouterApiKey;
        
        let deliveryNoteApiKey = '';
        if (deliveryNoteAiProvider === 'google') deliveryNoteApiKey = deliveryNoteGoogleApiKey;
        if (deliveryNoteAiProvider === 'openrouter') deliveryNoteApiKey = deliveryNoteOpenRouterApiKey;

        const settings: AppSettings = {
            ai: {
                provider: articleAiProvider as 'google' | 'openrouter',
                model: articleSelectedModel,
                apiKey: articleApiKey,
            },
            deliveryNoteAi: {
                provider: deliveryNoteAiProvider as 'google' | 'openrouter',
                model: deliveryNoteSelectedModel,
                apiKey: deliveryNoteApiKey,
            }
        };
        updateAppSettings(settings);
        toast({
            title: 'KI-Einstellungen gespeichert',
            description: 'Die globalen KI-Einstellungen wurden aktualisiert.',
        });
    }

     const handleTestConnection = async (type: 'article' | 'deliveryNote') => {
        const isArticle = type === 'article';
        const provider = isArticle ? articleAiProvider : deliveryNoteAiProvider;
        const model = isArticle ? articleSelectedModel : deliveryNoteSelectedModel;
        const apiKey = isArticle 
            ? (provider === 'google' ? articleGoogleApiKey : articleOpenRouterApiKey)
            : (provider === 'google' ? deliveryNoteGoogleApiKey : deliveryNoteOpenRouterApiKey);

        if (isArticle) setIsTestingArticleConnection(true);
        else setIsTestingDeliveryNoteConnection(true);

        try {
            const result = await testAiConnection({ provider, apiKey, model });

            if (result.success) {
                toast({
                    title: 'Verbindung erfolgreich!',
                    description: 'Das KI-Modell hat erfolgreich geantwortet.',
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: 'Verbindung fehlgeschlagen',
                description: error.message || 'Ein unbekannter Fehler ist aufgetreten.',
                variant: 'destructive',
            });
        } finally {
            if (isArticle) setIsTestingArticleConnection(false);
            else setIsTestingDeliveryNoteConnection(false);
        }
    };


    const handleToggleBorder = (checked: boolean) => {
        if (currentUser) {
            updateUserSettings({ showInventoryStatusBorder: checked });
            toast({
                title: "Einstellung gespeichert",
                description: `Die Inventur-Status-Markierung wurde ${checked ? 'eingeschaltet' : 'ausgeschaltet'}.`
            })
        }
    };

    const handleToggleNavSort = (checked: boolean) => {
        if (currentUser) {
            updateUserSettings({ isNavSortable: checked });
            toast({
                title: "Einstellung gespeichert",
                description: `Die Sortierung der Navigation wurde ${checked ? 'eingeschaltet' : 'ausgeschaltet'}.`
            })
        }
    };

    const handleToggleDashboardEditing = (checked: boolean) => {
        if (currentUser) {
            updateUserSettings({ isDashboardEditing: checked });
            toast({
                title: "Einstellung gespeichert",
                description: `Der Bearbeitungsmodus für das Dashboard wurde ${checked ? 'aktiviert' : 'deaktiviert'}.`
            })
        }
    };

    const handleToggleNavItem = (href: string, checked: boolean) => {
        if (currentUser) {
            const currentVisibleItems = currentUser.visibleNavItems ?? navItems.map(item => item.href);
            let newVisibleItems;

            if (checked) {
                newVisibleItems = [...currentVisibleItems, href];
            } else {
                newVisibleItems = currentVisibleItems.filter(itemHref => itemHref !== href);
            }
            updateUserSettings({ visibleNavItems: newVisibleItems });
        }
    };
    
    const handleOpenMaskManagement = (wholesaler: Wholesaler) => {
        setManagingWholesaler(wholesaler);
        setIsMaskManagementOpen(true);
    };
    
    const handleUpdateWholesaler = (updatedWholesaler: Wholesaler) => {
        const updatedWholesalers = wholesalers.map(w =>
            w.id === updatedWholesaler.id ? updatedWholesaler : w
        );
        setWholesalers(updatedWholesalers);
        toast({
            title: 'Masken aktualisiert',
            description: `Die Masken für ${updatedWholesaler.name} wurden gespeichert.`
        });
    };

    if (!currentUser) {
        return <div>Benutzer wird geladen...</div>
    }

    const visibleNavItems = currentUser.visibleNavItems ?? navItems.map(item => item.href);
    
  return (
    <div className="grid gap-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground mt-2">
          Verwalten Sie hier Ihre Kontoeinstellungen und App-Präferenzen.
        </p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
            <CardTitle>Lieferschein-Schwärzung</CardTitle>
            <CardDescription>
                Legen Sie für jeden Großhändler fest, welche Textbausteine auf einem Lieferschein automatisch für die KI unkenntlich gemacht werden sollen.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {wholesalers.map(wholesaler => (
                <div key={wholesaler.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                        <h3 className="font-semibold">{wholesaler.name}</h3>
                        <p className="text-sm text-muted-foreground">
                            {(wholesaler.masks?.length || 0) > 0
                                ? `${wholesaler.masks?.length} Maske(n) definiert`
                                : 'Keine Masken definiert'}
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => handleOpenMaskManagement(wholesaler)}>Schwärzung verwalten</Button>
                </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Globale KI-Einstellungen für Artikelerstellung</CardTitle>
          <CardDescription>
            Konfigurieren Sie hier das KI-Modell und den API-Schlüssel für die Analyse von Produktseiten und Bildern.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="article-ai-provider">KI-Anbieter</Label>
                    <Select value={articleAiProvider} onValueChange={(value) => { setArticleAiProvider(value); setArticleSelectedModel(''); }}>
                        <SelectTrigger id="article-ai-provider"><SelectValue placeholder="Anbieter wählen..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="google">Google Gemini</SelectItem>
                            <SelectItem value="openrouter">OpenRouter</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="article-ai-model">Modell</Label>
                    {articleAiProvider === 'openrouter' ? (
                        <div>
                            <Input id="article-ai-model" value={articleSelectedModel} onChange={e => setArticleSelectedModel(e.target.value)} placeholder="z.B. deepseek/deepseek-chat-v3.1:free" />
                            <p className="text-sm text-muted-foreground mt-2">Geben Sie hier den vollständigen Modellnamen von OpenRouter ein.</p>
                        </div>
                    ) : (
                        <Select value={articleSelectedModel} onValueChange={setArticleSelectedModel} disabled={!articleAiProvider}>
                            <SelectTrigger id="article-ai-model"><SelectValue placeholder="Modell auswählen..." /></SelectTrigger>
                            <SelectContent>
                                {articleAiProvider === 'google' && availableModels.google.map(model => (
                                    <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>
            {articleAiProvider === 'google' && (
                 <div className="space-y-2">
                    <Label htmlFor="article-google-api-key">Google Gemini API Key</Label>
                    <Input id="article-google-api-key" type="password" value={articleGoogleApiKey} onChange={e => setArticleGoogleApiKey(e.target.value)} placeholder="Ihren Gemini API Key eingeben"/>
                </div>
            )}
                       
            {articleAiProvider === 'openrouter' && (
                 <div className="space-y-2">
                    <Label htmlFor="article-openrouter-api-key">OpenRouter API Key</Label>
                    <Input id="article-openrouter-api-key" type="password" value={articleOpenRouterApiKey} onChange={e => setArticleOpenRouterApiKey(e.target.value)} placeholder="Ihren OpenRouter API Key eingeben"/>
                </div>
            )}
        </CardContent>
         <CardFooter className="flex flex-wrap gap-2">
            <Button onClick={handleSaveAiSettings}>Alle KI-Einstellungen speichern</Button>
            <Button variant="outline" onClick={() => handleTestConnection('article')} disabled={isTestingArticleConnection}>
              {isTestingArticleConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verbindung testen
            </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Globale KI-Einstellungen für Lieferscheine</CardTitle>
          <CardDescription>
            Konfigurieren Sie hier das KI-Modell und den API-Schlüssel für die Analyse von Lieferscheinen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="delivery-ai-provider">KI-Anbieter</Label>
                    <Select value={deliveryNoteAiProvider} onValueChange={(value) => { setDeliveryNoteAiProvider(value); setDeliveryNoteSelectedModel(''); }}>
                        <SelectTrigger id="delivery-ai-provider"><SelectValue placeholder="Anbieter wählen..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="google">Google Gemini</SelectItem>
                            <SelectItem value="openrouter">OpenRouter</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="delivery-ai-model">Modell</Label>
                    {deliveryNoteAiProvider === 'openrouter' ? (
                        <div>
                            <Input id="delivery-ai-model" value={deliveryNoteSelectedModel} onChange={e => setDeliveryNoteSelectedModel(e.target.value)} placeholder="z.B. google/gemini-flash-1.5" />
                            <p className="text-sm text-muted-foreground mt-2">Geben Sie hier den vollständigen Modellnamen von OpenRouter ein.</p>
                        </div>
                    ) : (
                        <Select value={deliveryNoteSelectedModel} onValueChange={setDeliveryNoteSelectedModel} disabled={!deliveryNoteAiProvider}>
                            <SelectTrigger id="delivery-ai-model"><SelectValue placeholder="Modell auswählen..." /></SelectTrigger>
                            <SelectContent>
                                {deliveryNoteAiProvider === 'google' && availableModels.google.map(model => (
                                    <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>
            
            {deliveryNoteAiProvider === 'google' && (
                 <div className="space-y-2">
                    <Label htmlFor="delivery-google-api-key">Google Gemini API Key</Label>
                    <Input id="delivery-google-api-key" type="password" value={deliveryNoteGoogleApiKey} onChange={e => setDeliveryNoteGoogleApiKey(e.target.value)} placeholder="Ihren Gemini API Key eingeben"/>
                </div>
            )}
                       
            {deliveryNoteAiProvider === 'openrouter' && (
                 <div className="space-y-2">
                    <Label htmlFor="delivery-openrouter-api-key">OpenRouter API Key</Label>
                    <Input id="delivery-openrouter-api-key" type="password" value={deliveryNoteOpenRouterApiKey} onChange={e => setDeliveryNoteOpenRouterApiKey(e.target.value)} placeholder="Ihren OpenRouter API Key eingeben"/>
                </div>
            )}

        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
            <Button onClick={handleSaveAiSettings}>Alle KI-Einstellungen speichern</Button>
            <Button variant="outline" onClick={() => handleTestConnection('deliveryNote')} disabled={isTestingDeliveryNoteConnection}>
              {isTestingDeliveryNoteConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verbindung testen
            </Button>
        </CardFooter>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Anzeige-Einstellungen</CardTitle>
          <CardDescription>
            Passen Sie an, wie Informationen in der App dargestellt werden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg gap-4">
                <div>
                <h3 className="font-semibold">Inventur-Status-Markierung</h3>
                <p className="text-sm text-muted-foreground">Zeigt eine farbige Umrandung bei Artikeln basierend auf dem letzten Zähldatum.</p>
                </div>
                <Switch
                    checked={currentUser.showInventoryStatusBorder ?? true}
                    onCheckedChange={handleToggleBorder}
                />
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg gap-4">
                <div>
                <h3 className="font-semibold">Sortierung der Navigation</h3>
                <p className="text-sm text-muted-foreground">Erlaubt das Umsortieren der Menüpunkte per Drag &amp; Drop.</p>
                </div>
                <Switch
                    checked={currentUser.isNavSortable ?? false}
                    onCheckedChange={handleToggleNavSort}
                />
            </div>
             {isDesktop && <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg gap-4">
                <div>
                <h3 className="font-semibold">Dashboard anpassen</h3>
                <p className="text-sm text-muted-foreground">Aktiviert den Bearbeitungsmodus zum Verschieben der Dashboard-Kacheln.</p>
                </div>
                <Switch
                    checked={currentUser.isDashboardEditing ?? false}
                    onCheckedChange={handleToggleDashboardEditing}
                />
            </div>}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Navigationsmenü anpassen</CardTitle>
          <CardDescription>
            Wählen Sie aus, welche Menüpunkte in der Seitenleiste angezeigt werden sollen.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {navItems.map(item => {
                // Settings page should always be visible
                const isDisabled = item.href === '/settings';
                return (
                    <div key={item.href} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                            <h3 className="font-semibold">{item.label}</h3>
                        </div>
                        <Switch
                            checked={isDisabled || visibleNavItems.includes(item.href)}
                            onCheckedChange={(checked) => handleToggleNavItem(item.href, checked)}
                            disabled={isDisabled}
                            aria-label={`Toggle visibility of ${item.label}`}
                        />
                    </div>
                )
            })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrationen</CardTitle>
          <CardDescription>
            Verbinden Sie Rebelein Lager mit anderen Systemen, um Daten wie Artikelstämme automatisch zu importieren.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <Card>
            <CardHeader>
              <CardTitle>GC-Gruppe Online Plus (IDS-Schnittstelle)</CardTitle>
              <CardDescription>
                Geben Sie Ihre Zugangsdaten ein, um eine Verbindung zur IDS-Schnittstelle herzustellen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gc-username">Benutzername</Label>
                <Input id="gc-username" placeholder="Ihr GC Online Plus Benutzername" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gc-password">Passwort</Label>
                <Input id="gc-password" type="password" placeholder="Ihr Passwort" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Verbinden</Button>
            </CardFooter>
          </Card>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold">Branchensoftware (z.B. pds, KWP)</h3>
              <p className="text-sm text-muted-foreground">Noch nicht verbunden</p>
            </div>
            <Button variant="outline">Verbinden</Button>
          </div>
        </CardContent>
      </Card>
      {managingWholesaler && (
        <MaskManagementDialog
            wholesaler={managingWholesaler}
            open={isMaskManagementOpen}
            onOpenChange={setIsMaskManagementOpen}
            onUpdateWholesaler={handleUpdateWholesaler}
        />
      )}
    </div>
  );
}
