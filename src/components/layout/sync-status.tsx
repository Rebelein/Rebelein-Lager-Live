
'use client';

import * as React from 'react';
import { CheckCircle, RefreshCw, AlertTriangle, WifiOff } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type DbConnectionStatus = 'connecting' | 'connected' | 'error';

interface SyncStatusProps {
    status: DbConnectionStatus;
}

export function SyncStatus({ status }: SyncStatusProps) {
    const getStatusInfo = () => {
        switch (status) {
            case 'connected':
                return {
                    Icon: CheckCircle,
                    color: 'text-green-500',
                    tooltip: 'Daten sind synchronisiert',
                    animate: false,
                };
            case 'connecting':
                return {
                    Icon: RefreshCw,
                    color: 'text-yellow-500',
                    tooltip: 'Daten werden synchronisiert...',
                    animate: true,
                };
            case 'error':
                 return {
                    Icon: WifiOff,
                    color: 'text-destructive',
                    tooltip: 'Keine Datenbankverbindung. Änderungen sind nicht möglich.',
                    animate: false,
                };
            default:
                return {
                    Icon: AlertTriangle,
                    color: 'text-muted-foreground',
                    tooltip: 'Unbekannter Status',
                    animate: false,
                };
        }
    };

    const { Icon, color, tooltip, animate } = getStatusInfo();

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center justify-center h-8 w-8">
                        <Icon className={cn('h-5 w-5', color, animate && 'animate-spin')} />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
