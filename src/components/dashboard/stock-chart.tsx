"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { mockItems } from "@/lib/data"
import { formatCurrency } from "@/lib/utils"
import { ChartTooltipContent } from "@/components/ui/chart"

const chartData = mockItems
    .map(item => ({ name: item.name, value: item.quantity * item.price }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

export function StockChart() {
  return (
    <div className="h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(value as number)}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip 
             cursor={{fill: 'hsl(var(--muted))'}}
             content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
          />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
