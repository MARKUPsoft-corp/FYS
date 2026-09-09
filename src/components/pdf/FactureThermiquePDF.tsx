import i18n from '@/i18n';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Order } from '@/entities/order';
import { OrderStatus } from '@/entities/order';

function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]:   i18n.t('orders.pending'),
    [OrderStatus.CONFIRMED]: i18n.t('orders.confirmed'),
    [OrderStatus.PREPARING]: i18n.t('orders.preparing'),
    [OrderStatus.READY]:     i18n.t('orders.ready'),
    [OrderStatus.DELIVERED]: i18n.t('orders.delivered'),
    [OrderStatus.CANCELLED]: i18n.t('orders.canceled'),
  };
  return labels[status] || status;
}

/**
 * Calcule la hauteur exacte nécessaire en points pour le rouleau continu 58mm.
 * 1 point = 1/72 inch. Largeur 58mm = ~164 points.
 */
export function calculateTicketHeight(order: Order, ingredientsStr?: string): number {
  let h = 250; // en-tête, métadonnées, totaux, pied de page
  const lineCount = order.orderLines?.length || 1;
  h += lineCount * 26;
  if (ingredientsStr) h += 20;
  if (order.hasAddedSugar !== undefined) h += 14;
  if (order.discountAmount && order.discountAmount > 0) h += 16;
  if (order.deliveryDetails?.district) h += 16;
  if (order.deliveryDetails?.instructions) h += 20;
  return Math.max(320, Math.ceil(h));
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 10,
    width: 164,
  },
  center: {
    alignItems: 'center',
    textAlign: 'center',
  },
  brand: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 6,
    fontFamily: 'Helvetica',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  dividerDashed: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    borderBottomStyle: 'dashed',
    marginVertical: 4,
  },
  dividerSolid: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    marginVertical: 4,
  },
  dividerDouble: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
    marginVertical: 5,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica',
  },
  metaValue: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 2,
    marginBottom: 3,
  },
  colProduct: {
    flex: 1,
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  colQty: {
    width: 20,
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  colTotal: {
    width: 44,
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  itemName: {
    flex: 1,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  itemQty: {
    width: 20,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  itemTotal: {
    width: 44,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  itemSubline: {
    fontSize: 6,
    fontFamily: 'Helvetica',
    marginBottom: 2,
    paddingLeft: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  totalLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica',
  },
  totalVal: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
    paddingVertical: 3,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  grandTotalLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalValue: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  footer: {
    alignItems: 'center',
    textAlign: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: 6,
    fontFamily: 'Helvetica',
    textAlign: 'center',
    marginBottom: 1.5,
  },
  footerTextBold: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 2,
  },
});

interface Props {
  order: Order;
  ingredientsStr?: string;
}

export function FactureThermiquePDF({ order, ingredientsStr }: Props) {
  const statusLabel = getStatusLabel(order.status);
  const createdDate = order.createdAt?.toDate?.();
  const dateStr = createdDate
    ? createdDate.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const subtotal = order.orderLines?.length
    ? order.orderLines.reduce((sum, line) => sum + line.lineTotal, 0)
    : (order.cocktailPriceSnapshot || 0) * (order.quantity || 0);

  const pageHeight = calculateTicketHeight(order, ingredientsStr);

  return (
    <Document title={`Ticket_${order.id.slice(0, 8)}`} author="NutriFYS">
      <Page size={[164, pageHeight]} style={s.page}>
        {/* ── Brand Header ────────────────────────────────────────── */}
        <View style={s.center}>
          <Text style={s.brand}>FYS.</Text>
          <Text style={s.tagline}>FRESH JUICES & COCKTAILS</Text>
        </View>

        <View style={s.dividerDashed} />

        {/* ── Métadonnées du Ticket ───────────────────────────────── */}
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>TICKET N°</Text>
          <Text style={s.metaValue}>#{order.id.toUpperCase().slice(0, 8)}</Text>
        </View>
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>DATE</Text>
          <Text style={s.metaValue}>{dateStr}</Text>
        </View>
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>STATUT</Text>
          <Text style={s.metaValue}>{statusLabel.toUpperCase()}</Text>
        </View>

        <View style={s.dividerSolid} />

        {/* ── Client & Livraison ─────────────────────────────────── */}
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>CLIENT</Text>
          <Text style={s.metaValue}>{order.userNameSnapshot}</Text>
        </View>
        {order.userPhoneSnapshot && (
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>TÉL</Text>
            <Text style={s.metaValue}>{order.userPhoneSnapshot}</Text>
          </View>
        )}
        {order.deliveryDetails && (
          <>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>ZONE</Text>
              <Text style={s.metaValue}>{order.deliveryDetails.district}</Text>
            </View>
            {order.deliveryDetails.instructions && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>INDICATION</Text>
                <Text style={[s.metaValue, { fontSize: 6, flex: 1, paddingLeft: 6 }]}>
                  {order.deliveryDetails.instructions}
                </Text>
              </View>
            )}
          </>
        )}

        <View style={s.dividerDashed} />

        {/* ── Détail des Produits ────────────────────────────────── */}
        <View style={s.tableHeader}>
          <Text style={s.colProduct}>PRODUIT</Text>
          <Text style={s.colQty}>QTÉ</Text>
          <Text style={s.colTotal}>TOTAL</Text>
        </View>

        {order.orderLines?.length ? (
          order.orderLines.map((line, i) => (
            <View key={i} style={{ marginBottom: 3 }}>
              <View style={s.itemRow}>
                <Text style={s.itemName}>
                  {order.cocktailNameSnapshot} ({line.bottleSizeLabel})
                </Text>
                <Text style={s.itemQty}>{line.quantity}</Text>
                <Text style={s.itemTotal}>{line.lineTotal.toLocaleString()} F</Text>
              </View>
              <Text style={s.itemSubline}>PU: {line.pricePerBottle.toLocaleString()} XAF</Text>
            </View>
          ))
        ) : (
          <View style={{ marginBottom: 3 }}>
            <View style={s.itemRow}>
              <Text style={s.itemName}>
                {order.cocktailNameSnapshot}
                {order.bottleSizeLabel ? ` (${order.bottleSizeLabel})` : ''}
              </Text>
              <Text style={s.itemQty}>{order.quantity || 1}</Text>
              <Text style={s.itemTotal}>{subtotal.toLocaleString()} F</Text>
            </View>
          </View>
        )}

        {/* Composition fruits */}
        {ingredientsStr && (
          <Text style={[s.itemSubline, { fontStyle: 'italic' }]}>
            Composition : {ingredientsStr}
          </Text>
        )}

        {/* Option Sucre */}
        <Text style={[s.itemSubline, { fontStyle: 'italic' }]}>
          {order.hasAddedSugar ? 'Option : Avec sucre ajouté' : 'Option : 100% Naturel (Sans sucre)'}
        </Text>

        <View style={s.dividerDashed} />

        {/* ── Totaux ─────────────────────────────────────────────── */}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Sous-total</Text>
          <Text style={s.totalVal}>{subtotal.toLocaleString()} XAF</Text>
        </View>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Frais de livraison</Text>
          <Text style={s.totalVal}>{order.deliveryFee.toLocaleString()} XAF</Text>
        </View>
        {!!order.discountAmount && order.discountAmount > 0 && (
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>
              Réduction {order.promoCodeApplied ? `(${order.promoCodeApplied})` : ''}
            </Text>
            <Text style={s.totalVal}>-{order.discountAmount.toLocaleString()} XAF</Text>
          </View>
        )}

        <View style={s.grandTotalRow}>
          <Text style={s.grandTotalLabel}>TOTAL NET</Text>
          <Text style={s.grandTotalValue}>{order.totalPrice.toLocaleString()} XAF</Text>
        </View>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <View style={s.footer}>
          <Text style={s.footerTextBold}>Merci pour votre confiance !</Text>
          <Text style={s.footerText}>Buvez frais, vivez FYS</Text>
          <Text style={[s.footerText, { marginTop: 2, fontSize: 5 }]}>
            *** www.fys-juices.com ***
          </Text>
        </View>
      </Page>
    </Document>
  );
}
