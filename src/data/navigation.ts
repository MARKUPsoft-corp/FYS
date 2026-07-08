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
    path: '/',
    icon: Home,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: true,
  },
  {
    key: 'catalogue',
    label: 'Catalogue',
    path: '/catalogue',
    icon: GlassWater,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: true,
  },
  {
    key: 'my-cocktails',
    label: 'Mes cocktails',
    path: '/cocktails',
    icon: FlaskConical,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: true,
  },
  {
    key: 'my-orders',
    label: 'Mes commandes',
    path: '/orders',
    icon: ShoppingBag,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: true,
  },
  {
    key: 'profile',
    label: 'Profil santé',
    path: '/profile',
    icon: HeartPulse,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: false,
  },

  // ── Admin ─────────────────────────────────────────────
  {
    key: 'admin-home',
    label: 'Tableau de bord',
    path: '/',
    icon: LayoutDashboard,
    roles: [UserRole.ADMIN],
    showInMobileTab: true,
  },
  {
    key: 'fruits',
    label: 'Fruits',
    path: '/fruits',
    icon: Apple,
    roles: [UserRole.ADMIN],
    showInMobileTab: true,
  },
  {
    key: 'categories',
    label: 'Catégories',
    path: '/categories',
    icon: Tag,
    roles: [UserRole.ADMIN],
    showInMobileTab: false,
  },
  {
    key: 'admin-cocktails',
    label: 'Cocktails',
    path: '/cocktails',
    icon: GlassWater,
    roles: [UserRole.ADMIN],
    showInMobileTab: true,
  },
  {
    key: 'admin-orders',
    label: 'Commandes',
    path: '/orders',
    icon: ShoppingBag,
    roles: [UserRole.ADMIN],
    showInMobileTab: true,
  },
  {
    key: 'users',
    label: 'Utilisateurs',
    path: '/users',
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
