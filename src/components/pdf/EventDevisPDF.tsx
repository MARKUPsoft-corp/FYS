import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { FysEvent } from '@/entities/event';
import { FYS_EVENT_STATUS_LABELS, FYS_EVENT_TYPE_LABELS } from '@/entities/event';

// ── Palette (Harmonisée avec NutritionPDF) ──────────────────────────────────
const PRIMARY   = '#16A34A'; // emerald/green-600
const ORANGE    = '#F2694A'; // FYS Brand Orange
const MUTED     = '#6B7280'; // gray-500
const BORDER    = '#E5E7EB'; // gray-200
const BGCARD    = '#F9FAFB'; // gray-50
const TEXT      = '#111827'; // gray-900
const WHITE     = '#FFFFFF';

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  draft:            { bg: '#F3F4F6', text: '#374151' },
  submitted:        { bg: '#FEF9C3', text: '#854D0E' },
  confirmed:        { bg: '#DBEAFE', text: '#1E40AF' },
  in_preparation:   { bg: '#FEF3C7', text: '#92400E' },
  out_for_delivery: { bg: '#E0E7FF', text: '#3730A3' },
  delivered:        { bg: '#DCFCE7', text: '#15803D' },
  cancelled:        { bg: '#FEE2E2', text: '#991B1B' },
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: TEXT,
    backgroundColor: WHITE,
    padding: 36,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  brand: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: PRIMARY,
    letterSpacing: -0.5,
  },
  dot: {
    color: ORANGE,
  },
  tagline: {
    fontSize: 8.5,
    color: MUTED,
    marginTop: 2,
  },
  meta: {
    alignItems: 'flex-end',
  },
  metaTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaSub: {
    fontSize: 8,
    color: MUTED,
    marginTop: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginVertical: 12,
  },
  // Hero Metric Block
  heroBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BGCARD,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroNumber: {
    fontSize: 34,
    fontFamily: 'Helvetica-Bold',
    color: PRIMARY,
  },
  heroLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
  },
  heroSub: {
    fontSize: 8,
    color: MUTED,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  // Section Titles
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  card: {
    backgroundColor: BGCARD,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  // Key-value grid row
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3.5,
  },
  gridCol: {
    flex: 1,
  },
  gridKey: {
    fontSize: 7.5,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridVal: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    marginTop: 1,
  },
  // Table styles
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  cellName:   { flex: 3 },
  cellVolume: { flex: 1.5, textAlign: 'center' },
  cellQty:    { flex: 1.2, textAlign: 'center' },
  cellPrice:  { flex: 1.8, textAlign: 'right' },
  cellTotal:  { flex: 1.8, textAlign: 'right' },
  itemName: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
  },
  cellText: {
    fontSize: 8,
    color: TEXT,
  },
  cellTextBold: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
  },
  // Financial lines
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  financialLabel: {
    fontSize: 8.5,
    color: MUTED,
  },
  financialVal: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginVertical: 3,
  },
  discountLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#15803D',
  },
  discountVal: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#15803D',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  totalLabel: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
  },
  totalValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: PRIMARY,
  },
  // Freshness quality callout
  conseilCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
    marginBottom: 12,
  },
  conseilTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#15803D',
    marginBottom: 2,
  },
  conseilText: {
    fontSize: 7.5,
    lineHeight: 1.4,
    color: '#065F46',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: MUTED,
  },
});

interface Props {
  event: FysEvent;
  supportPhone?: string;
  documentType?: 'facture' | 'devis';
}

export function EventDevisPDF({ event, supportPhone, documentType }: Props) {
  const isFacture = documentType === 'facture' || (documentType !== 'devis' && event.status !== 'draft');
  const docTypeLabel = isFacture ? 'Facture FYS Event' : 'Devis FYS Event';
  const metaMainTitle = isFacture ? 'Facture Officielle' : 'Fiche Devis & Commande';
  const refPrefix = isFacture ? 'FACT' : 'DEV';

  const statusCfg = STATUS_COLOR[event.status] || STATUS_COLOR.submitted;
  const statusLabel = FYS_EVENT_STATUS_LABELS[event.status] || event.status;
  const typeLabel = FYS_EVENT_TYPE_LABELS[event.eventType] || event.eventType;

  const createdDate = event.createdAt?.toDate?.() || new Date();
  const dateStr = createdDate.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const rawTotal = event.rawJuiceTotal || (event.items || []).reduce((acc, i) => acc + (i.totalPrice || 0), 0);
  const discountPercent = event.discountPercent || 0;
  const discountAmount = event.discountAmount || 0;
  const netTotal = event.totalAmount || (rawTotal - discountAmount);

  return (
    <Document
      title={`${docTypeLabel} — ${event.companyName} (${event.id.slice(0, 8).toUpperCase()})`}
      author="FYS Event Traiteur Corporate"
    >
      <Page size="A4" style={s.page}>
        {/* ── 1. HEADER ── */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>
              FYS<Text style={s.dot}>.</Text>
            </Text>
            <Text style={s.tagline}>
              Jus 100% naturels pressés à froid • Service Traiteur Corporate
            </Text>
          </View>
          <View style={s.meta}>
            <Text style={s.metaTitle}>{metaMainTitle}</Text>
            <Text style={s.metaSub}>Réf: #{refPrefix}-{event.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={s.metaSub}>Date d&apos;émission : {dateStr}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── 2. HERO HIGHLIGHT ── */}
        <View style={s.heroBlock}>
          <View style={s.heroLeft}>
            <Text style={s.heroNumber}>{event.totalBottles}</Text>
            <View>
              <Text style={s.heroLabel}>Bouteilles d&apos;exception pressées le jour J</Text>
              <Text style={s.heroSub}>
                Volume total : {(event.totalLiters || 0).toFixed(1)} Litres • {event.guestCount || 1} convives attendus
              </Text>
            </View>
          </View>
          <View style={[s.badge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[s.badgeText, { color: statusCfg.text }]}>
              {statusLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── 3. INFORMATIONS GÉNÉRALES ── */}
        <Text style={s.sectionTitle}>1. Coordonnées & Cadre de l&apos;Événement</Text>
        <View style={s.card}>
          <View style={s.gridRow}>
            <View style={s.gridCol}>
              <Text style={s.gridKey}>Entreprise / Organisation</Text>
              <Text style={s.gridVal}>{event.companyName}</Text>
            </View>
            <View style={s.gridCol}>
              <Text style={s.gridKey}>Intitulé de l&apos;événement</Text>
              <Text style={s.gridVal}>{event.eventTitle || event.eventName || '—'}</Text>
            </View>
          </View>

          <View style={s.gridRow}>
            <View style={s.gridCol}>
              <Text style={s.gridKey}>Type d&apos;événement</Text>
              <Text style={s.gridVal}>
                {typeLabel}
                {event.customEventType ? ` (${event.customEventType})` : ''}
              </Text>
            </View>
            <View style={s.gridCol}>
              <Text style={s.gridKey}>Date & Heure souhaitées</Text>
              <Text style={s.gridVal}>
                {event.eventDate}
                {event.deliveryTime ? ` à ${event.deliveryTime}` : ''}
              </Text>
            </View>
          </View>

          <View style={s.gridRow}>
            <View style={s.gridCol}>
              <Text style={s.gridKey}>Lieu ou adresse de livraison</Text>
              <Text style={s.gridVal}>{event.location || event.locationAddress || '—'}</Text>
            </View>
            <View style={s.gridCol}>
              <Text style={s.gridKey}>Contact Référent</Text>
              <Text style={s.gridVal}>
                {event.contactPerson} ({event.contactPhone})
              </Text>
            </View>
          </View>
        </View>

        {/* ── 4. SÉLECTION DES RECETTES ── */}
        <Text style={s.sectionTitle}>2. Recettes & Formats Sélectionnés</Text>
        <View style={s.card}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, s.cellName]}>Recette</Text>
            <Text style={[s.tableHeaderCell, s.cellVolume]}>Format</Text>
            <Text style={[s.tableHeaderCell, s.cellQty]}>Qté</Text>
            <Text style={[s.tableHeaderCell, s.cellPrice]}>Prix unitaire</Text>
            <Text style={[s.tableHeaderCell, s.cellTotal]}>Total</Text>
          </View>

          {(event.items || []).map((item, idx) => {
            const isLast = idx === (event.items?.length || 0) - 1;
            const rowStyle = isLast ? s.tableRowLast : s.tableRow;
            return (
              <View key={idx} style={rowStyle}>
                <View style={s.cellName}>
                  <Text style={s.itemName}>{item.name}</Text>
                </View>
                <View style={s.cellVolume}>
                  <Text style={s.cellText}>{item.bottleVolume || '500ml'}</Text>
                </View>
                <View style={s.cellQty}>
                  <Text style={s.cellTextBold}>{item.quantity}</Text>
                </View>
                <View style={s.cellPrice}>
                  <Text style={s.cellText}>{item.unitPrice.toLocaleString()} XAF</Text>
                </View>
                <View style={s.cellTotal}>
                  <Text style={s.cellTextBold}>{(item.totalPrice || item.unitPrice * item.quantity).toLocaleString()} XAF</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── 5. RÉCAPITULATIF FINANCIER ── */}
        <Text style={s.sectionTitle}>3. Décomposition Financière & Tarification</Text>
        <View style={s.card}>
          <View style={s.financialRow}>
            <Text style={s.financialLabel}>Total brut des jus sélectionnés</Text>
            <Text style={s.financialVal}>{rawTotal.toLocaleString()} XAF</Text>
          </View>

          {discountPercent > 0 && (
            <View style={s.discountRow}>
              <Text style={s.discountLabel}>
                Remise sur volume appliquée ({discountPercent}%)
              </Text>
              <Text style={s.discountVal}>
                -{discountAmount.toLocaleString()} XAF
              </Text>
            </View>
          )}

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL NET À RÉGLER</Text>
            <Text style={s.totalValue}>{netTotal.toLocaleString()} XAF</Text>
          </View>
        </View>

        {/* ── 6. ENGAGEMENT FRAÎCHEUR ── */}
        <View style={s.conseilCard}>
          <Text style={s.conseilTitle}>🌿 Engagement Fraîcheur & Excellence FYS</Text>
          <Text style={s.conseilText}>
            Nos jus sont extraits à froid quelques heures avant l&apos;événement pour préserver 100% des enzymes,
            vitamines et saveurs naturelles. Zéro additif, zéro sucre ajouté, bouteilles consignables ou recyclables.
          </Text>
        </View>

        {/* ── 7. FOOTER ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            FYS Event • Solution Traiteur Corporate • www.fys-vitality.com
          </Text>
          <Text style={s.footerText}>
            Service Client WhatsApp : {supportPhone || '+237 699 00 00 00'}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
