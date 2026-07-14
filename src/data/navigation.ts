import {
  Home,
  LayoutDashboard,
  GlassWater,
  FlaskConical,
  ShoppingBag,
  HeartPulse,
  Apple,
  Tag,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { UserRole } from '@/entities';

export type NavItem = {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  roles: UserRole[];
  showInMobileTab: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  // ── Customer ──────────────────────────────────────────
  {
    key: 'customer-home',
    label: 'Accueil',
    path: '/board',
    icon: Home,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: true,
  },
  {
    key: 'catalogue',
    label: 'Catalogue',
    path: '/board/catalogue',
    icon: GlassWater,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: true,
  },
  {
    key: 'my-cocktails',
    label: 'Mes cocktails',
    path: '/board/cocktails',
    icon: FlaskConical,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: true,
  },
  {
    key: 'my-orders',
    label: 'Mes commandes',
    path: '/board/orders',
    icon: ShoppingBag,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: true,
  },
  {
    key: 'profile',
    label: 'Profil santé',
    path: '/board/profile',
    icon: HeartPulse,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: false,
  },

  // ── Admin ─────────────────────────────────────────────
  {
    key: 'admin-home',
    label: 'Tableau de bord',
    path: '/board',
    icon: LayoutDashboard,
    roles: [UserRole.ADMIN],
    showInMobileTab: true,
  },
  {
    key: 'fruits',
    label: 'Fruits',
    path: '/board/fruits',
    icon: Apple,
    roles: [UserRole.ADMIN],
    showInMobileTab: true,
  },
  {
    key: 'categories',
    label: 'Catégories',
    path: '/board/categories',
    icon: Tag,
    roles: [UserRole.ADMIN],
    showInMobileTab: false,
  },
  {
    key: 'admin-catalogue',
    label: 'Catalogue',
    path: '/board/catalogue',
    icon: GlassWater,
    roles: [UserRole.ADMIN],
    showInMobileTab: true,
  },
  {
    key: 'admin-orders',
    label: 'Commandes',
    path: '/board/orders',
    icon: ShoppingBag,
    roles: [UserRole.ADMIN],
    showInMobileTab: true,
  },
  {
    key: 'users',
    label: 'Utilisateurs',
    path: '/board/users',
    icon: Users,
    roles: [UserRole.ADMIN],
    showInMobileTab: false,
  },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function getMobileNavItems(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role) && item.showInMobileTab);
}
