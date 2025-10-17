"use client"

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Item } from "@/lib/types";

const itemSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich."),
  description: z.string().optional(),
  location: z.string().min(1, "Lagerort ist erforderlich."),
  quantity: z.coerce.number().min(0, "Menge darf nicht negativ sein."),
  minimumStock: z.coerce.number().min(0, "Mindestbestand darf nicht negativ sein."),
  consumptionRate: z.coerce.number().min(0, "Verbrauchsrate darf nicht negativ sein."),
  unit: z.string().min(1, "Einheit ist erforderlich."),
  price: z.coerce.number().min(0, "Preis darf nicht negativ sein."),
});

type AddItemSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddItem: (item: Omit<Item, 'id' | 'barcode'>) => void;
};

export function AddItemSheet({ isOpen, onOpenChange, onAddItem }: AddItemSheetProps) {
  const form = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: "",
      description: "",
      location: "",
      quantity: 0,
      minimumStock: 0,
      consumptionRate: 0,
      unit: "Stk",
      price: 0,
    },
  });

  function onSubmit(values: z.infer<typeof itemSchema>) {
    onAddItem(values);
    form.reset();
    onOpenChange(false);
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Neuen Artikel anlegen</SheetTitle>
              <SheetDescription>
                Füllen Sie die Details für den neuen Artikel aus.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-grow py-6 space-y-4 overflow-y-auto">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artikelname</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Photonen-Schraubenzieher" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Beschreiben Sie den Artikel..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lagerort</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Regal A-1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Menge</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Einheit</FormLabel>
                      <FormControl>
                        <Input placeholder="z.B. Stk, kg, l" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="minimumStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mindestbestand</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="consumptionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verbrauch/Woche</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preis (€)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
              <Button type="submit">Speichern</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
