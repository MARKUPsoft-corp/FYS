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
          .brand { font-size: 18px; font-weight: bold; letter-spacing: 1.5px; }
          .tagline { font-size: 9.5px; font-weight: bold; margin-top: 1px; margin-bottom: 4px; }
          .dashed { border-top: 1px dashed #000; margin: 4px 0; }
          .solid { border-top: 1px solid #000; margin: 4px 0; }
          .double { border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 4px 0; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .bold { font-weight: bold; }
          .grand-total { font-size: 12px; font-weight: bold; }
          .footer { font-size: 8px; text-align: center; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="brand">FYS</div>
          <div class="tagline">For YourSelf</div>
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
          <div class="bold" style="font-size: 8.5px;">Merci de votre confiance !</div>
          <div style="margin-top: 2px; font-style: italic; font-size: 9.5px; font-weight: bold;">« Tu sais ce que tu bois »</div>
          <div style="font-size: 7.5px; margin-top: 4px; font-weight: bold; letter-spacing: 0.5px;">fys-app.com</div>
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

/**
 * Converts an in-DOM SVG element into a clean, high-resolution PNG data URL.
 */
export function getSvgDataUrl(svgId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const svg = document.getElementById(svgId);
    if (!svg) {
      reject(new Error(`Élément SVG #${svgId} introuvable`));
      return;
    }

    let svgData = new XMLSerializer().serializeToString(svg);
    if (!svgData.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 4x upscale for ultra-sharp thermal & PDF rendering
      const scale = 4;
      const baseWidth = svg.clientWidth || 160;
      const baseHeight = svg.clientHeight || 160;
      canvas.width = baseWidth * scale;
      canvas.height = baseHeight * scale;

      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Canvas 2D context non disponible'));
      }
    };

    img.onerror = (e) => reject(e);
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  });
}

/**
 * Direct thermal printer (58mm) trigger for Option B bottle QR stickers.
 * Calibrated to ~38mm x 38mm centered on 58mm roll with cut guides.
 */
export function printThermalQrStickers(svgId: string, count: number = 1): void {
  const svg = document.getElementById(svgId);
  if (!svg) {
    console.error(`Élément SVG #${svgId} introuvable`);
    return;
  }

  let svgData = new XMLSerializer().serializeToString(svg);
  if (!svgData.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Remove fixed width/height so CSS controls it
  const cleanSvg = svgData
    .replace(/\s(width|height)="[^"]*"/g, '')
    .replace('<svg', '<svg style="width: 38mm; height: 38mm; display: block; margin: 0 auto;"');

  const stickersHtml = Array.from({ length: count })
    .map(
      (_, i) => `
      <div class="sticker">
        <div class="qr-box">
          ${cleanSvg}
        </div>
      </div>
      ${i < count - 1 ? '<div class="cut-guide">✂ - - - - - - - - - - - - - - - ✂</div>' : ''}
    `,
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Stickers QR Bouteille (${count}x)</title>
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
            background: #fff;
            color: #000;
            padding: 3mm 0;
            font-family: 'Courier New', Courier, monospace;
          }
          .sticker {
            width: 58mm;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 2mm 0;
            page-break-inside: avoid;
          }
          .qr-box {
            width: 38mm;
            height: 38mm;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .cut-guide {
            width: 50mm;
            margin: 3mm auto;
            text-align: center;
            font-size: 8px;
            color: #444;
            letter-spacing: 1px;
            user-select: none;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        ${stickersHtml}
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

/**
 * Generates and downloads a vector-sharp 58mm PDF for Option B QR stickers.
 */
export async function downloadThermalQrPdf(svgId: string, order: Order, count: number = 1): Promise<void> {
  try {
    const qrDataUrl = await getSvgDataUrl(svgId);
    const { pdf } = await import('@react-pdf/renderer');
    const React = await import('react');
    const { StickersQrThermiquePDF } = await import('@/components/pdf/StickersQrThermiquePDF');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = await pdf(React.createElement(StickersQrThermiquePDF, { qrDataUrl, count }) as any).toBlob();
    const cleanName = order.cocktailNameSnapshot ? order.cocktailNameSnapshot.replace(/\s+/g, '-').slice(0, 20) : 'cocktail';
    triggerDownload(blob, `Stickers_QR_58mm_${cleanName}_x${count}.pdf`);
  } catch (err) {
    console.error('Failed to generate thermal QR sticker PDF:', err);
  }
}

