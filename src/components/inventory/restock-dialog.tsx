"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Bot, Loader2 } from "lucide-react"
import type { Item } from "@/lib/types"
import { getRestockSuggestionsAction } from "@/lib/actions"
import type { GenerateRestockSuggestionsOutput } from "@/ai/flows/generate-restock-suggestions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"

type RestockDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  items: Item[]
}

export function RestockDialog({ isOpen, onOpenChange, items }: RestockDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<GenerateRestockSuggestionsOutput["restockSuggestions"] | null>(null)

  const handleGenerateSuggestions = async () => {
    setIsLoading(true)
    setSuggestions(null)
    try {
      const result = await getRestockSuggestionsAction({
        items: items.map(item => ({
          itemId: item.id,
          name: item.name,
          description: item.description,
          location: item.location,
          currentStock: item.quantity,
          minimumStock: item.minimumStock,
          consumptionRate: item.consumptionRate,
          unit: item.unit
        })),
      })
      setSuggestions(result.restockSuggestions)
      if (result.restockSuggestions.length === 0) {
        toast({
          title: "Kein Handlungsbedarf",
          description: "Alle Artikel sind ausreichend auf Lager.",
        })
      }
    } catch (error) {
      console.error("Error generating suggestions:", error)
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Vorschläge konnten nicht generiert werden.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
        setSuggestions(null);
        setIsLoading(false);
    }, 300);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Automatische Bestellvorschläge</DialogTitle>
          <DialogDescription>
            Lassen Sie die KI basierend auf Mindestbeständen und Verbrauchsdaten Bestellvorschläge generieren.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">KI analysiert Lagerbestände...</p>
          </div>
        ) : suggestions ? (
           suggestions.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Artikel</TableHead>
                            <TableHead>Menge</TableHead>
                            <TableHead>Grund</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suggestions.map(s => (
                            <TableRow key={s.itemId}>
                                <TableCell>{s.itemName}</TableCell>
                                <TableCell>{s.quantityToOrder} {s.unit}</TableCell>
                                <TableCell>{s.reason}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
           ) : (
            <div className="flex flex-col items-center justify-center h-64">
                <Bot className="h-16 w-16 text-green-500" />
                <p className="mt-4 text-muted-foreground font-medium">Alles im grünen Bereich!</p>
                <p className="text-sm text-muted-foreground">Aktuell sind keine Bestellungen notwendig.</p>
            </div>
           )
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <Bot className="h-16 w-16 text-primary" />
            <p className="mt-4 text-muted-foreground">Bereit für die Analyse.</p>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Schließen
          </Button>
          <Button onClick={handleGenerateSuggestions} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
            {suggestions ? "Erneut generieren" : "Jetzt generieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
