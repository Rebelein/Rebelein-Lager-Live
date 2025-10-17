import type { User, Item, HistoryEntry } from './types';
import { PlaceHolderImages } from './placeholder-images';

const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar');

export const mockUser: User = {
  name: 'Max Mustermann',
  email: 'max.mustermann@example.com',
  avatarUrl: userAvatar?.imageUrl || 'https://picsum.photos/seed/1/100/100',
};

export const mockItems: Item[] = [
  {
    id: 'ITM001',
    name: 'Photonen-Schraubenzieher',
    description: 'Schraubenzieher mit Phasen-Kalibrierung für interdimensionale Schrauben.',
    location: 'Regal A-1',
    quantity: 50,
    minimumStock: 10,
    consumptionRate: 5,
    unit: 'Stk',
    price: 120.50,
    barcode: '1234567890123',
  },
  {
    id: 'ITM002',
    name: 'Quanten-Karabiner',
    description: 'Hält alles zusammen, auch wenn es an zwei Orten gleichzeitig ist.',
    location: 'Regal B-3',
    quantity: 8,
    minimumStock: 5,
    consumptionRate: 2,
    unit: 'Stk',
    price: 75.00,
    barcode: '2345678901234',
  },
  {
    id: 'ITM003',
    name: 'Plasmabrenner-Kartusche',
    description: 'Nachfüllkartusche für Plasmabrenner. Extra heiß.',
    location: 'Gefahrgut C-2',
    quantity: 30,
    minimumStock: 15,
    consumptionRate: 10,
    unit: 'Stk',
    price: 45.99,
    barcode: '3456789012345',
  },
  {
    id: 'ITM004',
    name: 'Anti-Grav-Stiefel (Paar)',
    description: 'Für Arbeiten an der Decke oder in schwerelosen Umgebungen.',
    location: 'Ausrüstung D-5',
    quantity: 12,
    minimumStock: 4,
    consumptionRate: 1,
    unit: 'Paar',
    price: 899.99,
    barcode: '4567890123456',
  },
  {
    id: 'ITM005',
    name: 'Nanobot-Reparatur-Gel',
    description: 'Selbstreplizierendes Gel zur schnellen Reparatur von Maschinen.',
    location: 'Labor E-1',
    quantity: 100,
    minimumStock: 25,
    consumptionRate: 8,
    unit: 'ml',
    price: 5.50,
    barcode: '5678901234567',
  },
  {
    id: 'ITM006',
    name: 'Warp-Kern-Stabilisator',
    description: 'Verhindert, dass die Realität auseinanderfällt. Wichtig.',
    location: 'Sicherheitslager S-1',
    quantity: 3,
    minimumStock: 2,
    consumptionRate: 0.5,
    unit: 'Stk',
    price: 15000.00,
    barcode: '6789012345678',
  },
];

export const mockHistory: HistoryEntry[] = [
    {
        id: 'HIST001',
        itemId: 'ITM001',
        itemName: 'Photonen-Schraubenzieher',
        change: 10,
        newQuantity: 50,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        user: 'System',
    },
    {
        id: 'HIST002',
        itemId: 'ITM002',
        itemName: 'Quanten-Karabiner',
        change: -2,
        newQuantity: 8,
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        user: 'Max Mustermann',
    },
     {
        id: 'HIST003',
        itemId: 'ITM006',
        itemName: 'Warp-Kern-Stabilisator',
        change: 1,
        newQuantity: 3,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        user: 'System',
    }
];
