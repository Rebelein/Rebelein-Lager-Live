import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, Euro } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type StatsCardsProps = {
  totalItems: number;
  itemsBelowMinStock: number;
  totalStockValue: number;
};

export function StatsCards({ totalItems, itemsBelowMinStock, totalStockValue }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Artikel Gesamt</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalItems}</div>
          <p className="text-xs text-muted-foreground">Anzahl der einzigartigen Artikel</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Kritischer Bestand</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{itemsBelowMinStock}</div>
          <p className="text-xs text-muted-foreground">Artikel unter Mindestbestand</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gesamtwert Lager</CardTitle>
          <Euro className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalStockValue)}</div>
          <p className="text-xs text-muted-foreground">Summe der Artikelwerte</p>
        </CardContent>
      </Card>
    </div>
  );
}
