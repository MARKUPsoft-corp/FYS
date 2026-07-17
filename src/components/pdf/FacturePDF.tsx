import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Order } from '@/entities/order';
import { OrderStatus } from '@/entities/order';

// ── Palette ────────────────────────────────────────────────────────────────
const PRIMARY   = '#16A34A'; // green-600
const MUTED     = '#6B7280'; // gray-500
const BORDER    = '#E5E7EB'; // gray-200
const BGCARD    = '#F9FAFB'; // gray-50
const TEXT      = '#111827'; // gray-900
const WHITE     = '#FFFFFF';

// Status badges
const STATUS_COLOR: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  [OrderStatus.PENDING]:   { bg: '#FEF9C3', text: '#854D0E', label: 'En attente' },
  [OrderStatus.CONFIRMED]: { bg: '#DBEAFE', text: '#1E40AF', label: 'Confirmée'  },
  [OrderStatus.PREPARING]: { bg: '#FEF3C7', text: '#92400E', label: 'En préparation' },
  [OrderStatus.READY]:     { bg: '#D1FAE5', text: '#065F46', label: 'Prête' },
  [OrderStatus.DELIVERED]: { bg: '#DCFCE7', text: '#15803D', label: 'Livrée' },
  [OrderStatus.CANCELLED]: { bg: '#FEE2E2', text: '#991B1B', label: 'Annulée' },
};

const s = StyleSheet.create({
  page:   { fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: WHITE, padding: 40 },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  brand:  { fontSize: 28, fontFamily: 'Helvetica-Bold', color: PRIMARY, letterSpacing: -1 },
  dot:    { color: '#22D3EE' },
  tagline:{ fontSize: 9, color: MUTED, marginTop: 2 },
  // Meta block (right)
  meta:   { alignItems: 'flex-end' },
  metaTitle:{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: TEXT, marginBottom: 4 },
  metaRef:  { fontSize: 8, color: MUTED },
  // Status badge
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 6 },
  badgeText:{ fontSize: 8, fontFamily: 'Helvetica-Bold' },
  // Divider
  divider:  { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 20 },
  // Section title
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  // Card
  card:     { backgroundColor: BGCARD, borderRadius: 8, padding: 14, marginBottom: 16 },
  // Row
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rowLast:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:    { fontSize: 10, color: MUTED },
  value:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: TEXT },
  // Total row
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 8, padding: 12, marginTop: 8 },
  totalLabel:{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: TEXT },
  totalValue:{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: PRIMARY },
  // Address block
  addrRow:  { flexDirection: 'row', marginBottom: 6 },
  addrKey:  { fontSize: 9, color: MUTED, width: 90 },
  addrVal:  { fontSize: 9, fontFamily: 'Helvetica-Bold', color: TEXT, flex: 1 },
  // Col 2 layout
  cols:     { flexDirection: 'row', gap: 12 },
  col:      { flex: 1 },
  // Footer
  footer:   { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText:{ fontSize: 8, color: MUTED },
});

interface Props {
  order: Order;
  ingredientsStr?: string;
}

export function FacturePDF({ order, ingredientsStr }: Props) {
  const statusCfg = STATUS_COLOR[order.status];
  const createdDate = order.createdAt?.toDate?.();
  const dateStr = createdDate
    ? createdDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const subtotal = order.cocktailPriceSnapshot * order.quantity;

  return (
    <Document title={`Facture — ${order.id}`} author="NutriFYS">
      <Page size="A4" style={s.page}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>FYS<Text style={s.dot}>.</Text></Text>
            <Text style={s.tagline}>NutriFYS — Votre Partenaire Santé</Text>
          </View>
          <View style={s.meta}>
            <Text style={s.metaTitle}>FACTURE</Text>
            <Text style={s.metaRef}>N° {order.id.toUpperCase().slice(0, 8)}</Text>
            <Text style={s.metaRef}>Émise le {dateStr}</Text>
            <View style={[s.badge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[s.badgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Client & Livraison ─────────────────────────────────────── */}
        <View style={s.cols}>
          <View style={s.col}>
            <Text style={s.sectionTitle}>Client</Text>
            <View style={s.card}>
              <Text style={[s.value, { marginBottom: 4 }]}>{order.userNameSnapshot}</Text>
              <Text style={s.label}>{order.userEmailSnapshot}</Text>
              {order.userPhoneSnapshot && <Text style={[s.label, { marginTop: 2 }]}>{order.userPhoneSnapshot}</Text>}
            </View>
          </View>
          {order.deliveryDetails && (
            <View style={s.col}>
              <Text style={s.sectionTitle}>Livraison</Text>
              <View style={s.card}>
                <View style={s.addrRow}>
                  <Text style={s.addrKey}>Quartier</Text>
                  <Text style={s.addrVal}>{order.deliveryDetails.district}</Text>
                </View>
                <View style={s.addrRow}>
                  <Text style={s.addrKey}>Téléphone</Text>
                  <Text style={s.addrVal}>{order.deliveryDetails.phone}</Text>
                </View>
                {order.deliveryDetails.instructions && (
                  <View style={s.addrRow}>
                    <Text style={s.addrKey}>Indications</Text>
                    <Text style={s.addrVal}>{order.deliveryDetails.instructions}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* ── Commande ───────────────────────────────────────────────── */}
        <Text style={[s.sectionTitle, { marginTop: 8 }]}>Détail de la commande</Text>
        <View style={s.card}>
          {/* Table header */}
          <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 6, marginBottom: 8 }]}>
            <Text style={[s.label, { fontSize: 8, textTransform: 'uppercase' }]}>Produit</Text>
            <Text style={[s.label, { fontSize: 8, textTransform: 'uppercase' }]}>Qté</Text>
            <Text style={[s.label, { fontSize: 8, textTransform: 'uppercase' }]}>P.U.</Text>
            <Text style={[s.label, { fontSize: 8, textTransform: 'uppercase' }]}>Total</Text>
          </View>
          {/* Product row */}
          <View style={[s.row, { marginBottom: 2 }]}>
            <Text style={[s.value, { flex: 2 }]}>{order.cocktailNameSnapshot}</Text>

            <Text style={[s.value, { width: 30, textAlign: 'center' }]}>{order.quantity}</Text>
            <Text style={[s.value, { width: 70, textAlign: 'right' }]}>{order.cocktailPriceSnapshot.toLocaleString()} XAF</Text>
            <Text style={[s.value, { width: 80, textAlign: 'right' }]}>{subtotal.toLocaleString()} XAF</Text>
          </View>
          {/* Fruits details */}
          {ingredientsStr && (
            <View style={s.row}>
               <Text style={[s.label, { flex: 2, fontSize: 8, fontStyle: 'italic' }]}>
                 Composition : {ingredientsStr}
               </Text>
               <Text style={{ width: 30 }}></Text>
               <Text style={{ width: 70 }}></Text>
               <Text style={{ width: 80 }}></Text>
            </View>
          )}
        </View>

        {/* ── Totaux ─────────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Récapitulatif</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.label}>Sous-total</Text>
            <Text style={s.value}>{subtotal.toLocaleString()} XAF</Text>
          </View>
          <View style={s.rowLast}>
            <Text style={s.label}>Livraison</Text>
            <Text style={s.value}>{order.deliveryFee.toLocaleString()} XAF</Text>
          </View>
        </View>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>TOTAL</Text>
          <Text style={s.totalValue}>{order.totalPrice.toLocaleString()} XAF</Text>
        </View>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <View style={s.footer}>
          <Text style={s.footerText}>NutriFYS — votre santé, notre priorité 🌿</Text>
          <Text style={s.footerText}>Merci de votre confiance !</Text>
        </View>
      </Page>
    </Document>
  );
}
