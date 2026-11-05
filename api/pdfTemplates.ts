import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import React from 'react';

// ── Palette FYS ─────────────────────────────────────────────────────────────
const PRIMARY = '#16A34A'; // green-600
const MUTED = '#6B7280'; // gray-500
const BORDER = '#E5E7EB'; // gray-200
const BGCARD = '#F9FAFB'; // gray-50
const TEXT = '#111827'; // gray-900
const WHITE = '#FFFFFF';

// ── Styles Facture PDF ───────────────────────────────────────────────────────
const factureStyles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: WHITE, padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  brand: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: PRIMARY, letterSpacing: -1 },
  dot: { color: '#22D3EE' },
  tagline: { fontSize: 9, color: MUTED, marginTop: 2 },
  meta: { alignItems: 'flex-end' },
  metaTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: TEXT, marginBottom: 4 },
  metaRef: { fontSize: 8, color: MUTED },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 6 },
  badgeText: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 20 },
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  card: { backgroundColor: BGCARD, borderRadius: 8, padding: 14, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rowLast: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 10, color: MUTED },
  value: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: TEXT },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 8, padding: 12, marginTop: 8 },
  totalLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: TEXT },
  totalValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: PRIMARY },
  addrRow: { flexDirection: 'row', marginBottom: 6 },
  addrKey: { fontSize: 9, color: MUTED, width: 90 },
  addrVal: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: TEXT, flex: 1 },
  cols: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: MUTED },
});

// ── Composant Facture PDF ────────────────────────────────────────────────────
export function FacturePDFDocument({ order, ingredientsStr }: { order: any; ingredientsStr?: string }) {
  const statusCfg = { bg: '#FEF9C3', text: '#854D0E' }; // En attente
  const statusLabel = 'En attente';

  const createdDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
  const dateStr = createdDate.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const subtotal = order.orderLines?.length
    ? order.orderLines.reduce((sum: number, line: any) => sum + (Number(line.lineTotal) || 0), 0)
    : (order.cocktailPriceSnapshot || 0) * (order.quantity || 1);

  const shortId = (order.id || 'ORDER').slice(0, 8).toUpperCase();

  return React.createElement(
    Document,
    { title: `Facture — ${shortId}`, author: 'NutriFYS' },
    React.createElement(
      Page,
      { size: 'A4', style: factureStyles.page },
      // Header
      React.createElement(
        View,
        { style: factureStyles.header },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: factureStyles.brand }, 'FYS', React.createElement(Text, { style: factureStyles.dot }, '.')),
          React.createElement(Text, { style: factureStyles.tagline }, 'For YourSelf · Boissons Santé Artisanales')
        ),
        React.createElement(
          View,
          { style: factureStyles.meta },
          React.createElement(Text, { style: factureStyles.metaTitle }, 'FACTURE OFFICIELLE'),
          React.createElement(Text, { style: factureStyles.metaRef }, `N° ${shortId}`),
          React.createElement(Text, { style: factureStyles.metaRef }, `Émise le ${dateStr}`),
          React.createElement(
            View,
            { style: [factureStyles.badge, { backgroundColor: statusCfg.bg }] },
            React.createElement(Text, { style: [factureStyles.badgeText, { color: statusCfg.text }] }, statusLabel)
          )
        )
      ),
      React.createElement(View, { style: factureStyles.divider }),

      // Client & Livraison
      React.createElement(
        View,
        { style: factureStyles.cols },
        React.createElement(
          View,
          { style: factureStyles.col },
          React.createElement(Text, { style: factureStyles.sectionTitle }, 'CLIENT'),
          React.createElement(
            View,
            { style: factureStyles.card },
            React.createElement(Text, { style: [factureStyles.value, { marginBottom: 4 }] }, order.userNameSnapshot || 'Client'),
            order.userEmailSnapshot ? React.createElement(Text, { style: factureStyles.label }, order.userEmailSnapshot) : null,
            order.userPhoneSnapshot ? React.createElement(Text, { style: [factureStyles.label, { marginTop: 2 }] }, order.userPhoneSnapshot) : null
          )
        ),
        order.deliveryDetails
          ? React.createElement(
              View,
              { style: factureStyles.col },
              React.createElement(Text, { style: factureStyles.sectionTitle }, 'LIVRAISON'),
              React.createElement(
                View,
                { style: factureStyles.card },
                React.createElement(
                  View,
                  { style: factureStyles.addrRow },
                  React.createElement(Text, { style: factureStyles.addrKey }, 'Quartier'),
                  React.createElement(Text, { style: factureStyles.addrVal }, order.deliveryDetails.district || 'Yaoundé')
                ),
                React.createElement(
                  View,
                  { style: factureStyles.addrRow },
                  React.createElement(Text, { style: factureStyles.addrKey }, 'Téléphone'),
                  React.createElement(Text, { style: factureStyles.addrVal }, order.deliveryDetails.phone || order.userPhoneSnapshot || '—')
                ),
                order.deliveryDetails.instructions
                  ? React.createElement(
                      View,
                      { style: factureStyles.addrRow },
                      React.createElement(Text, { style: factureStyles.addrKey }, 'Indications'),
                      React.createElement(Text, { style: factureStyles.addrVal }, order.deliveryDetails.instructions)
                    )
                  : null
              )
            )
          : null
      ),

      // Détail de la Commande
      React.createElement(Text, { style: [factureStyles.sectionTitle, { marginTop: 8 }] }, 'DÉTAIL DE LA COMMANDE'),
      React.createElement(
        View,
        { style: factureStyles.card },
        React.createElement(
          View,
          { style: [factureStyles.row, { borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 6, marginBottom: 8 }] },
          React.createElement(Text, { style: [factureStyles.label, { fontSize: 8, textTransform: 'uppercase' }] }, 'PRODUIT'),
          React.createElement(Text, { style: [factureStyles.label, { fontSize: 8, textTransform: 'uppercase' }] }, 'QTÉ'),
          React.createElement(Text, { style: [factureStyles.label, { fontSize: 8, textTransform: 'uppercase' }] }, 'P.U.'),
          React.createElement(Text, { style: [factureStyles.label, { fontSize: 8, textTransform: 'uppercase' }] }, 'TOTAL')
        ),
        order.orderLines?.length
          ? order.orderLines.map((line: any, i: number) =>
              React.createElement(
                View,
                { key: i, style: [factureStyles.row, { marginBottom: 2 }] },
                React.createElement(Text, { style: [factureStyles.value, { flex: 2 }] }, `${order.cocktailNameSnapshot || 'Cocktail Santé'} · ${line.bottleSizeLabel || '500 ml'}`),
                React.createElement(Text, { style: [factureStyles.value, { width: 30, textAlign: 'center' }] }, String(line.quantity)),
                React.createElement(Text, { style: [factureStyles.value, { width: 70, textAlign: 'right' }] }, `${Number(line.pricePerBottle || 0).toLocaleString()} XAF`),
                React.createElement(Text, { style: [factureStyles.value, { width: 80, textAlign: 'right' }] }, `${Number(line.lineTotal || 0).toLocaleString()} XAF`)
              )
            )
          : React.createElement(
              View,
              { style: [factureStyles.row, { marginBottom: 2 }] },
              React.createElement(Text, { style: [factureStyles.value, { flex: 2 }] }, `${order.cocktailNameSnapshot || 'Cocktail Santé'} · ${order.bottleSizeLabel || '500 ml'}`),
              React.createElement(Text, { style: [factureStyles.value, { width: 30, textAlign: 'center' }] }, String(order.quantity || 1)),
              React.createElement(Text, { style: [factureStyles.value, { width: 70, textAlign: 'right' }] }, `${Number(order.cocktailPriceSnapshot || 0).toLocaleString()} XAF`),
              React.createElement(Text, { style: [factureStyles.value, { width: 80, textAlign: 'right' }] }, `${subtotal.toLocaleString()} XAF`)
            ),
        ingredientsStr
          ? React.createElement(
              View,
              { style: factureStyles.row },
              React.createElement(Text, { style: [factureStyles.label, { flex: 2, fontSize: 8, fontStyle: 'italic' }] }, `Composition : ${ingredientsStr}`)
            )
          : null,
        React.createElement(
          View,
          { style: factureStyles.row },
          React.createElement(
            Text,
            { style: [factureStyles.label, { flex: 2, fontSize: 8, fontStyle: 'italic' }] },
            order.hasAddedSugar ? 'Option : Avec sucre ajouté' : 'Option : 100% Naturel (Sans sucre ajouté)'
          )
        )
      ),

      // Récapitulatif
      React.createElement(Text, { style: factureStyles.sectionTitle }, 'RÉCAPITULATIF'),
      React.createElement(
        View,
        { style: factureStyles.card },
        React.createElement(
          View,
          { style: factureStyles.row },
          React.createElement(Text, { style: factureStyles.label }, 'Sous-total'),
          React.createElement(Text, { style: factureStyles.value }, `${subtotal.toLocaleString()} XAF`)
        ),
        React.createElement(
          View,
          { style: factureStyles.rowLast },
          React.createElement(Text, { style: factureStyles.label }, 'Livraison'),
          React.createElement(Text, { style: factureStyles.value }, `${(Number(order.deliveryFee) || 1000).toLocaleString()} XAF`)
        )
      ),
      React.createElement(
        View,
        { style: factureStyles.totalRow },
        React.createElement(Text, { style: factureStyles.totalLabel }, 'TOTAL À PAYER'),
        React.createElement(Text, { style: factureStyles.totalValue }, `${(Number(order.totalPrice) || (subtotal + 1000)).toLocaleString()} XAF`)
      ),

      // Footer
      React.createElement(
        View,
        { style: factureStyles.footer },
        React.createElement(Text, { style: factureStyles.footerText }, '« Tu sais ce que tu bois » · fys-app.com'),
        React.createElement(Text, { style: factureStyles.footerText }, 'Merci de votre confiance !')
      )
    )
  );
}

// ── Styles Fiche Nutritionnelle PDF ─────────────────────────────────────────
const nutriStyles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: WHITE, padding: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  brand: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: PRIMARY },
  dot: { color: '#22D3EE' },
  tagline: { fontSize: 9, color: MUTED, marginTop: 2 },
  metaTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: TEXT, textAlign: 'right' },
  metaSub: { fontSize: 9, color: MUTED, textAlign: 'right', marginTop: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 16 },
  scoreHero: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  scoreBig: { fontSize: 48, fontFamily: 'Helvetica-Bold', color: PRIMARY },
  scoreLabel: { fontSize: 11, color: MUTED },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  card: { backgroundColor: BGCARD, borderRadius: 8, padding: 14, marginBottom: 14 },
  noteText: { fontSize: 10, lineHeight: 1.6, color: TEXT },
  nutriRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BORDER },
  nutriLabel: { fontSize: 10, color: TEXT },
  nutriRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  nutriVal: { fontSize: 10, color: MUTED },
  nutriPct: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: PRIMARY, width: 42, textAlign: 'right' },
  barBg: { height: 6, backgroundColor: BORDER, borderRadius: 3, width: 80, marginLeft: 8 },
  barFill: { height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  benefitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  chipText: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  bullet: { flexDirection: 'row', marginBottom: 6 },
  bulletDot: { fontSize: 12, color: PRIMARY, width: 14, marginTop: -2 },
  bulletText: { fontSize: 10, lineHeight: 1.5, color: MUTED, flex: 1 },
  conseilCard: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 14, borderLeftWidth: 3, borderLeftColor: PRIMARY },
  conseilText: { fontSize: 10, lineHeight: 1.5, color: '#065F46' },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: MUTED },
});

// ── Composant Fiche Nutritionnelle PDF ───────────────────────────────────────
export function NutritionPDFDocument({
  analysis,
  cocktailName,
  userName,
  ingredients,
}: {
  analysis: any;
  cocktailName?: string;
  userName?: string;
  ingredients?: string[];
}) {
  const verdictLabel = 'Bénéfique';
  const verdictCfg = { bg: '#DCFCE7', text: '#15803D' };

  const nutrients: [string, { pourcentage: number; valeur: string }][] = analysis?.profilNutritionnel
    ? Object.entries(analysis.profilNutritionnel)
        .filter(([, v]) => v && typeof v === 'object') as any
    : [];

  const nutrientLabels: Record<string, string> = {
    vitamineC: 'Vitamine C',
    vitamineA: 'Vitamine A',
    fibres: 'Fibres alimentaires',
    potassium: 'Potassium',
    sucresNaturels: 'Glucides & Sucres naturels',
    antioxydants: 'Antioxydants (Polyphénols)',
  };

  const niveauColors: Record<string, string> = {
    faible: '#FCA5A5',
    modéré: '#FDE68A',
    élevé: '#6EE7B7',
  };

  return React.createElement(
    Document,
    { title: `Fiche Nutritionnelle — ${cocktailName || 'Cocktail Santé'}`, author: 'NutriFYS' },
    React.createElement(
      Page,
      { size: 'A4', style: nutriStyles.page },
      // Header
      React.createElement(
        View,
        { style: nutriStyles.header },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: nutriStyles.brand }, 'FYS', React.createElement(Text, { style: nutriStyles.dot }, '.')),
          React.createElement(Text, { style: nutriStyles.tagline }, 'NutriFYS — Votre Nutritionniste Sur-Mesure')
        ),
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: nutriStyles.metaTitle }, 'FICHE NUTRITIONNELLE'),
          React.createElement(Text, { style: nutriStyles.metaSub }, cocktailName || 'Cocktail Santé'),
          userName ? React.createElement(Text, { style: [nutriStyles.metaSub, { marginTop: 4, fontFamily: 'Helvetica-Bold', color: TEXT }] }, userName) : null,
          ingredients && ingredients.length > 0 ? React.createElement(Text, { style: nutriStyles.metaSub }, ingredients.join(' · ')) : null
        )
      ),
      React.createElement(View, { style: nutriStyles.divider }),

      // Score Hero
      React.createElement(
        View,
        { style: nutriStyles.scoreHero },
        React.createElement(Text, { style: nutriStyles.scoreBig }, String(analysis?.score || 92)),
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: nutriStyles.scoreLabel }, 'Score Santé FYS / 100'),
          React.createElement(
            View,
            { style: [nutriStyles.badge, { backgroundColor: verdictCfg.bg, marginTop: 6 }] },
            React.createElement(Text, { style: [nutriStyles.badgeText, { color: verdictCfg.text }] }, verdictLabel)
          )
        )
      ),

      // Notes IA
      React.createElement(Text, { style: nutriStyles.sectionTitle }, 'ANALYSE DE VOTRE NUTRITIONNISTE'),
      React.createElement(
        View,
        { style: nutriStyles.card },
        React.createElement(Text, { style: nutriStyles.noteText }, analysis?.notes || 'Synergie nutritionnelle riche en antioxydants et micronutriments.')
      ),

      // Profil Nutritionnel
      nutrients.length > 0
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(Text, { style: nutriStyles.sectionTitle }, 'PROFIL NUTRITIONNEL CLÉ'),
            React.createElement(
              View,
              { style: nutriStyles.card },
              nutrients.map(([key, info]) =>
                React.createElement(
                  View,
                  { key, style: nutriStyles.nutriRow },
                  React.createElement(Text, { style: nutriStyles.nutriLabel }, nutrientLabels[key] || key),
                  React.createElement(
                    View,
                    { style: nutriStyles.nutriRight },
                    React.createElement(Text, { style: nutriStyles.nutriVal }, info.valeur),
                    React.createElement(
                      View,
                      { style: nutriStyles.barBg },
                      React.createElement(View, { style: [nutriStyles.barFill, { width: `${Math.min(info.pourcentage, 100)}%` }] })
                    ),
                    React.createElement(Text, { style: nutriStyles.nutriPct }, `${info.pourcentage}% AJR`)
                  )
                )
              )
            )
          )
        : null,

      // Bénéfices ciblés
      Array.isArray(analysis?.beneficesCibles) && analysis.beneficesCibles.length > 0
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(Text, { style: nutriStyles.sectionTitle }, 'BÉNÉFICES CIBLÉS'),
            React.createElement(
              View,
              { style: nutriStyles.benefitsRow },
              analysis.beneficesCibles.map((b: any, i: number) =>
                React.createElement(
                  View,
                  { key: i, style: [nutriStyles.chip, { backgroundColor: niveauColors[b.niveau] || BGCARD }] },
                  React.createElement(Text, { style: [nutriStyles.chipText, { color: TEXT }] }, `⚡ ${b.nom} (${b.niveau || 'élevé'})`)
                )
              )
            )
          )
        : null,

      // Interactions
      Array.isArray(analysis?.interactionsFruits) && analysis.interactionsFruits.length > 0
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(Text, { style: nutriStyles.sectionTitle }, 'SYNERGIE DES FRUITS'),
            React.createElement(
              View,
              { style: nutriStyles.card },
              analysis.interactionsFruits.map((item: string, i: number) =>
                React.createElement(
                  View,
                  { key: i, style: nutriStyles.bullet },
                  React.createElement(Text, { style: nutriStyles.bulletDot }, '•'),
                  React.createElement(Text, { style: nutriStyles.bulletText }, item)
                )
              )
            )
          )
        : null,

      // Conseil
      analysis?.conseil
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(Text, { style: nutriStyles.sectionTitle }, 'CONSEIL DE CONSOMMATION'),
            React.createElement(
              View,
              { style: nutriStyles.conseilCard },
              React.createElement(Text, { style: nutriStyles.conseilText }, analysis.conseil)
            )
          )
        : null,

      // Footer
      React.createElement(
        View,
        { style: nutriStyles.footer },
        React.createElement(Text, { style: nutriStyles.footerText }, 'NutriFYS — Fiche générée par votre assistant nutritionniste 🌿'),
        React.createElement(Text, { style: nutriStyles.footerText }, 'Consultez un professionnel de santé pour toute question médicale.')
      )
    )
  );
}
