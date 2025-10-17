"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { HistoryEntry } from "@/lib/types";

type HistoryTableProps = {
  history: HistoryEntry[];
};

export function HistoryTable({ history }: HistoryTableProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Artikel</TableHead>
            <TableHead>Änderung</TableHead>
            <TableHead>Neuer Bestand</TableHead>
            <TableHead className="hidden sm:table-cell">Benutzer</TableHead>
            <TableHead className="text-right">Datum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-medium">{entry.itemName}</TableCell>
              <TableCell>
                <Badge variant={entry.change > 0 ? "default" : "secondary"} className={entry.change > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}>
                  {entry.change > 0 ? `+${entry.change}` : entry.change}
                </Badge>
              </TableCell>
              <TableCell>{entry.newQuantity}</TableCell>
              <TableCell className="hidden sm:table-cell">{entry.user}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {new Date(entry.timestamp).toLocaleString("de-DE", {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {history.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
                Keine Einträge in der Historie.
            </div>
        )}
    </div>
  );
}
