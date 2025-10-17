"use client"

import { useState, useMemo } from "react"
import { Plus, Bot, Search, ScanLine } from "lucide-react"

import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InventoryTable, type ItemWithChanges } from "@/components/inventory/inventory-table"
import { AddItemSheet } from "@/components/inventory/add-item-sheet"
import { RestockDialog } from "@/components/inventory/restock-dialog"
import { mockItems, mockHistory, mockUser } from "@/lib/data"
import type { Item, HistoryEntry } from "@/lib/types"

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>(mockItems);
  const [history, setHistory] = useState<HistoryEntry[]>(mockHistory);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddItemSheetOpen, setAddItemSheetOpen] = useState(false);
  const [isRestockDialogOpen, setRestockDialogOpen] = useState(false);

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);
  
  const handleAddItem = (newItem: Omit<Item, 'id' | 'barcode'>) => {
    const fullNewItem: Item = {
      ...newItem,
      id: `ITM${(items.length + 1).toString().padStart(3, '0')}`,
      barcode: Math.random().toString(36).substring(2, 15),
    };
    
    setItems(prev => [...prev, fullNewItem]);

    const historyEntry: HistoryEntry = {
      id: `HIST${(history.length + 1).toString().padStart(3, '0')}`,
      itemId: fullNewItem.id,
      itemName: fullNewItem.name,
      change: fullNewItem.quantity,
      newQuantity: fullNewItem.quantity,
      timestamp: new Date().toISOString(),
      user: mockUser.name,
    };
    setHistory(prev => [historyEntry, ...prev]);
  };

  const handleUpdateQuantity = (updates: ItemWithChanges[]) => {
    const newHistoryEntries: HistoryEntry[] = [];
    const updatedItems = items.map(item => {
      const update = updates.find(u => u.id === item.id);
      if (update && update.change !== 0) {
        const newQuantity = item.quantity + update.change;
        newHistoryEntries.push({
          id: `HIST${(history.length + newHistoryEntries.length + 1).toString().padStart(3, '0')}`,
          itemId: item.id,
          itemName: item.name,
          change: update.change,
          newQuantity: newQuantity,
          timestamp: new Date().toISOString(),
          user: mockUser.name,
        });
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setItems(updatedItems);
    setHistory(prev => [...newHistoryEntries, ...prev]);
  };

  return (
    <AppLayout>
      <main className="p-4 sm:p-6 lg:p-8 flex flex-col h-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Inventar</h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Artikel suchen..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setRestockDialogOpen(true)}>
                <Bot />
                Vorschläge
              </Button>
              <Button className="w-full sm:w-auto" onClick={() => setAddItemSheetOpen(true)}>
                <Plus />
                Artikel
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex-grow overflow-auto">
            <InventoryTable 
                items={filteredItems} 
                onUpdateQuantity={handleUpdateQuantity}
            />
        </div>
      </main>

      <AddItemSheet 
        isOpen={isAddItemSheetOpen}
        onOpenChange={setAddItemSheetOpen}
        onAddItem={handleAddItem}
      />
      
      <RestockDialog
        items={items}
        isOpen={isRestockDialogOpen}
        onOpenChange={setRestockDialogOpen}
      />

    </AppLayout>
  );
}
