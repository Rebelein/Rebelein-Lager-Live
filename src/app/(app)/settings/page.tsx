

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
import { Loader2, Trash2, PlusCircle, Pencil, User, Bot, Link2, PackageSearch, Smartphone } from 'lucide-react';
import { testAiConnection } from './actions';
import type { AppSettings, Wholesaler, CsvExportFormat } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';

const availableModels = {
    google: [
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Bilder & Text)' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Schnell & Text)' },
        { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite (Sehr schnell & Text)' },
    ],
    openrouter: [
        { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat (Empfohlen)' },
        { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (Free)' },
        { id: 'google/gemini-pro-1.5', name: 'Google Gemini Pro 1.5' },
        { id: 'google/gemini-flash-1.5', name: 'Google Gemini Flash 1.5' },
    ],
    lokale_ki: []
}

function WholesalerDialog({ wholesaler, onSave, onOpenChange, open }: { wholesaler: Wholesaler | null, onSave: (wholesalerData: Partial<Wholesaler>) => void, onOpenChange: (open: boolean) => void, open: boolean }) {
    const [name, setName] = React.useState('');
    const [csvFormat, setCsvFormat] = React.useState<CsvExportFormat>({
        delimiter: ';',
        includeHeader: true,
        columns: {
            itemNumber: { index: 0, type: 'wholesaler' },
            quantity: { index: 1 },
        },
    });

    React.useEffect(() => {
        if (wholesaler) {
            setName(wholesaler.name);
            setCsvFormat(wholesaler.csvExportFormat || {
                delimiter: ';',
                includeHeader: true,
                columns: {
                    itemNumber: { index: 0, type: 'wholesaler' },
                    quantity: { index: 1 },
                },
            });
        } else {
            setName('');
            setCsvFormat({
                delimiter: ';',
                includeHeader: true,
                columns: {
                    itemNumber: { index: 0, type: 'wholesaler' },
                    quantity: { index: 1 },
                },
            });
        }
    }, [wholesaler, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, csvExportFormat: csvFormat });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{wholesaler ? 'Großhändler bearbeiten' : 'Neuen Großhändler anlegen'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="wholesaler-name">Name</Label>
                            <Input id="wholesaler-name" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <Separator />
                        <div>
                            <h4 className="text-md font-medium mb-2">CSV-Bestellformat</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="delimiter">Trennzeichen</Label>
                                    <Select value={csvFormat.delimiter} onValueChange={(val) => setCsvFormat(p => ({...p, delimiter: val as any}))}>
                                        <SelectTrigger id="delimiter"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value=";">Semikolon</SelectItem>
                                            <SelectItem value=",">Komma</SelectItem>
                                            <SelectItem value="\t">Tabulator</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="space-y-2 pt-8">
                                    <div className="flex items-center space-x-2">
                                        <Switch id="includeHeader" checked={csvFormat.includeHeader} onCheckedChange={(checked) => setCsvFormat(p => ({...p, includeHeader: checked}))} />
                                        <Label htmlFor="includeHeader">Kopfzeile exportieren</Label>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="itemNumber-index">Spalte für Artikelnummer</Label>
                                    <Input id="itemNumber-index" type="number" value={csvFormat.columns.itemNumber.index} onChange={(e) => setCsvFormat(p => ({...p, columns: {...p.columns, itemNumber: {...p.columns.itemNumber, index: parseInt(e.target.value) || 0}} }))} min="0"/>
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="itemNumber-type">Typ der Artikelnummer</Label>
                                     <Select value={csvFormat.columns.itemNumber.type} onValueChange={(val) => setCsvFormat(p => ({...p, columns: {...p.columns, itemNumber: {...p.columns.itemNumber, type: val as any}} }))}>
                                        <SelectTrigger id="itemNumber-type"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="wholesaler">Großhändler-Art.Nr.</SelectItem>
                                            <SelectItem value="manufacturer">Hersteller-Art.Nr.</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="quantity-index">Spalte für Menge</Label>
                                    <Input id="quantity-index" type="number" value={csvFormat.columns.quantity.index} onChange={(e) => setCsvFormat(p => ({...p, columns: {...p.columns, quantity: {...p.columns.quantity, index: parseInt(e.target.value) || 0}} }))} min="0"/>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Abbrechen</Button></DialogClose>
                        <Button type="submit">Speichern</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

const settingsSections = [
    { id: 'general', label: 'Allgemein', icon: User },
    { id: 'ai', label: 'KI & Automatisierung', icon: Bot },
    { id: 'integrations', label: 'Integrationen', icon: Link2 }
];


export default function SettingsPage() {
    const { currentUser, updateUserSettings, appSettings, updateAppSettings, wholesalers, setWholesalers } = useAppContext();
    const { toast } = useToast();
    const [activeSection, setActiveSection] = React.useState('general');
    
    // State for Article Analysis AI
    const [articleAiProvider, setArticleAiProvider] = React.useState('google');
    const [articleGoogleApiKey, setArticleGoogleApiKey] = React.useState('');
    const [articleOpenRouterApiKey, setArticleOpenRouterApiKey] = React.useState('');
    const [articleSelectedModel, setArticleSelectedModel] = React.useState('');
    const [articleServerUrl, setArticleServerUrl] = React.useState('');
    const [isTestingArticleConnection, setIsTestingArticleConnection] = React.useState(false);

    // State for Delivery Note AI
    const [deliveryNoteAiProvider, setDeliveryNoteAiProvider] = React.useState('google');
    const [deliveryNoteGoogleApiKey, setDeliveryNoteGoogleApiKey] = React.useState('');
    const [deliveryNoteOpenRouterApiKey, setDeliveryNoteOpenRouterApiKey] = React.useState('');
    const [deliveryNoteSelectedModel, setDeliveryNoteSelectedModel] = React.useState('');
    const [deliveryNoteServerUrl, setDeliveryNoteServerUrl] = React.useState('');
    const [isTestingDeliveryNoteConnection, setIsTestingDeliveryNoteConnection] = React.useState(false);
    
    // State for Commission Settings
    const [commissionPrinterEmail, setCommissionPrinterEmail] = React.useState('');

    const [isWholesalerDialogOpen, setIsWholesalerDialogOpen] = React.useState(false);
    const [editingWholesaler, setEditingWholesaler] = React.useState<Wholesaler | null>(null);


    React.useEffect(() => {
        if (appSettings) {
            if (appSettings.ai) {
                const { provider, model, apiKey, serverUrl } = appSettings.ai;
                setArticleAiProvider(provider || 'google');
                setArticleSelectedModel(model || '');
                setArticleServerUrl(serverUrl || '');
                if (provider === 'google') setArticleGoogleApiKey(apiKey || '');
                else if (provider === 'openrouter') setArticleOpenRouterApiKey(apiKey || '');
                else if (provider === 'lokale_ki') setArticleOpenRouterApiKey(apiKey || ''); // local can also use a key
            }
            if (appSettings.deliveryNoteAi) {
                const { provider, model, apiKey, serverUrl } = appSettings.deliveryNoteAi;
                setDeliveryNoteAiProvider(provider || 'google');
                setDeliveryNoteSelectedModel(model || '');
                setDeliveryNoteServerUrl(serverUrl || '');
                if (provider === 'google') setDeliveryNoteGoogleApiKey(apiKey || '');
                else if (provider === 'openrouter') setDeliveryNoteOpenRouterApiKey(apiKey || '');
                else if (provider === 'lokale_ki') setDeliveryNoteOpenRouterApiKey(apiKey || ''); // local can also use a key
            }
            if (appSettings.commission) {
                setCommissionPrinterEmail(appSettings.commission.printerEmail || '');
            }
        }
    }, [appSettings]);


    const handleSaveAiSettings = () => {
        const getApiKey = (provider: string, googleKey: string, openRouterKey: string) => {
            if (provider === 'google') return googleKey;
            if (provider === 'openrouter' || provider === 'lokale_ki') return openRouterKey;
            return '';
        }

        const settings: AppSettings = {
            ...appSettings,
            ai: {
                provider: articleAiProvider as any,
                model: articleSelectedModel,
                apiKey: getApiKey(articleAiProvider, articleGoogleApiKey, articleOpenRouterApiKey),
                serverUrl: articleAiProvider === 'lokale_ki' ? articleServerUrl : undefined,
            },
            deliveryNoteAi: {
                provider: deliveryNoteAiProvider as any,
                model: deliveryNoteSelectedModel,
                apiKey: getApiKey(deliveryNoteAiProvider, deliveryNoteGoogleApiKey, deliveryNoteOpenRouterApiKey),
                serverUrl: deliveryNoteAiProvider === 'lokale_ki' ? deliveryNoteServerUrl : undefined,
            },
            commission: {
                printerEmail: commissionPrinterEmail,
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
        const serverUrl = isArticle ? articleServerUrl : deliveryNoteServerUrl;
        const apiKey = isArticle 
            ? getApiKey(provider, articleGoogleApiKey, articleOpenRouterApiKey)
            : getApiKey(provider, deliveryNoteGoogleApiKey, deliveryNoteOpenRouterApiKey);

        if (isArticle) setIsTestingArticleConnection(true);
        else setIsTestingDeliveryNoteConnection(true);

        try {
            const result = await testAiConnection({ provider, apiKey, model, serverUrl });

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

        function getApiKey(provider: string, googleKey: string, openRouterKey: string): string {
            if (provider === 'google') return googleKey;
            if (provider === 'openrouter' || provider === 'lokale_ki') return openRouterKey;
            return '';
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

    const handleToggleScannerMode = (checked: boolean) => {
        if (currentUser) {
            updateUserSettings({ isScannerMode: checked });
            toast({
                title: "Scanner-Modus geändert",
                description: `Der reine Scanner-Modus wurde ${checked ? 'aktiviert' : 'deaktiviert'}.`
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
    
    const handleSaveWholesaler = (wholesalerData: Partial<Wholesaler>) => {
        if (editingWholesaler) {
            setWholesalers(wholesalers.map(w => w.id === editingWholesaler.id ? { ...w, ...wholesalerData } as Wholesaler : w));
            toast({ title: 'Großhändler aktualisiert' });
        } else {
            const newWholesaler: Wholesaler = { id: new Date().toISOString(), name: wholesalerData.name!, masks: [], ...wholesalerData };
            setWholesalers([...wholesalers, newWholesaler]);
            toast({ title: 'Großhändler hinzugefügt' });
        }
        setIsWholesalerDialogOpen(false);
    };

    const handleDeleteWholesaler = (wholesalerId: string) => {
        setWholesalers(wholesalers.filter(w => w.id !== wholesalerId));
        toast({ title: 'Großhändler gelöscht', variant: 'destructive' });
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'general':
                return (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Anzeige</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label htmlFor="inventory-border-switch" className="flex-1 pr-4">Inventur-Status-Markierung</Label>
                                    <Switch id="inventory-border-switch" checked={currentUser?.showInventoryStatusBorder ?? true} onCheckedChange={handleToggleBorder} />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label htmlFor="nav-sort-switch" className="flex-1 pr-4">Navigation sortierbar machen</Label>
                                    <Switch id="nav-sort-switch" checked={currentUser?.isNavSortable ?? false} onCheckedChange={handleToggleNavSort} />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <Label htmlFor="dashboard-edit-switch" className="flex-1 pr-4">Dashboard anpassen</Label>
                                    <Switch id="dashboard-edit-switch" checked={currentUser?.isDashboardEditing ?? false} onCheckedChange={handleToggleDashboardEditing} />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className='flex items-center gap-2'>
                                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                                        <Label htmlFor="scanner-mode-switch" className="flex-1 pr-4">Reiner Scanner-Modus</Label>
                                    </div>
                                    <Switch id="scanner-mode-switch" checked={currentUser?.isScannerMode ?? false} onCheckedChange={handleToggleScannerMode} />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Navigationsmenü</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                {navItems.map(item => {
                                    const isDisabled = item.href === '/settings';
                                    const visibleNavItems = currentUser?.visibleNavItems ?? navItems.map(item => item.href);
                                    return (
                                        <div key={item.href} className="flex items-center justify-between p-3 border rounded-lg">
                                            <Label htmlFor={`nav-${item.href}`} className="flex-1 pr-4">{item.label}</Label>
                                            <Switch id={`nav-${item.href}`} checked={isDisabled || visibleNavItems.includes(item.href)} onCheckedChange={(checked) => handleToggleNavItem(item.href, checked)} disabled={isDisabled} />
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    </div>
                );
            case 'ai':
                return (
                     <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Artikelerfassung (AI)</CardTitle>
                                <CardDescription>KI-Modell für die Analyse von Produktseiten und Bildern.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="article-ai-provider">Anbieter</Label>
                                        <Select value={articleAiProvider} onValueChange={(value) => { setArticleAiProvider(value); setArticleSelectedModel(''); }}>
                                            <SelectTrigger id="article-ai-provider"><SelectValue placeholder="Anbieter wählen..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="google">Google Gemini</SelectItem>
                                                <SelectItem value="openrouter">OpenRouter</SelectItem>
                                                <SelectItem value="lokale_ki">Lokale KI</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="article-ai-model">Modell</Label>
                                        {(articleAiProvider === 'openrouter' || articleAiProvider === 'lokale_ki') ? (
                                            <Input id="article-ai-model" value={articleSelectedModel || ''} onChange={e => setArticleSelectedModel(e.target.value)} placeholder="z.B. google/gemini-pro-1.5" />
                                        ) : (
                                            <Select value={articleSelectedModel} onValueChange={setArticleSelectedModel} disabled={!articleAiProvider || articleAiProvider === 'lokale_ki'}>
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
                                        <Input id="article-google-api-key" type="password" value={articleGoogleApiKey || ''} onChange={e => setArticleGoogleApiKey(e.target.value)} placeholder="Ihren Gemini API Key eingeben"/>
                                    </div>
                                )}
                                {(articleAiProvider === 'openrouter' || articleAiProvider === 'lokale_ki') && (
                                    <div className="space-y-2">
                                        <Label htmlFor="article-openrouter-api-key">API Key (optional für lokale KI)</Label>
                                        <Input id="article-openrouter-api-key" type="password" value={articleOpenRouterApiKey || ''} onChange={e => setArticleOpenRouterApiKey(e.target.value)} placeholder="API Key eingeben"/>
                                    </div>
                                )}
                                {articleAiProvider === 'lokale_ki' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="article-server-url">Server URL</Label>
                                        <Input id="article-server-url" value={articleServerUrl || ''} onChange={e => setArticleServerUrl(e.target.value)} placeholder="z.B. http://192.168.1.100:11434/v1" />
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" onClick={() => handleTestConnection('article')} disabled={isTestingArticleConnection}>
                                    {isTestingArticleConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Verbindung testen
                                </Button>
                            </CardFooter>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Lieferschein-Erfassung (AI)</CardTitle>
                                <CardDescription>KI-Modell für die Analyse von Lieferschein-Texten.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="delivery-ai-provider">Anbieter</Label>
                                        <Select value={deliveryNoteAiProvider} onValueChange={(value) => { setDeliveryNoteAiProvider(value); setDeliveryNoteSelectedModel(''); }}>
                                            <SelectTrigger id="delivery-ai-provider"><SelectValue placeholder="Anbieter wählen..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="google">Google Gemini</SelectItem>
                                                <SelectItem value="openrouter">OpenRouter</SelectItem>
                                                <SelectItem value="lokale_ki">Lokale KI</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="delivery-ai-model">Modell</Label>
                                        {(deliveryNoteAiProvider === 'openrouter' || deliveryNoteAiProvider === 'lokale_ki') ? (
                                            <Input id="delivery-ai-model" value={deliveryNoteSelectedModel || ''} onChange={e => setDeliveryNoteSelectedModel(e.target.value)} placeholder="z.B. google/gemini-flash-1.5" />
                                        ) : (
                                            <Select value={deliveryNoteSelectedModel} onValueChange={setDeliveryNoteSelectedModel} disabled={!deliveryNoteAiProvider || deliveryNoteAiProvider === 'lokale_ki'}>
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
                                        <Input id="delivery-google-api-key" type="password" value={deliveryNoteGoogleApiKey || ''} onChange={e => setDeliveryNoteGoogleApiKey(e.target.value)} placeholder="Ihren Gemini API Key eingeben"/>
                                    </div>
                                )}
                                {(deliveryNoteAiProvider === 'openrouter' || deliveryNoteAiProvider === 'lokale_ki') && (
                                    <div className="space-y-2">
                                        <Label htmlFor="delivery-openrouter-api-key">API Key (optional für lokale KI)</Label>
                                        <Input id="delivery-openrouter-api-key" type="password" value={deliveryNoteOpenRouterApiKey || ''} onChange={e => setDeliveryNoteOpenRouterApiKey(e.target.value)} placeholder="API Key eingeben"/>
                                    </div>
                                )}
                                {deliveryNoteAiProvider === 'lokale_ki' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="delivery-server-url">Server URL</Label>
                                        <Input id="delivery-server-url" value={deliveryNoteServerUrl || ''} onChange={e => setDeliveryNoteServerUrl(e.target.value)} placeholder="z.B. http://192.168.1.100:11434/v1" />
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" onClick={() => handleTestConnection('deliveryNote')} disabled={isTestingDeliveryNoteConnection}>
                                    {isTestingDeliveryNoteConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Verbindung testen
                                </Button>
                            </CardFooter>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><PackageSearch className="h-5 w-5" /> Kommissionierung</CardTitle>
                                <CardDescription>Einstellungen für den Kommissionierungs-Workflow.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="printer-email">E-Mail-Adresse für Etikettendrucker</Label>
                                    <Input 
                                        id="printer-email" 
                                        type="email" 
                                        value={commissionPrinterEmail || ''} 
                                        onChange={e => setCommissionPrinterEmail(e.target.value)} 
                                        placeholder="drucker@ihredomain.de"
                                    />
                                    <p className="text-xs text-muted-foreground">Geben Sie hier die E-Mail-Adresse Ihres Netzwerkdruckers ein, um Etiketten direkt zu drucken.</p>
                                </div>
                            </CardContent>
                         </Card>
                         <Card>
                            <CardFooter>
                                <Button onClick={handleSaveAiSettings}>Alle Einstellungen speichern</Button>
                            </CardFooter>
                         </Card>
                    </div>
                );
            case 'integrations':
                 return (
                    <div className="space-y-6">
                        <Card>
                             <CardHeader>
                                <CardTitle>Großhändler</CardTitle>
                                <CardDescription>Verwalten Sie die Großhändler und deren CSV-Exportformate für Bestellungen.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {wholesalers.map(wholesaler => (
                                        <div key={wholesaler.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <span className="font-medium">{wholesaler.name}</span>
                                            <div className="flex items-center">
                                                <Button variant="ghost" size="sm" onClick={() => { setEditingWholesaler(wholesaler); setIsWholesalerDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4"/>Bearbeiten</Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteWholesaler(wholesaler.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" className="mt-4 w-full" onClick={() => { setEditingWholesaler(null); setIsWholesalerDialogOpen(true); }}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Neuen Großhändler hinzufügen
                                </Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>GC-Gruppe Online Plus (IDS-Schnittstelle)</CardTitle>
                                <CardDescription>Verbinden Sie die App mit der IDS-Schnittstelle.</CardDescription>
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
                            <CardFooter><Button>Verbinden</Button></CardFooter>
                        </Card>
                    </div>
                );
            default:
                return null;
        }
    };


    if (!currentUser) {
        return <div>Benutzer wird geladen...</div>
    }
    
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-muted-foreground mt-1">
          Verwalten Sie hier Ihre globalen App-Einstellungen und persönlichen Präferenzen.
        </p>
      </header>

      {/* Mobile Accordion View */}
      <div className="md:hidden">
        <Accordion type="single" collapsible className="w-full space-y-4" value={activeSection} onValueChange={setActiveSection}>
            {settingsSections.map(section => (
                <AccordionItem key={section.id} value={section.id} className="border-b-0">
                    <Card>
                        <AccordionTrigger className="p-4 hover:no-underline">
                            <div className="flex items-center gap-3">
                               <section.icon className="h-5 w-5 text-primary" />
                               <span className="font-semibold">{section.label}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                           <Separator className="mb-4" />
                           {renderContent()}
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            ))}
        </Accordion>
      </div>
      
      {/* Desktop Grid View */}
      <div className="hidden md:grid md:grid-cols-[250px_1fr] gap-8">
        <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
          {settingsSections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary',
                activeSection === section.id && 'bg-muted font-semibold text-primary'
              )}
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
           {renderContent()}
        </div>
      </div>
      
       <WholesalerDialog 
          open={isWholesalerDialogOpen}
          onOpenChange={setIsWholesalerDialogOpen}
          wholesaler={editingWholesaler}
          onSave={handleSaveWholesaler}
      />
    </div>
  );
}
