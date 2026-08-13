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
  Wallet,
  Image,
  CreditCard,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { UserRole } from '@/entities';

export type NavItem = {
  key: string;
  label: string;
  labelKey: string;
  path: string;
  icon: LucideIcon;
  roles: UserRole[];
  showInMobileTab: boolean;
  showInDesktopNav?: boolean; // default: true
};

export const NAV_ITEMS: NavItem[] = [
  // ── Customer ──────────────────────────────────────────
  {
    key: 'customer-home',
    label: 'Accueil',
    labelKey: 'nav.home',
    path: '/board',
    icon: Home,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: true,
  },
  {
    key: 'fys-lab',
    label: 'FYS Lab',
    labelKey: 'nav.fys-lab',
    path: '/lab',
    icon: FlaskConical,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: true,
  },
  {
    key: 'catalogue',
    label: 'Catalogue',
    labelKey: 'nav.catalogue',
    path: '/board/catalogue',
    icon: GlassWater,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: true,
  },
  {
    key: 'my-orders',
    label: 'Commandes',
    labelKey: 'nav.orders',
    path: '/board/orders',
    icon: ShoppingBag,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: true,
  },

  {
    key: 'profile',
    label: 'Profil santé',
    labelKey: 'nav.profile',
    path: '/board/profile',
    icon: HeartPulse,
    roles: [UserRole.CUSTOMER],
    showInMobileTab: false,
  },

  // ── Admin ─────────────────────────────────────────────
  {
    key: 'admin-home',
    label: 'Tableau de bord',
    labelKey: 'nav.dashboard',
    path: '/board',
    icon: LayoutDashboard,
    roles: [UserRole.ADMIN],
    showInMobileTab: true,
  },
  {
    key: 'fruits',
    label: 'Fruits',
    labelKey: 'nav.fruits',
    path: '/board/fruits',
    icon: Apple,
    roles: [UserRole.ADMIN],
    showInMobileTab: true,
  },
  {
    key: 'categories',
    label: 'Catégories',
    labelKey: 'nav.categories',
    path: '/board/categories',
    icon: Tag,
    roles: [UserRole.ADMIN],
    showInMobileTab: false,
  },
  {
    key: 'admin-catalogue',
    label: 'Catalogue',
    labelKey: 'nav.catalogue',
    path: '/board/catalogue',
    icon: GlassWater,
    roles: [UserRole.ADMIN],
    showInMobileTab: true,
  },
  {
    key: 'admin-cocktails',
    label: 'Cocktails',
    labelKey: 'nav.cocktails',
    path: '/board/cocktails',
    icon: FlaskConical,
    roles: [UserRole.ADMIN],
    showInMobileTab: false,
  },
  {
    key: 'admin-orders',
    label: 'Commandes',
    labelKey: 'nav.orders',
    path: '/board/orders',
    icon: ShoppingBag,
    roles: [UserRole.ADMIN],
    showInMobileTab: true,
  },
  {
    key: 'pricing',
    label: 'Tarifs',
    labelKey: 'nav.pricing',
    path: '/board/pricing',
    icon: Wallet,
    roles: [UserRole.ADMIN],
    showInMobileTab: false,
    showInDesktopNav: false,
  },
  {
    key: 'hero-slides',
    label: 'Hero',
    labelKey: 'nav.hero',
    path: '/board/hero',
    icon: Image,
    roles: [UserRole.ADMIN],
    showInMobileTab: false,
    showInDesktopNav: false,
  },
  {
    key: 'users',
    label: 'Utilisateurs',
    labelKey: 'nav.users',
    path: '/board/users',
    icon: Users,
    roles: [UserRole.ADMIN],
    showInMobileTab: false,
  },
  {
    key: 'payments',
    label: 'Paiements',
    labelKey: 'nav.payments',
    path: '/board/payments',
    icon: CreditCard,
    roles: [UserRole.ADMIN],
    showInMobileTab: false,
    showInDesktopNav: false,
  },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role) && item.showInDesktopNav !== false);
}

export function getMobileNavItems(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role) && item.showInMobileTab);
}

/** Navigation publique (sans connexion) : accueil, lab, catalogue */
export function getGuestNavItems(): NavItem[] {
  return NAV_ITEMS.filter(
    (item) =>
      item.roles.includes(UserRole.CUSTOMER) &&
      ['/board', '/lab', '/board/catalogue'].includes(item.path),
  );
}
