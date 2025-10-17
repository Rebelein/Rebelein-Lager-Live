import { AppLayout } from "@/components/app-layout";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { StockChart } from "@/components/dashboard/stock-chart";
import { mockItems } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const totalItems = mockItems.length;
  const itemsBelowMinStock = mockItems.filter(item => item.quantity < item.minimumStock).length;
  const totalStockValue = mockItems.reduce((acc, item) => acc + item.quantity * item.price, 0);

  return (
    <AppLayout>
      <main className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Dashboard</h1>
        <StatsCards
          totalItems={totalItems}
          itemsBelowMinStock={itemsBelowMinStock}
          totalStockValue={totalStockValue}
        />
        <div className="mt-8">
            <Card>
                <CardHeader>
                    <CardTitle>Wertvollste Artikel im Lager</CardTitle>
                </CardHeader>
                <CardContent>
                    <StockChart />
                </CardContent>
            </Card>
        </div>
      </main>
    </AppLayout>
  );
}
