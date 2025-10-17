"use client"

import { useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { HistoryTable } from '@/components/history/history-table';
import { mockHistory } from '@/lib/data';
import type { HistoryEntry } from '@/lib/types';

export default function HistoryPage() {
    const [history] = useState<HistoryEntry[]>(mockHistory);

    return (
        <AppLayout>
            <main className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-3xl font-bold tracking-tight mb-6">Lagerbewegungshistorie</h1>
                <HistoryTable history={history} />
            </main>
        </AppLayout>
    );
}
