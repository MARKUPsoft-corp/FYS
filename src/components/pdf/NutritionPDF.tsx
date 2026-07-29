import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { AIAnalysis } from '@/entities/cocktail';
import { AIVerdict } from '@/entities/cocktail';

type TFunction = (key: string) => string;

const PRIMARY   = '#16A34A';
const MUTED     = '#6B7280';
const BORDER    = '#E5E7EB';
const BGCARD    = '#F9FAFB';
const TEXT      = '#111827';
const WHITE     = '#FFFFFF';

function getVerdictLabel(verdict: AIVerdict, t: TFunction): string {
  const labels: Record<AIVerdict, string> = {
    [AIVerdict.BENEFICIAL]:      t('nutrition.verdictBeneficial'),
    [AIVerdict.NEUTRAL]:         t('nutrition.verdictNeutral'),
    [AIVerdict.CAUTION]:         t('nutrition.verdictCaution'),
    [AIVerdict.NOT_RECOMMENDED]: t('nutrition.verdictNotRecommended'),
  };
  return labels[verdict];
}

function getNutrientLabel(key: string, t: TFunction): string {
  const labels: Record<string, string> = {
    vitamineC:      t('nutrition.nutrientVitamineC'),
    vitamineA:      t('nutrition.nutrientVitamineA'),
    fibres:         t('nutrition.nutrientFibres'),
    potassium:      t('nutrition.nutrientPotassium'),
    sucresNaturels: t('nutrition.nutrientSucresNaturels'),
    antioxydants:   t('nutrition.nutrientAntioxydants'),
  };
  return labels[key] ?? key;
}

function getNiveauLabel(niveau: string, t: TFunction): string {
  const labels: Record<string, string> = {
    faible:  t('nutrition.levelLow'),
    modéré:  t('nutrition.levelModerate'),
    élevé:   t('nutrition.levelHigh'),
  };
  return labels[niveau] ?? niveau;
}

const VERDICT_CFG: Record<AIVerdict, { bg: string; text: string }> = {
  [AIVerdict.BENEFICIAL]:      { bg: '#DCFCE7', text: '#15803D' },
  [AIVerdict.NEUTRAL]:         { bg: '#F3F4F6', text: '#374151' },
  [AIVerdict.CAUTION]:         { bg: '#FEF9C3', text: '#854D0E' },
  [AIVerdict.NOT_RECOMMENDED]: { bg: '#FEE2E2', text: '#991B1B' },
};

const NIVEAU_COLOR: Record<string, string> = {
  faible: '#FCA5A5',
  modéré: '#FDE68A',
  élevé:  '#6EE7B7',
};

const s = StyleSheet.create({
  page:   { fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: WHITE, padding: 40 },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  brand:  { fontSize: 24, fontFamily: 'Helvetica-Bold', color: PRIMARY },
  dot:    { color: '#22D3EE' },
  tagline:{ fontSize: 9, color: MUTED, marginTop: 2 },
  metaTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: TEXT, textAlign: 'right' },
  metaSub:   { fontSize: 9, color: MUTED, textAlign: 'right', marginTop: 2 },
  divider:  { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 16 },
  // Score hero
  scoreHero: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  scoreBig:  { fontSize: 48, fontFamily: 'Helvetica-Bold', color: PRIMARY },
  scoreLabel:{ fontSize: 11, color: MUTED },
  // Badge
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  // Section
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  card:     { backgroundColor: BGCARD, borderRadius: 8, padding: 14, marginBottom: 14 },
  noteText: { fontSize: 10, lineHeight: 1.6, color: TEXT },
  // Nutrient table
  nutriRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BORDER },
  nutriLabel:{ fontSize: 10, color: TEXT },
  nutriRight:{ flexDirection: 'row', gap: 12, alignItems: 'center' },
  nutriVal:  { fontSize: 10, color: MUTED },
  nutriPct:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: PRIMARY, width: 42, textAlign: 'right' },
  // Progress bar
  barBg:    { height: 6, backgroundColor: BORDER, borderRadius: 3, width: 80, marginLeft: 8 },
  barFill:  { height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  // Benefit chips row
  benefitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip:     { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  chipText: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  // Bullet list
  bullet:   { flexDirection: 'row', marginBottom: 6 },
  bulletDot:{ fontSize: 12, color: PRIMARY, width: 14, marginTop: -2 },
  bulletText:{ fontSize: 10, lineHeight: 1.5, color: MUTED, flex: 1 },
  // Conseil
  conseilCard: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 14, borderLeftWidth: 3, borderLeftColor: PRIMARY },
  conseilText: { fontSize: 10, lineHeight: 1.5, color: '#065F46' },
  // Footer
  footer:   { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText:{ fontSize: 8, color: MUTED },
});

interface Props {
  analysis: AIAnalysis;
  cocktailName?: string;
  userName?: string;
  ingredients?: string[];
  t: TFunction;
}

export function NutritionPDF({ analysis, cocktailName, userName, ingredients, t }: Props) {
  const verdictCfg = VERDICT_CFG[analysis.verdict];
  const verdictLabel = getVerdictLabel(analysis.verdict, t);
  const nutrients = Object.entries(analysis.profilNutritionnel)
    .filter(([, v]) => v) as [string, { pourcentage: number; valeur: string }][];

  return (
    <Document title={`${t('nutrition.sheetTitle')} — ${cocktailName ?? t('nutrition.defaultCocktail')}`} author="NutriFYS">
      <Page size="A4" style={s.page}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>FYS<Text style={s.dot}>.</Text></Text>
            <Text style={s.tagline}>{t('pdf.tagline')}</Text>
          </View>
          <View>
            <Text style={s.metaTitle}>{t('nutrition.nutritionSheet')}</Text>
            <Text style={s.metaSub}>{cocktailName ?? t('nutrition.aiAnalysis')}</Text>
            {userName && <Text style={[s.metaSub, { marginTop: 4, fontFamily: 'Helvetica-Bold', color: TEXT }]}>{userName}</Text>}
            {ingredients && ingredients.length > 0 && <Text style={s.metaSub}>{ingredients.join(' · ')}</Text>}
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Score Hero ─────────────────────────────────────────────── */}
        <View style={s.scoreHero}>
          <Text style={s.scoreBig}>{analysis.score}</Text>
          <View>
            <Text style={s.scoreLabel}>{t('nutrition.scoreHealth')}</Text>
            <View style={[s.badge, { backgroundColor: verdictCfg.bg, marginTop: 6 }]}>
              <Text style={[s.badgeText, { color: verdictCfg.text }]}>{verdictLabel}</Text>
            </View>
          </View>
        </View>

        {/* ── Notes IA ───────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>{t('nutrition.analysisTitle')}</Text>
        <View style={s.card}>
          <Text style={s.noteText}>{analysis.notes}</Text>
        </View>

        {/* ── Profil Nutritionnel ────────────────────────────────────── */}
        {nutrients.length > 0 && (
          <>
            <Text style={s.sectionTitle}>{t('nutrition.profileLabel')}</Text>
            <View style={s.card}>
              {nutrients.map(([key, info]) => (
                <View key={key} style={s.nutriRow}>
                  <Text style={s.nutriLabel}>{getNutrientLabel(key, t)}</Text>
                  <View style={s.nutriRight}>
                    <Text style={s.nutriVal}>{info.valeur}</Text>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${Math.min(info.pourcentage, 100)}%` }]} />
                    </View>
                    <Text style={s.nutriPct}>{info.pourcentage}{t('nutrition.ajrAdult')}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Bénéfices Ciblés ───────────────────────────────────────── */}
        {analysis.beneficesCibles.length > 0 && (
          <>
            <Text style={s.sectionTitle}>{t('nutrition.targetedBenefits')}</Text>
            <View style={s.benefitsRow}>
              {analysis.beneficesCibles.map((b, i) => (
                <View key={i} style={[s.chip, { backgroundColor: NIVEAU_COLOR[b.niveau] ?? BGCARD }]}>
                  <Text style={[s.chipText, { color: TEXT }]}>⚡ {b.nom} ({getNiveauLabel(b.niveau, t)})</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Interactions ───────────────────────────────────────────── */}
        {analysis.interactionsFruits.length > 0 && (
          <>
            <Text style={s.sectionTitle}>{t('nutrition.fruitInteractions')}</Text>
            <View style={s.card}>
              {analysis.interactionsFruits.map((interaction, i) => (
                <View key={i} style={s.bullet}>
                  <Text style={s.bulletDot}>•</Text>
                  <Text style={s.bulletText}>{interaction}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Conseil ────────────────────────────────────────────────── */}
        {analysis.conseil && (
          <>
            <Text style={s.sectionTitle}>{t('nutrition.consumptionAdvice')}</Text>
            <View style={s.conseilCard}>
              <Text style={s.conseilText}>{analysis.conseil}</Text>
            </View>
          </>
        )}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <View style={s.footer}>
          <Text style={s.footerText}>{t('pdf.aiGenerated')}</Text>
          <Text style={s.footerText}>{t('pdf.disclaimer')}</Text>
        </View>
      </Page>
    </Document>
  );
}
