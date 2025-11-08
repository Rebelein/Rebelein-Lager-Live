'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, PanelLeft, Building, Printer, ClipboardCheck, ShoppingCart, BarChartHorizontal, Package, History, Warehouse, FileDown, LineChart, Wrench, ScrollText, type LucideIcon, Star, PlusCircle, MoreVertical, Pencil, Trash2, GripVertical, ScanLine, Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import Logo from '@/components/logo';
import { useAppContext } from '@/context/AppContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { LoadingOverlay } from '@/components/layout/loading-overlay';
import { NotificationBell } from './notification-bell';
import { SyncStatus } from './sync-status';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast, Toaster } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { UserSelectionDialog } from '@/components/user-selection-dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { navItems, type NavItem } from '@/lib/nav-items';
import { GlobalScanner } from './global-scanner';
import { PwaUpdateNotification } from '../pwa-update-notification';


function UserFormDialog({ user, onSave, onOpenChange, open }: { user: User | null; onSave: (name: string) => void; onOpenChange: (open: boolean) => void; open: boolean }) {
  const [name, setName] = React.useState(user ? user.name : '');

  React.useEffect(() => {
    setName(user ? user.name : '');
  }, [user, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{user ? 'Benutzer bearbeiten' : 'Neuen Benutzer anlegen'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary">Abbrechen</Button></DialogClose>
            <Button type="submit">Speichern</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const SortableNavLink = ({ id, item, active, isNavSortable, onClick }: { id: string, item: NavItem, active: boolean, isNavSortable: boolean, onClick: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled: !isNavSortable });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <Link
            ref={setNodeRef}
            style={style}
            href={item.href}
            onClick={onClick}
            className={`flex items-center gap-4 px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground ${
                active ? 'bg-accent !text-accent-foreground' : ''
            }`}
        >
            {isNavSortable ? (
                 <div {...listeners} {...attributes} className={cn("p-2 -ml-2 text-muted-foreground/50 hover:text-muted-foreground cursor-grab")}>
                    <GripVertical className="h-5 w-5" />
                </div>
            ) : <div className="w-9 h-9"/> /* Placeholder to keep alignment */}
            <item.icon className="h-5 w-5" />
            {item.label}
        </Link>
    );
};

const SortableTooltipLink = ({ id, item, active, isNavSortable, isExpanded }: { id: string, item: NavItem, active: boolean, isNavSortable: boolean, isExpanded: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled: !isNavSortable });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div ref={setNodeRef} style={style} className="flex items-center w-full">
                    {isNavSortable && (
                         <div {...listeners} {...attributes} className={cn("p-2 text-muted-foreground/50 hover:text-muted-foreground cursor-grab")}>
                            <GripVertical className="h-4 w-4" />
                        </div>
                    )}
                    <Link
                        href={item.href}
                        className={cn(
                            'flex h-9 items-center justify-start rounded-lg transition-colors duration-200 gap-4 w-full',
                             active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
                             isNavSortable ? 'px-2' : 'px-3'
                        )}
                    >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className={cn("text-sm font-medium transition-opacity duration-200 whitespace-nowrap", isExpanded ? "opacity-100" : "opacity-0")}>
                            {item.label}
                        </span>
                    </Link>
                </div>
            </TooltipTrigger>
             {!isExpanded && <TooltipContent side="right">{item.label}</TooltipContent>}
        </Tooltip>
    );
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { users, currentUser, updateUserSettings, favoriteUser, setActiveUser, setFavoriteUser, isLoading, setUsers, addUser, isUserSelectionRequired, dbConnectionStatus } = useAppContext();
  const [isClient, setIsClient] = React.useState(false);

  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [userToEdit, setUserToEdit] = React.useState<User | null>(null);
  const { toast } = useToast();
  
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = React.useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    const handleOpenScanner = (event: Event) => {
        const { type } = (event as CustomEvent).detail;
        setIsGlobalScannerOpen(true);
        // You might want to pass the 'type' to the GlobalScanner component if it needs to behave differently
    };
    window.addEventListener('openGlobalScanner', handleOpenScanner);
    return () => {
        window.removeEventListener('openGlobalScanner', handleOpenScanner);
    };
}, []);

  const handleOpenForm = (user: User | null) => {
    setUserToEdit(user);
    setIsFormOpen(true);
  };
  
  const handleOpenDeleteConfirm = (user: User) => {
    setUserToEdit(user);
    setIsDeleteConfirmOpen(true);
  };
  
  const handleSaveUser = (name: string) => {
    if (!name.trim()) {
      toast({ title: 'Fehler', description: 'Benutzername ist ein Pflichtfeld.', variant: 'destructive' });
      return;
    }

    if (userToEdit) {
      setUsers(users.map(u => (u.id === userToEdit.id ? { ...u, name } : u)));
      toast({ title: 'Benutzer aktualisiert' });
    } else {
      addUser(name.trim());
      toast({ title: 'Benutzer hinzugefügt' });
    }
    setIsFormOpen(false);
  };
  
  const handleDeleteUser = () => {
    if (userToEdit) {
      if (users.length <= 1) {
          toast({ title: 'Aktion nicht möglich', description: 'Der letzte Benutzer kann nicht gelöscht werden.', variant: 'destructive'});
          setIsDeleteConfirmOpen(false);
          return;
      }
      setUsers(users.filter(u => u.id !== userToEdit.id));
      if (currentUser?.id === userToEdit.id) {
          setActiveUser(users.find(u => u.id !== userToEdit.id) || null);
      }
      toast({ title: 'Benutzer gelöscht', variant: 'destructive' });
    }
    setIsDeleteConfirmOpen(false);
  };

  const handleUserChange = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setActiveUser(user);
    }
  };

  const handleSetFavorite = (e: React.MouseEvent, user: User) => {
    e.stopPropagation();
    setFavoriteUser(user);
    toast({ title: 'Favorit gesetzt', description: `${user.name} ist nun der Standardbenutzer.` });
  };

  const visibleNavItems = React.useMemo(() => {
    if (currentUser?.isScannerMode) {
        return navItems.filter(item => item.href === '/settings');
    }

    const allItems = navItems.map(item => item.href);
    const visibleHrefs = new Set(currentUser?.visibleNavItems ?? allItems);
    
    // Ensure settings is always visible and users is not
    visibleHrefs.add('/settings');
    visibleHrefs.delete('/users');

    const userOrder = currentUser?.navItemOrder ?? allItems;

    // Filter navItems based on visibility, then sort based on userOrder
    const filteredAndVisible = navItems.filter(item => visibleHrefs.has(item.href));

    return filteredAndVisible.sort((a, b) => {
      const indexA = userOrder.indexOf(a.href);
      const indexB = userOrder.indexOf(b.href);
      // Items not in userOrder are appended to the end
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
}, [currentUser]);


  const isLinkActive = (href: string) => {
    if (href === '/inventory-list' || href === '/machines' || href === '/locations') {
      return pathname.startsWith(href);
    }
    return pathname === href;
  };
  
  const showApp = isClient && !isLoading && !isUserSelectionRequired;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
        const oldIndex = visibleNavItems.findIndex(item => item.href === active.id);
        const newIndex = visibleNavItems.findIndex(item => item.href === over.id);
        const newOrder = arrayMove(visibleNavItems.map(i => i.href), oldIndex, newIndex);
        updateUserSettings({ navItemOrder: newOrder });
    }
  }

  const isNavSortable = currentUser?.isNavSortable ?? false;

  const mainContent = (
    <div className="flex min-h-screen w-full relative">
       <div className="absolute inset-0 overflow-hidden -z-10 bg-[url('/grid.svg')] [mask-image:linear-gradient(to_bottom,white_5%,transparent_50%)]">
        <div className="absolute w-[400px] h-[400px] bg-primary rounded-full -top-20 -left-20 animate-blob-1 filter blur-3xl opacity-30"></div>
        <div className="absolute w-[350px] h-[350px] bg-secondary rounded-full bottom-0 -right-40 animate-blob-2 filter blur-3xl opacity-30"></div>
        <div className="absolute w-[300px] h-[300px] bg-destructive/50 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-blob-3 filter blur-3xl opacity-20"></div>
      </div>
       {isClient ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <aside 
              className={cn(
                "hidden flex-col border-r bg-background/80 backdrop-blur-sm sm:flex transition-all duration-300 ease-in-out z-40",
                isSidebarExpanded || isSidebarPinned ? 'w-56' : 'w-14',
                !showApp && 'pointer-events-none opacity-50'
              )}
              onMouseEnter={() => !isSidebarPinned && setIsSidebarExpanded(true)}
              onMouseLeave={() => !isSidebarPinned && setIsSidebarExpanded(false)}
            >
                <nav className="flex flex-col items-center gap-4 px-2 sm:py-5 flex-grow">
                <Link
                    href="/dashboard"
                    className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
                >
                    <Logo className="h-5 w-5 transition-all group-hover:scale-110" />
                    <span className="sr-only">Rebelein Lager</span>
                </Link>
                <SortableContext items={visibleNavItems.map(i => i.href)} strategy={verticalListSortingStrategy}>
                    {visibleNavItems.map((item) => (
                    <SortableTooltipLink 
                        key={item.href} 
                        id={item.href} 
                        item={item} 
                        active={isLinkActive(item.href)} 
                        isNavSortable={isNavSortable && !currentUser?.isScannerMode} 
                        isExpanded={isSidebarExpanded || isSidebarPinned}
                    />
                    ))}
                </SortableContext>
                </nav>
                 <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => setIsSidebarPinned(!isSidebarPinned)}>
                        {isSidebarPinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
                    </Button>
                </nav>
            </aside>
        </DndContext>
      ) : <aside className="hidden w-14 flex-col border-r bg-background/80 sm:flex" />}
      
      <div className={cn("flex flex-1 flex-col sm:gap-4 sm:py-4 transition-all duration-300 ease-in-out", isSidebarPinned ? 'sm:pl-56' : 'sm:pl-14')}>
        <header className={cn("sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6", !showApp && 'pointer-events-none opacity-50')}>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Navigation ein-/ausblenden</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col sm:max-w-xs bg-background/90 backdrop-blur-sm">
              <SheetHeader>
                <SheetTitle>Hauptnavigation</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex-1 grid gap-1 text-lg font-medium overflow-y-auto">
                 <Link
                  href="#"
                  className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                >
                  <Logo className="h-5 w-5 transition-all group-hover:scale-110" />
                  <span className="sr-only">Rebelein Lager</span>
                </Link>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={visibleNavItems.map(i => i.href)} strategy={verticalListSortingStrategy}>
                        {visibleNavItems.map((item) => (
                            <SortableNavLink key={item.href} id={item.href} item={item} active={isLinkActive(item.href)} isNavSortable={isNavSortable && !currentUser?.isScannerMode} onClick={() => setIsSheetOpen(false)} />
                        ))}
                    </SortableContext>
                </DndContext>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="ml-auto flex items-center gap-2 md:gap-4">
            <SyncStatus status={dbConnectionStatus} />
            <NotificationBell />
            <Button variant="default" size="sm" className="h-9 gap-2" onClick={() => setIsGlobalScannerOpen(true)}>
                <ScanLine className="h-4 w-4"/>
                <span className="hidden md:inline">Quick-Scan</span>
            </Button>
             <Select onValueChange={handleUserChange} value={currentUser?.id || ''}>
              <SelectTrigger className="w-[180px] h-9 hidden md:flex">
                <SelectValue placeholder="Benutzer wählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Benutzer auswählen</SelectLabel>
                  {users.map(user => (
                    <div key={user.id} className="relative flex items-center pr-2">
                       <SelectItem value={user.id} className="flex-1 w-full pr-16">
                        {user.name}
                       </SelectItem>
                       <div className="absolute right-1 flex items-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent" onClick={(e) => handleSetFavorite(e, user)} >
                             <Star className={cn('h-4 w-4 text-muted-foreground transition-colors', favoriteUser?.id === user.id && 'fill-yellow-400 text-yellow-500')} />
                          </Button>
                           <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onSelect={() => handleOpenForm(user)}><Pencil className="mr-2 h-4 w-4" /> Bearbeiten</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleOpenDeleteConfirm(user)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Löschen</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                       </div>
                    </div>
                  ))}
                </SelectGroup>
                <Separator />
                <SelectGroup>
                   <Button variant="ghost" className="w-full justify-start mt-1" onClick={() => handleOpenForm(null)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Neuen Benutzer anlegen
                    </Button>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </header>
        <main className={cn("flex-1 p-4 sm:px-6 sm:py-0 flex flex-col bg-transparent z-10", !showApp && 'pointer-events-none opacity-50')}>
          {isClient && <LoadingOverlay />}
          {showApp ? (
            <>
              {children}
              <Toaster />
              <PwaUpdateNotification />
            </>
          ) : null}
          {isClient && <UserSelectionDialog />}
        </main>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      {mainContent}
      <UserFormDialog user={userToEdit} onSave={handleSaveUser} open={isFormOpen} onOpenChange={setIsFormOpen} />
       <GlobalScanner open={isGlobalScannerOpen} onOpenChange={setIsGlobalScannerOpen} />
      
       <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sind Sie sicher?</DialogTitle>
            <DialogDescription>Möchten Sie den Benutzer &quot;{userToEdit?.name}&quot; wirklich löschen?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteConfirmOpen(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Löschen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
