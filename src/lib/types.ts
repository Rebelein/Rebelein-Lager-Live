export type Item = {
  id: string;
  name: string;
  description: string;
  location: string;
  quantity: number;
  minimumStock: number;
  consumptionRate: number; // units per week
  unit: string; // e.g., 'pcs', 'kg', 'box'
  price: number;
  barcode: string;
};

export type HistoryEntry = {
  id: string;
  itemId: string;
  itemName: string;
  change: number; // positive for addition, negative for removal
  newQuantity: number;
  timestamp: string; // ISO string
  user: string;
};

export type User = {
  name: string;
  email: string;
  avatarUrl: string;
};
