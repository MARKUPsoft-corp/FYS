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

export async function downloadThermalFacture(order: Order, ingredientsStr?: string): Promise<void> {
  try {
    const { pdf } = await import('@react-pdf/renderer');
    const React = await import('react');
    const { FactureThermiquePDF } = await import('@/components/pdf/FactureThermiquePDF');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = await pdf(React.createElement(FactureThermiquePDF, { order, ingredientsStr }) as any).toBlob();
    triggerDownload(blob, `Ticket_58mm_${order.id.slice(0, 8)}.pdf`);
  } catch (err) {
    console.error('Failed to generate thermal PDF (Facture):', err);
  }
}

export function printThermalReceipt(order: Order, ingredientsStr?: string): void {
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

  const linesHtml = order.orderLines?.length
    ? order.orderLines
        .map(
          (line) => `
        <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
          <div style="flex:1; font-weight: bold;">${order.cocktailNameSnapshot} (${line.bottleSizeLabel})</div>
          <div style="width:25px; text-align:center;">x${line.quantity}</div>
          <div style="width:55px; text-align:right; font-weight: bold;">${line.lineTotal.toLocaleString()} F</div>
        </div>
        <div style="font-size: 9px; margin-bottom: 3px; padding-left: 4px;">PU: ${line.pricePerBottle.toLocaleString()} XAF</div>
      `,
        )
        .join('')
    : `
        <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
          <div style="flex:1; font-weight: bold;">${order.cocktailNameSnapshot} ${order.bottleSizeLabel ? `(${order.bottleSizeLabel})` : ''}</div>
          <div style="width:25px; text-align:center;">x${order.quantity || 1}</div>
          <div style="width:55px; text-align:right; font-weight: bold;">${subtotal.toLocaleString()} F</div>
        </div>
      `;

  const compositionHtml = ingredientsStr
    ? `<div style="font-size: 8.5px; font-style: italic; margin-bottom: 2px;">Composition : ${ingredientsStr}</div>`
    : '';

  const sugarHtml = `<div style="font-size: 8.5px; font-style: italic; margin-bottom: 3px;">${
    order.hasAddedSugar ? 'Option : Avec sucre ajouté' : 'Option : 100% Naturel (Sans sucre)'
  }</div>`;

  const discountHtml =
    order.discountAmount && order.discountAmount > 0
      ? `
    <div style="display:flex; justify-content:space-between; margin-bottom: 2px; font-weight: bold;">
      <div>Réduction ${order.promoCodeApplied ? `(${order.promoCodeApplied})` : ''}</div>
      <div>-${order.discountAmount.toLocaleString()} XAF</div>
    </div>
  `
      : '';

  const deliveryInfoHtml = order.deliveryDetails
    ? `
    <div style="border-top: 1px dashed #000; margin: 4px 0; padding-top: 4px; font-size: 9px;">
      <div><strong>ZONE :</strong> ${order.deliveryDetails.district}</div>
      <div><strong>TÉL :</strong> ${order.deliveryDetails.phone}</div>
      ${order.deliveryDetails.instructions ? `<div><strong>NOTE :</strong> ${order.deliveryDetails.instructions}</div>` : ''}
    </div>
  `
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Ticket ${order.id.slice(0, 8)}</title>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            width: 58mm;
            max-width: 58mm;
            margin: 0 auto;
            padding: 4mm 3mm 8mm 3mm;
            font-family: 'Courier New', Courier, monospace, sans-serif;
            font-size: 10px;
            line-height: 1.25;
            color: #000;
            background: #fff;
          }
          .center { text-align: center; }
          .brand { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
          .tagline { font-size: 8px; text-transform: uppercase; margin-bottom: 4px; }
          .dashed { border-top: 1px dashed #000; margin: 4px 0; }
          .solid { border-top: 1px solid #000; margin: 4px 0; }
          .double { border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 4px 0; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .bold { font-weight: bold; }
          .grand-total { font-size: 12px; font-weight: bold; }
          .footer { font-size: 8px; text-align: center; margin-top: 6px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="brand">FYS.</div>
          <div class="tagline">FRESH JUICES & COCKTAILS</div>
        </div>
        <div class="dashed"></div>
        <div class="row"><span>TICKET N°</span><span class="bold">#${order.id.toUpperCase().slice(0, 8)}</span></div>
        <div class="row"><span>DATE</span><span>${dateStr}</span></div>
        <div class="row"><span>CLIENT</span><span class="bold">${order.userNameSnapshot}</span></div>
        ${order.userPhoneSnapshot ? `<div class="row"><span>TÉL</span><span>${order.userPhoneSnapshot}</span></div>` : ''}
        ${deliveryInfoHtml}
        <div class="dashed"></div>
        <div class="row bold" style="font-size: 9px; margin-bottom: 3px;">
          <span style="flex:1;">PRODUIT</span>
          <span style="width:25px; text-align:center;">QTÉ</span>
          <span style="width:55px; text-align:right;">TOTAL</span>
        </div>
        <div class="solid"></div>
        ${linesHtml}
        ${compositionHtml}
        ${sugarHtml}
        <div class="dashed"></div>
        <div class="row"><span>Sous-total</span><span>${subtotal.toLocaleString()} XAF</span></div>
        <div class="row"><span>Livraison</span><span>${order.deliveryFee.toLocaleString()} XAF</span></div>
        ${discountHtml}
        <div class="double">
          <div class="row grand-total">
            <span>TOTAL NET</span>
            <span>${order.totalPrice.toLocaleString()} XAF</span>
          </div>
        </div>
        <div class="footer">
          <div>Merci pour votre confiance !</div>
          <div class="bold" style="margin-top: 2px;">Buvez frais, vivez FYS 🌱</div>
        </div>
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }, 350);
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
