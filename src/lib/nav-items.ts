
import { Settings, BarChartHorizontal, Package, Wrench, ShoppingCart, History, ClipboardCheck, Printer, LineChart, FileDown, Building, Warehouse, ScrollText, type LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export const navItems: NavItem[] = [
  { href: '/dashboard', icon: BarChartHorizontal, label: 'Dashboard' },
  { href: '/inventory-list', icon: Package, label: 'Lagerbestand' },
  { href: '/machines', icon: Wrench, label: 'Maschinen' },
  { href: '/orders', icon: ShoppingCart, label: 'Bestellungen' },
  { href: '/order-history', icon: History, label: 'Bestellverlauf' },
  { href: '/inventory', icon: ClipboardCheck, label: 'Inventur' },
  { href: '/labels', icon: Printer, label: 'Etiketten' },
  { href: '/analysis', icon: LineChart, label: 'Analyse' },
  { href: '/export', icon: FileDown, label: 'Exporte' },
  { href: '/wholesalers', icon: Building, label: 'Großhändler' },
  { href: '/locations', icon: Warehouse, label: 'Lagerorte' },
  { href: '/changelog', icon: ScrollText, label: 'Changelog' },
  { href: '/settings', icon: Settings, label: 'Einstellungen' },
];
