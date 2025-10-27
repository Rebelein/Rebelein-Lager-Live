import { describe, it, expect } from 'vitest';
import { getChangeLogActionText } from './utils';
import type { ChangeLogEntry } from './types';

describe('getChangeLogActionText', () => {
  it('sollte "Zugang" für den Typ "in" zurückgeben', () => {
    const log = { type: 'in' } as ChangeLogEntry;
    expect(getChangeLogActionText(log)).toBe('Zugang');
  });

  it('sollte "Abgang" für den Typ "out" zurückgeben', () => {
    const log = { type: 'out' } as ChangeLogEntry;
    expect(getChangeLogActionText(log)).toBe('Abgang');
  });

  it('sollte "Artikel erstellt" für den Typ "initial" zurückgeben', () => {
    const log = { type: 'initial' } as ChangeLogEntry;
    expect(getChangeLogActionText(log)).toBe('Artikel erstellt');
  });

  it('sollte "Nachbestellung angeordnet" für den Typ "reorder-arranged" zurückgeben', () => {
    const log = { type: 'reorder-arranged' } as ChangeLogEntry;
    expect(getChangeLogActionText(log)).toBe('Nachbestellung angeordnet');
  });

  it('sollte "Nachbestellt" für den Typ "reordered" zurückgeben', () => {
    const log = { type: 'reordered' } as ChangeLogEntry;
    expect(getChangeLogActionText(log)).toBe('Nachbestellt');
  });

  it('sollte "Bestellung storniert" für den Typ "reorder-cancelled" zurückgeben', () => {
    const log = { type: 'reorder-cancelled' } as ChangeLogEntry;
    expect(getChangeLogActionText(log)).toBe('Bestellung storniert');
  });

  it('sollte "Lieferung erhalten" für den Typ "received" zurückgeben', () => {
    const log = { type: 'received' } as ChangeLogEntry;
    expect(getChangeLogActionText(log)).toBe('Lieferung erhalten');
  });

  it('sollte "Bearbeitet" für den Typ "update" zurückgeben', () => {
    const log = { type: 'update' } as ChangeLogEntry;
    expect(getChangeLogActionText(log)).toBe('Bearbeitet');
  });

  it('sollte "Inventur" für den Typ "inventory" zurückgeben', () => {
    const log = { type: 'inventory' } as ChangeLogEntry;
    expect(getChangeLogActionText(log)).toBe('Inventur');
  });

  it('sollte "Umgelagert" für den Typ "transfer" zurückgeben', () => {
    const log = { type: 'transfer' } as ChangeLogEntry;
    expect(getChangeLogActionText(log)).toBe('Umgelagert');
  });

  it('sollte "Etikett gedruckt" für den Typ "label-printed" zurückgeben', () => {
    const log = { type: 'label-printed' } as ChangeLogEntry;
    expect(getChangeLogActionText(log)).toBe('Etikett gedruckt');
  });

  it('sollte "Unbekannt" für einen unbekannten Typ zurückgeben', () => {
    const log = { type: 'unknown-type' } as unknown as ChangeLogEntry;
    expect(getChangeLogActionText(log)).toBe('Unbekannt');
  });
});

import { getInventoryStatusColor, getInventoryStatusClass } from './utils';

describe('getInventoryStatusColor', () => {
  it('sollte Rot zurückgeben, wenn lastInventoriedAt null oder undefiniert ist', () => {
    expect(getInventoryStatusColor(null)).toBe('hsl(var(--destructive))');
    expect(getInventoryStatusColor(undefined)).toBe('hsl(var(--destructive))');
  });

  it('sollte Grün zurückgeben, wenn die letzte Inventur innerhalb der letzten 7 Tage stattgefunden hat', () => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    expect(getInventoryStatusColor(date.toISOString())).toBe('hsl(var(--chart-2))');
  });

  it('sollte Gelb zurückgeben, wenn die letzte Inventur vor 8-30 Tagen stattgefunden hat', () => {
    const date = new Date();
    date.setDate(date.getDate() - 15);
    expect(getInventoryStatusColor(date.toISOString())).toBe('hsl(var(--chart-3))');
  });

  it('sollte Rot zurückgeben, wenn die letzte Inventur vor mehr als 30 Tagen stattgefunden hat', () => {
    const date = new Date();
    date.setDate(date.getDate() - 31);
    expect(getInventoryStatusColor(date.toISOString())).toBe('hsl(var(--destructive))');
  });
});

describe('getInventoryStatusClass', () => {
  it('sollte "border-red-500" zurückgeben, wenn lastInventoriedAt null oder undefiniert ist', () => {
    expect(getInventoryStatusClass(null)).toBe('border-red-500');
    expect(getInventoryStatusClass(undefined)).toBe('border-red-500');
  });

  it('sollte "border-green-500" zurückgeben, wenn die letzte Inventur innerhalb der letzten 7 Tage stattgefunden hat', () => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    expect(getInventoryStatusClass(date.toISOString())).toBe('border-green-500');
  });

  it('sollte "border-yellow-500" zurückgeben, wenn die letzte Inventur vor 8-30 Tagen stattgefunden hat', () => {
    const date = new Date();
    date.setDate(date.getDate() - 15);
    expect(getInventoryStatusClass(date.toISOString())).toBe('border-yellow-500');
  });

  it('sollte "border-red-500" zurückgeben, wenn die letzte Inventur vor mehr als 30 Tagen stattgefunden hat', () => {
    const date = new Date();
    date.setDate(date.getDate() - 31);
    expect(getInventoryStatusClass(date.toISOString())).toBe('border-red-500');
  });
});

import { getOrderStatusBadgeVariant, getOrderStatusText } from './utils';

describe('getOrderStatusBadgeVariant', () => {
  it('sollte "outline" für den Status "draft" zurückgeben', () => {
    expect(getOrderStatusBadgeVariant('draft')).toBe('outline');
  });

  it('sollte "secondary" für den Status "ordered" zurückgeben', () => {
    expect(getOrderStatusBadgeVariant('ordered')).toBe('secondary');
  });

  it('sollte "default" für den Status "partially-received" zurückgeben', () => {
    expect(getOrderStatusBadgeVariant('partially-received')).toBe('default');
  });

  it('sollte "default" für den Status "partially-commissioned" zurückgeben', () => {
    expect(getOrderStatusBadgeVariant('partially-commissioned')).toBe('default');
  });

  it('sollte "default" für den Status "received" zurückgeben', () => {
    expect(getOrderStatusBadgeVariant('received')).toBe('default');
  });

  it('sollte "outline" für einen unbekannten Status zurückgeben', () => {
    expect(getOrderStatusBadgeVariant('unknown' as any)).toBe('outline');
  });
});

describe('getOrderStatusText', () => {
  it('sollte "In Vorbereitung" für den Status "draft" zurückgeben', () => {
    expect(getOrderStatusText('draft')).toBe('In Vorbereitung');
  });

  it('sollte "Bestellt" für den Status "ordered" zurückgeben', () => {
    expect(getOrderStatusText('ordered')).toBe('Bestellt');
  });

  it('sollte "Teilweise erhalten" für den Status "partially-received" zurückgeben', () => {
    expect(getOrderStatusText('partially-received')).toBe('Teilweise erhalten');
  });

  it('sollte "Teilweise kommissioniert" für den Status "partially-commissioned" zurückgeben', () => {
    expect(getOrderStatusText('partially-commissioned')).toBe('Teilweise kommissioniert');
  });

  it('sollte "Vollständig erhalten" für den Status "received" zurückgeben', () => {
    expect(getOrderStatusText('received')).toBe('Vollständig erhalten');
  });

  it('sollte "Unbekannt" für einen unbekannten Status zurückgeben', () => {
    expect(getOrderStatusText('unknown' as any)).toBe('Unbekannt');
  });
});

import { isInventoryItem, isMachine } from './utils';
import type { InventoryItem, Machine } from './types';

describe('isInventoryItem', () => {
  it('sollte true zurückgeben, wenn das Element ein InventoryItem ist', () => {
    const item = { itemType: 'item' } as InventoryItem;
    expect(isInventoryItem(item)).toBe(true);
  });

  it('sollte false zurückgeben, wenn das Element eine Machine ist', () => {
    const item = { itemType: 'machine' } as Machine;
    expect(isInventoryItem(item)).toBe(false);
  });

  it('sollte false für null oder undefinierte Eingaben zurückgeben', () => {
    expect(isInventoryItem(null)).toBe(false);
    expect(isInventoryItem(undefined)).toBe(false);
  });
});

describe('isMachine', () => {
  it('sollte true zurückgeben, wenn das Element eine Machine ist', () => {
    const item = { itemType: 'machine' } as Machine;
    expect(isMachine(item)).toBe(true);
  });

  it('sollte false zurückgeben, wenn das Element ein InventoryItem ist', () => {
    const item = { itemType: 'item' } as InventoryItem;
    expect(isMachine(item)).toBe(false);
  });

  it('sollte false für null oder undefinierte Eingaben zurückgeben', () => {
    expect(isMachine(null)).toBe(false);
    expect(isMachine(undefined)).toBe(false);
  });
});
