/**
 * NutriFYS — Vector PDF Generator
 * Uses @react-pdf/renderer to produce true, selectable-text PDFs.
 * All imports are dynamic to avoid SSR crashes on Vercel.
 */

import type { Order } from '@/entities/order';
import type { AIAnalysis } from '@/entities/cocktail';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadVectorFacture(order: Order, ingredientsStr?: string): Promise<void> {
  try {
    const { pdf } = await import('@react-pdf/renderer');
    const React = await import('react');
    const { FacturePDF } = await import('@/components/pdf/FacturePDF');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = await pdf(React.createElement(FacturePDF, { order, ingredientsStr }) as any).toBlob();
    triggerDownload(blob, `Facture_${order.id.slice(0, 8)}.pdf`);
  } catch (err) {
    console.error('Failed to generate vector PDF (Facture):', err);
  }
}

export async function downloadVectorNutrition(analysis: AIAnalysis, cocktailName?: string, userName?: string, ingredientsStr?: string): Promise<void> {
  try {
    const { pdf } = await import('@react-pdf/renderer');
    const React = await import('react');
    const i18n = await import('@/i18n');
    const { NutritionPDF } = await import('@/components/pdf/NutritionPDF');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ingredients = ingredientsStr ? ingredientsStr.split(' · ') : undefined;
    const blob = await pdf(React.createElement(NutritionPDF, { analysis, cocktailName, userName, ingredients, t: i18n.default.t.bind(i18n.default) }) as any).toBlob();
    triggerDownload(blob, `Fiche_NutriFYS_${cocktailName ?? 'cocktail'}.pdf`);
  } catch (err) {
    console.error('Failed to generate vector PDF (Nutrition):', err);
  }
}
