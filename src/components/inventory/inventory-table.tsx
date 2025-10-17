"use client"

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Minus, Plus, Save } from "lucide-react"
import type { Item } from "@/lib/types"

export type ItemWithChanges = {
  id: string;
  change: number;
};

type InventoryTableProps = {
  items: Item[];
  onUpdateQuantity: (updates: ItemWithChanges[]) => void;
};

export function InventoryTable({ items, onUpdateQuantity }: InventoryTableProps) {
  const [changes, setChanges] = useState<ItemWithChanges[]>([]);

  useEffect(() => {
    // Reset changes when the items prop changes (e.g., after filtering)
    setChanges([]);
  }, [items]);

  const handleQuantityChange = (itemId: string, delta: number) => {
    setChanges(prevChanges => {
      const existingChangeIndex = prevChanges.findIndex(c => c.id === itemId);
      if (existingChangeIndex > -1) {
        const newChanges = [...prevChanges];
        newChanges[existingChangeIndex].change += delta;
        return newChanges;
      }
      return [...prevChanges, { id: itemId, change: delta }];
    });
  };

  const getDisplayQuantity = (item: Item) => {
    const change = changes.find(c => c.id === item.id);
    return item.quantity + (change ? change.change : 0);
  };
  
  const handleSaveChanges = () => {
    onUpdateQuantity(changes);
    setChanges([]);
  };

  const hasChanges = changes.some(c => c.change !== 0);

  return (
    <div className="relative">
      <div className="border rounded-lg w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Lagerort</TableHead>
              <TableHead>Menge</TableHead>
              <TableHead className="hidden sm:table-cell">Mindestbestand</TableHead>
              <TableHead className="text-right w-[180px]">Menge anpassen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const displayQuantity = getDisplayQuantity(item);
              const isBelowMinStock = displayQuantity < item.minimumStock;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{item.location}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <span>{displayQuantity} {item.unit}</span>
                        {isBelowMinStock && <Badge variant="destructive">Niedrig</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{item.minimumStock} {item.unit}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(item.id, -1)}
                        disabled={displayQuantity <= 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(item.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {items.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
                Keine Artikel gefunden.
            </div>
        )}
      </div>
      {hasChanges && (
        <div className="sticky bottom-4 mt-4 flex justify-end">
            <Button onClick={handleSaveChanges} className="shadow-lg">
                <Save className="mr-2 h-4 w-4"/>
                Änderungen speichern
            </Button>
        </div>
      )}
    </div>
  );
}
