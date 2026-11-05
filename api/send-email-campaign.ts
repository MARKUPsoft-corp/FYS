import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

// ── Configuration Firebase Admin ─────────────────────────────────────────────

function getFirebaseAdminApp() {
  if (!getApps().length) {
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getApps()[0];
}

// ── Configuration Email & Provider ───────────────────────────────────────────

const WHATSAPP_PHONE = '237650437427';
const DEFAULT_PREFILLED_MSG =
  'Bonjour NutriFYS ! Je suis client FYS et je souhaite activer mon suivi nutritionnel sur WhatsApp 🌿';

function getWhatsAppUrl(prefilledText: string = DEFAULT_PREFILLED_MSG) {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(prefilledText)}`;
}

function getQrCodeUrl(targetUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=png&data=${encodeURIComponent(targetUrl)}`;
}

// ── Génération du Template HTML FYS Haute Qualité (Campagne WhatsApp) ─────────

export function generateCampaignHtml(options: {
  userName: string;
  userEmail?: string;
  waUrl: string;
  qrCodeUrl?: string;
  qrCodeSrc?: string;
}): string {
  const { userName, waUrl, qrCodeUrl, qrCodeSrc } = options;
  const qrImage = qrCodeSrc || qrCodeUrl || getQrCodeUrl(waUrl);
  const firstName = userName && userName !== 'Client WhatsApp' && userName !== 'Client'
    ? userName.split(' ')[0]
    : 'cher(e) client(e)';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Composez vos jus désormais sur WhatsApp · FYS For YourSelf</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F6F4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F4F6F4; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 28px; overflow: hidden; box-shadow: 0 12px 35px rgba(0,0,0,0.07); border: 1px solid #E5E7EB;">
          
          <!-- En-tête Vert Émeraude FYS avec Logo Centré en Grand -->
          <tr>
            <td style="background: linear-gradient(135deg, #042E25 0%, #064E3B 55%, #0F765E 100%); padding: 42px 30px 36px 30px; text-align: center; color: #FFFFFF;">
              
              <!-- Logo FYS For YourSelf en grand et centré -->
              <div style="text-align: center; margin-bottom: 22px;">
                <img src="https://www.fys-app.com/logos/Logo_fys_creme.png" alt="FYS - For YourSelf" width="210" style="display: inline-block; max-width: 230px; height: auto; border: 0;" />
              </div>

              <!-- Badge FOR YOURSELF -->
              <div style="display: inline-block; background-color: rgba(255,255,255,0.15); padding: 5px 18px; border-radius: 50px; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; color: #A7F3D0; border: 1px solid rgba(255,255,255,0.25);">
                FYS · FOR YOURSELF
              </div>

              <!-- Titre fort demandé -->
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; line-height: 1.3; color: #FFFFFF; letter-spacing: -0.5px;">
                Composez vos jus désormais sur WhatsApp
              </h1>

              <p style="margin: 12px auto 0 auto; font-size: 14px; color: #D1FAE5; line-height: 1.55; max-width: 460px;">
                Votre nutritionniste personnel intelligent NutriFYS vous accompagne 24h/24 avec des conseils sur-mesure et des jus 100% frais et naturels.
              </p>
            </td>
          </tr>

          <!-- Corps du message -->
          <tr>
            <td style="padding: 36px 30px 24px 30px;">
              <p style="font-size: 17px; font-weight: 700; color: #064E3B; margin: 0 0 16px 0;">
                Bonjour ${firstName},
              </p>
              <p style="font-size: 15px; line-height: 1.65; color: #374151; margin: 0 0 20px 0;">
                Au quotidien, écouter son corps et savoir quels fruits et boosters privilégier selon vos objectifs (énergie, détox, digestion, sommeil ou renforcement immunitaire) n'est pas toujours simple.
              </p>
              <p style="font-size: 15px; line-height: 1.65; color: #374151; margin: 0 0 28px 0;">
                C'est pourquoi nous avons le plaisir de vous présenter <strong>NutriFYS</strong>, votre assistant nutritionniste intelligent, désormais disponible directement dans votre <strong>WhatsApp</strong> !
              </p>

              <!-- Les 3 Piliers de NutriFYS avec Icônes SVG Vectorielles -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="background-color: #F0FDF4; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 0 14px 14px 0;">
                    <div style="margin-bottom: 4px;">
                      <!-- SVG Éclair / Bilan Vitalité -->
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px; display: inline-block;">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                      <strong style="color: #065F46; font-size: 14px; vertical-align: middle; display: inline-block;">
                        1. Bilan vitalité &amp; conseils sur-mesure
                      </strong>
                    </div>
                    <span style="color: #4B5563; font-size: 13px; line-height: 1.5; display: block;">
                      Envoyez un message ou une note vocale : NutriFYS analyse vos besoins et compose la recette idéale pour équilibrer votre corps.
                    </span>
                  </td>
                </tr>
                <tr><td style="height: 12px;"></td></tr>
                <tr>
                  <td style="background-color: #F0FDF4; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 0 14px 14px 0;">
                    <div style="margin-bottom: 4px;">
                      <!-- SVG Cocktail / Bouteille Fraîcheur -->
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px; display: inline-block;">
                        <path d="M18 2h-6a4 4 0 0 0-4 4v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/>
                        <path d="M6 8h12"/>
                      </svg>
                      <strong style="color: #065F46; font-size: 14px; vertical-align: middle; display: inline-block;">
                        2. Commandes personnalisées et livraison
                      </strong>
                    </div>
                    <span style="color: #4B5563; font-size: 13px; line-height: 1.5; display: block;">
                      Format 500ml ou 1 Litre, livraison partout à Yaoundé (1 000 XAF fixe). Commandez directement par discussion sans formulaire !
                    </span>
                  </td>
                </tr>
                <tr><td style="height: 12px;"></td></tr>
                <tr>
                  <td style="background-color: #F0FDF4; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 0 14px 14px 0;">
                    <div style="margin-bottom: 4px;">
                      <!-- SVG Fiche Santé / Certificat -->
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px; display: inline-block;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                      <strong style="color: #065F46; font-size: 14px; vertical-align: middle; display: inline-block;">
                        3. Fiches nutritionnelles &amp; Reçus PDF
                      </strong>
                    </div>
                    <span style="color: #4B5563; font-size: 13px; line-height: 1.5; display: block;">
                      Recevez instantanément dans la discussion WhatsApp la fiche santé certifiée de vos cocktails et vos factures officielles.
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Action Mobile : Bouton Vert avec Logo SVG WhatsApp Officiel -->
              <div style="text-align: center; margin: 34px 0 28px 0;">
                <a href="${waUrl}" target="_blank" style="display: inline-block; background-color: #25D366; color: #FFFFFF; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 50px; box-shadow: 0 6px 20px rgba(37, 211, 102, 0.35); text-align: center;">
                  <!-- Logo WhatsApp SVG -->
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF" style="vertical-align: middle; margin-right: 8px; display: inline-block;">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span style="vertical-align: middle;">Discuter avec NutriFYS sur WhatsApp</span>
                </a>
                <p style="margin: 9px 0 0 0; font-size: 12px; color: #6B7280;">
                  (Un clic ouvre directement la discussion WhatsApp avec notre numéro officiel <strong>650 437 427</strong>)
                </p>
              </div>

              <!-- Action Ordinateur : Encadré QR Code avec SVG Ordinateur -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F9FAFB; border: 1px dashed #D1D5DB; border-radius: 18px; padding: 20px; text-align: center; margin-top: 24px;">
                <tr>
                  <td align="center">
                    <p style="font-size: 13px; font-weight: 700; color: #1F2937; margin: 0 0 12px 0;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px; display: inline-block;">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                      <span style="vertical-align: middle;">Vous lisez cet email sur votre ordinateur ?</span>
                    </p>
                    <div style="display: inline-block; padding: 10px; background-color: #FFFFFF; border-radius: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #E5E7EB;">
                      <img src="${qrImage}" width="160" height="160" alt="Scannez pour ouvrir WhatsApp" style="display: block; border-radius: 8px;" />
                    </div>
                    <p style="font-size: 12px; color: #4B5563; margin: 10px 0 0 0;">
                      Pointez l'appareil photo de votre téléphone sur le QR Code pour rejoindre NutriFYS instantanément !
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Pied de page Officiel FYS For YourSelf (Conforme Anti-Spam) -->
          <tr>
            <td style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 24px 30px; text-align: center; font-size: 12px; color: #6B7280; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 700; color: #1F2937;">
                FYS — For YourSelf · Yaoundé, Cameroun
              </p>
              <p style="margin: 0 0 8px 0;">
                Atelier artisanal de jus et cocktails frais 100% naturels, sans conservateurs ni sucre ajouté.
              </p>
              <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
                Vous recevez cet email car vous êtes client sur <a href="https://fys-app.com" target="_blank" style="color: #064E3B; font-weight: 600; text-decoration: underline;">fys-app.com</a>. Pour ne plus recevoir nos annonces ou gérer vos préférences, <a href="https://fys-app.com/profile" target="_blank" style="color: #064E3B; text-decoration: underline;">cliquez ici</a> ou répondez « STOP » à cet email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Génération de Template HTML pour Message Personnalisé & Pièces Jointes ────

export function generateCustomEmailHtml(options: {
  userName: string;
  userEmail?: string;
  headline?: string;
  messageContent: string;
  ctaText?: string;
  ctaUrl?: string;
  attachments?: Array<{ filename: string }>;
}): string {
  const { userName, headline, messageContent, ctaText, ctaUrl, attachments } = options;
  const firstName = userName && userName !== 'Client WhatsApp' && userName !== 'Client'
    ? userName.split(' ')[0]
    : 'cher(e) client(e)';

  // Remplacer les variables {{name}} et {{email}} dans le message
  const parsedMessage = messageContent
    .replace(/\{\{\s*name\s*\}\}/gi, firstName)
    .replace(/\{\{\s*email\s*\}\}/gi, options.userEmail || '')
    .split('\n\n')
    .map(p => `<p style="font-size: 15px; line-height: 1.65; color: #374151; margin: 0 0 16px 0;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const attachmentsListHtml = attachments && attachments.length > 0
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 14px 18px; margin: 24px 0 16px 0;">
        <tr>
          <td>
            <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px; display: inline-block;">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              <span style="vertical-align: middle;">Pièces jointes incluses (${attachments.length}) :</span>
            </div>
            ${attachments.map(att => `
              <div style="font-size: 13px; color: #475569; padding: 4px 0;">
                📄 <strong>${att.filename}</strong>
              </div>
            `).join('')}
          </td>
        </tr>
      </table>`
    : '';

  const ctaButtonHtml = ctaText && ctaUrl
    ? `<div style="text-align: center; margin: 32px 0 24px 0;">
        <a href="${ctaUrl}" target="_blank" style="display: inline-block; background-color: #064E3B; color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 50px; box-shadow: 0 4px 15px rgba(6, 78, 59, 0.25); text-align: center;">
          ${ctaText}
        </a>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline || 'Message FYS For YourSelf'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F6F4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F4F6F4; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 28px; overflow: hidden; box-shadow: 0 12px 35px rgba(0,0,0,0.07); border: 1px solid #E5E7EB;">
          
          <!-- En-tête Vert Émeraude FYS avec Logo Centré -->
          <tr>
            <td style="background: linear-gradient(135deg, #042E25 0%, #064E3B 55%, #0F765E 100%); padding: 38px 30px; text-align: center; color: #FFFFFF;">
              
              <!-- Logo FYS For YourSelf en grand et centré -->
              <div style="text-align: center; margin-bottom: 18px;">
                <img src="https://www.fys-app.com/logos/Logo_fys_creme.png" alt="FYS - For YourSelf" width="200" style="display: inline-block; max-width: 220px; height: auto; border: 0;" />
              </div>

              <!-- Badge FOR YOURSELF -->
              <div style="display: inline-block; background-color: rgba(255,255,255,0.15); padding: 5px 16px; border-radius: 50px; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; color: #A7F3D0; border: 1px solid rgba(255,255,255,0.25);">
                FYS · FOR YOURSELF
              </div>

              ${headline ? `<h1 style="margin: 0; font-size: 24px; font-weight: 800; line-height: 1.3; color: #FFFFFF; letter-spacing: -0.5px;">${headline}</h1>` : ''}
            </td>
          </tr>

          <!-- Corps du message -->
          <tr>
            <td style="padding: 36px 30px 24px 30px;">
              <p style="font-size: 16px; font-weight: 700; color: #064E3B; margin: 0 0 18px 0;">
                Bonjour ${firstName},
              </p>
              
              ${parsedMessage}

              ${attachmentsListHtml}

              ${ctaButtonHtml}
            </td>
          </tr>

          <!-- Pied de page Officiel FYS For YourSelf (Conforme Anti-Spam) -->
          <tr>
            <td style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 24px 30px; text-align: center; font-size: 12px; color: #6B7280; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 700; color: #1F2937;">
                FYS — For YourSelf · Yaoundé, Cameroun
              </p>
              <p style="margin: 0 0 8px 0;">
                Atelier artisanal de jus et cocktails frais 100% naturels, sans conservateurs ni sucre ajouté.
              </p>
              <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
                Vous recevez cet email car vous êtes client sur <a href="https://fys-app.com" target="_blank" style="color: #064E3B; font-weight: 600; text-decoration: underline;">fys-app.com</a>. Pour ne plus recevoir nos annonces ou gérer vos préférences, <a href="https://fys-app.com/profile" target="_blank" style="color: #064E3B; text-decoration: underline;">cliquez ici</a> ou répondez « STOP » à cet email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Conversion HTML vers Plain-Text (Nécessaire Anti-Spam RFC 2046) ──────────

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

let cachedQrCodeBase64: string | null = null;
async function getQrCodeBase64(targetUrl: string): Promise<string | null> {
  if (cachedQrCodeBase64) return cachedQrCodeBase64;
  try {
    const res = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=png&data=${encodeURIComponent(targetUrl)}`);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    cachedQrCodeBase64 = Buffer.from(arrayBuf).toString('base64');
    return cachedQrCodeBase64;
  } catch {
    return null;
  }
}

// ── Configuration SMTP Pooled Singleton (Évite 454 Too Many Logins) ────────
let sharedSmtpTransporter: nodemailer.Transporter | null = null;

function getSharedSmtpTransporter(smtpHost: string, smtpPort: number, smtpUser: string, smtpPass: string) {
  if (!sharedSmtpTransporter) {
    sharedSmtpTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      pool: true, // Réutilise la même session SMTP connectée (évite 454 Too many logins)
      maxConnections: 1, // 1 seule connexion persistante vers Google
      maxMessages: 100, // Permet d'envoyer jusqu'à 100 emails sur cette même session
      rateDelta: 1000,
      rateLimit: 1, // Maximum 1 email par seconde
    });
  }
  return sharedSmtpTransporter;
}

// ── Fonction d'Envoi d'Email Multi-Fournisseurs (Resend ou SMTP/Gmail) ─────────

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType?: string;
    cid?: string;
  }>;
}): Promise<{ success: boolean; error?: string; provider: string }> {
  const { to, subject, html, text, attachments } = options;

  let lastError = '';

  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || (smtpUser?.includes('@gmail.com') ? 'smtp.gmail.com' : undefined);
  const smtpPort = Number(process.env.SMTP_PORT) || 465;

  const hasResendKey = Boolean(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'FYS For YourSelf <onboarding@resend.dev>';
  const isUnverifiedResendDomain = fromEmail.includes('@resend.dev');

  const preferSmtp = Boolean(smtpUser && smtpPass && smtpHost && (isUnverifiedResendDomain || !hasResendKey));

  const antiSpamHeaders = {
    'List-Unsubscribe': `<mailto:${smtpUser || 'fysappcameroun@gmail.com'}?subject=Unsubscribe>, <https://www.fys-app.com/profile>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'Precedence': 'bulk',
    'X-Entity-Ref-ID': `fys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    'X-Auto-Response-Suppress': 'OOF, AutoReply',
    'X-Mailer': 'FYS For YourSelf Mailer',
  };

  const plainTextContent = text || htmlToPlainText(html);

  async function trySmtp() {
    if (!smtpUser || !smtpPass || !smtpHost) return null;
    try {
      const transporter = getSharedSmtpTransporter(smtpHost, smtpPort, smtpUser, smtpPass);

      const fromAddress = process.env.SMTP_FROM || `"FYS - For YourSelf" <${smtpUser}>`;
      const mailOptions: any = {
        from: fromAddress,
        to,
        subject,
        html,
        text: plainTextContent,
        headers: antiSpamHeaders,
      };

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map((att) => ({
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
          contentType: att.contentType,
          ...(att.cid ? { cid: att.cid } : {}),
        }));
      }

      await transporter.sendMail(mailOptions);

      return { success: true, provider: 'smtp' };
    } catch (e: any) {
      console.error('[send-email-campaign] SMTP failed:', e);
      lastError = e?.message || 'SMTP error';
      // Si la connexion a été coupée, réinitialiser le pool pour la prochaine tentative
      sharedSmtpTransporter = null;
      return null;
    }
  }

  async function tryResend() {
    if (!hasResendKey) return null;
    try {
      const bodyPayload: any = {
        from: fromEmail,
        to: [to],
        subject,
        html,
        text: plainTextContent,
        headers: antiSpamHeaders,
      };

      if (attachments && attachments.length > 0) {
        bodyPayload.attachments = attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          ...(att.cid ? { content_id: att.cid } : {}),
        }));
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        throw new Error(data?.message || `Resend error HTTP ${res.status}`);
      }
      return { success: true, provider: 'resend' };
    } catch (e: any) {
      lastError = e?.message || String(e);
      console.warn('[send-email-campaign] Resend failed, trying fallback:', lastError);
      return null;
    }
  }

  if (preferSmtp) {
    const smtpRes = await trySmtp();
    if (smtpRes) return smtpRes;
    const resendRes = await tryResend();
    if (resendRes) return resendRes;
  } else {
    const resendRes = await tryResend();
    if (resendRes) return resendRes;
    const smtpRes = await trySmtp();
    if (smtpRes) return smtpRes;
  }

  return {
    success: false,
    error: lastError || 'Aucun fournisseur email configuré (veuillez ajouter RESEND_API_KEY ou SMTP_USER/SMTP_PASS).',
    provider: preferSmtp ? 'smtp' : (hasResendKey ? 'resend' : 'none'),
  };
}

// ── Handler Principal HTTP ───────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS basique
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const app = getFirebaseAdminApp();
    const db = getFirestore(app);

    // ── 1. GET ou POST preview : statistiques et prévisualisation ──
    if (req.method === 'GET' || req.body?.action === 'preview' || req.body?.action === 'stats') {
      const usersSnap = await db.collection('users').get();
      const eligibleUsers: Array<{ uid: string; name: string; email: string; phone?: string }> = [];

      usersSnap.docs.forEach((doc) => {
        const d = doc.data();
        const email = (d.email || '').trim().toLowerCase();
        if (email && email.includes('@') && email.includes('.')) {
          eligibleUsers.push({
            uid: doc.id,
            name: d.name || 'Client FYS',
            email,
            phone: d.phone || '',
          });
        }
      });

      const sampleUser = eligibleUsers[0] || { name: 'Emmanuel', email: 'client@fys-app.com' };
      const personalizedWaMsg = `Bonjour NutriFYS ! Je suis ${sampleUser.name} (${sampleUser.email}) et je souhaite activer mon suivi nutritionnel sur WhatsApp 🌿`;
      const waUrl = getWhatsAppUrl(personalizedWaMsg);
      const qrCodeUrl = getQrCodeUrl(waUrl);

      const previewHtml = generateCampaignHtml({
        userName: sampleUser.name,
        userEmail: sampleUser.email,
        waUrl,
        qrCodeUrl,
      });

      const smtpConfigured = Boolean(
        (process.env.SMTP_USER && process.env.SMTP_PASS) ||
        (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
      );
      const resendConfigured = Boolean(process.env.RESEND_API_KEY);
      const resendFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const isVerifiedResend = resendConfigured && !resendFrom.includes('@resend.dev');

      let activeProvider = 'none';
      if (isVerifiedResend) activeProvider = 'resend';
      else if (smtpConfigured) activeProvider = 'smtp';
      else if (resendConfigured) activeProvider = 'resend';

      return res.status(200).json({
        totalUsers: usersSnap.size,
        eligibleEmailCount: eligibleUsers.length,
        eligibleUsers: eligibleUsers.slice(0, 50),
        providerConfigured: smtpConfigured || resendConfigured,
        activeProvider,
        previewHtml,
        sampleWaUrl: waUrl,
        sampleQrCodeUrl: qrCodeUrl,
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, testEmail, customSubject } = req.body || {};
    const subject = customSubject || 'NutriFYS sur WhatsApp : vos jus personnalisés avec FYS';

    // ── 2. Envoi d'un email de test ──
    if (action === 'send_test') {
      const recipient = (testEmail || '').trim();
      if (!recipient || !recipient.includes('@')) {
        return res.status(400).json({ error: 'Adresse email de test invalide' });
      }

      const waMsg = `Bonjour NutriFYS ! Je suis un client FYS (test) et je viens découvrir mon suivi nutrition sur WhatsApp 🌿`;
      const waUrl = getWhatsAppUrl(waMsg);
      const qrCodeUrl = getQrCodeUrl(waUrl);

      // Préparer le QR code en pièce jointe CID pour éviter le blocage par les filtres antispam
      const genericWaUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent('Bonjour NutriFYS ! Je souhaite activer mon suivi nutritionnel sur WhatsApp')}`;
      const qrBase64 = await getQrCodeBase64(genericWaUrl);

      const emailAttachments: any[] = [];
      let qrCodeSrc: string | undefined = undefined;
      if (qrBase64) {
        emailAttachments.push({
          filename: 'nutrifys-qr.png',
          content: qrBase64,
          contentType: 'image/png',
          cid: 'nutrifys-qr@fys-app.com',
        });
        qrCodeSrc = 'cid:nutrifys-qr@fys-app.com';
      }

      const html = generateCampaignHtml({
        userName: 'Admin / Testeur FYS',
        userEmail: recipient,
        waUrl,
        qrCodeUrl,
        qrCodeSrc,
      });

      const sendResult = await sendEmail({
        to: recipient,
        subject: `[TEST FYS] ${subject}`,
        html,
        attachments: emailAttachments,
      });

      if (!sendResult.success) {
        return res.status(400).json({
          error: sendResult.error || 'Échec de l\'envoi du test',
          provider: sendResult.provider,
        });
      }

      return res.status(200).json({
        success: true,
        message: `Email de test envoyé avec succès à ${recipient}`,
        provider: sendResult.provider,
      });
    }

    // ── 3. Lancement de la campagne collective à tous les utilisateurs (Support par Lots) ──
    if (action === 'send_campaign') {
      const usersSnap = await db.collection('users').get();
      const recipients: Array<{ uid: string; name: string; email: string }> = [];

      usersSnap.docs.forEach((doc) => {
        const d = doc.data();
        const email = (d.email || '').trim().toLowerCase();
        if (email && email.includes('@') && email.includes('.')) {
          if (!recipients.some((r) => r.email === email)) {
            recipients.push({
              uid: doc.id,
              name: d.name || 'Client FYS',
              email,
            });
          }
        }
      });

      if (recipients.length === 0) {
        return res.status(400).json({ error: 'Aucun utilisateur avec adresse email trouvé.' });
      }

      const isBatched = typeof req.body?.offset === 'number';
      const offset = Number(req.body?.offset) || 0;
      const limit = Number(req.body?.limit) || (isBatched ? 10 : recipients.length);
      const currentBatch = recipients.slice(offset, offset + limit);

      console.log(`[send-email-campaign] WhatsApp campaign: processing batch ${offset + 1}-${offset + currentBatch.length} of ${recipients.length}...`);

      const genericWaUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent('Bonjour NutriFYS ! Je souhaite activer mon suivi nutritionnel sur WhatsApp')}`;
      const qrBase64 = await getQrCodeBase64(genericWaUrl);

      const emailAttachments: any[] = [];
      let qrCodeSrc: string | undefined = undefined;
      if (qrBase64) {
        emailAttachments.push({
          filename: 'nutrifys-qr.png',
          content: qrBase64,
          contentType: 'image/png',
          cid: 'nutrifys-qr@fys-app.com',
        });
        qrCodeSrc = 'cid:nutrifys-qr@fys-app.com';
      }

      let sentCount = 0;
      let failedCount = 0;
      const failures: Array<{ email: string; error: string }> = [];

      for (const user of currentBatch) {
        const personalizedWaMsg = `Bonjour NutriFYS ! Je suis ${user.name} (${user.email}) et je souhaite activer mon suivi nutritionnel sur WhatsApp 🌿`;
        const waUrl = getWhatsAppUrl(personalizedWaMsg);
        const qrCodeUrl = getQrCodeUrl(waUrl);

        const html = generateCampaignHtml({
          userName: user.name,
          userEmail: user.email,
          waUrl,
          qrCodeUrl,
          qrCodeSrc,
        });

        const resEmail = await sendEmail({
          to: user.email,
          subject,
          html,
          attachments: emailAttachments,
        });

        if (resEmail.success) {
          sentCount++;
        } else {
          failedCount++;
          failures.push({ email: user.email, error: resEmail.error || 'Inconnu' });
        }

        // Délai de 1000ms entre chaque email pour protéger la réputation d'envoi et éviter les filtres spam
        await new Promise((r) => setTimeout(r, 1000));
      }

      const hasMore = offset + limit < recipients.length;
      const nextOffset = hasMore ? offset + limit : null;

      if (!hasMore || !isBatched) {
        await db.collection('email_campaigns').add({
          type: 'whatsapp_drainage',
          subject,
          recipientsTotal: recipients.length,
          sentCount,
          failedCount,
          failures: failures.slice(0, 20),
          sentAt: new Date(),
        }).catch((e) => console.warn('[send-email-campaign] Failed to log campaign to Firestore:', e));
      }

      return res.status(200).json({
        success: true,
        sentCount,
        failedCount,
        totalRecipients: recipients.length,
        offset,
        limit,
        hasMore,
        nextOffset,
        failures,
      });
    }

    // ── 4. Prévisualisation d'un email personnalisé ──
    if (action === 'preview_custom') {
      const {
        customHeadline,
        customMessage = '',
        ctaText,
        ctaUrl,
        attachments = [],
      } = req.body || {};

      const previewHtml = generateCustomEmailHtml({
        userName: 'Aline Kouam',
        userEmail: 'client@fys-app.com',
        headline: customHeadline?.trim() || undefined,
        messageContent: customMessage || 'Bonjour {{name}},\n\nVoici votre message personnalisé.',
        ctaText: ctaText?.trim() || undefined,
        ctaUrl: ctaUrl?.trim() || undefined,
        attachments: attachments.map((a: any) => ({ filename: a.filename })),
      });

      return res.status(200).json({ previewHtml });
    }

    // ── 5. Envoi d'un email de test personnalisé ──
    if (action === 'send_custom_test') {
      const {
        testEmail,
        customSubject,
        customHeadline,
        customMessage,
        ctaText,
        ctaUrl,
        attachments = [],
      } = req.body || {};

      const recipient = (testEmail || '').trim();
      if (!recipient || !recipient.includes('@')) {
        return res.status(400).json({ error: 'Adresse email de test invalide' });
      }
      if (!customMessage || !customMessage.trim()) {
        return res.status(400).json({ error: 'Le corps du message ne peut pas être vide' });
      }

      const subject = customSubject?.trim() || '🌿 Message de votre équipe FYS For YourSelf';
      const html = generateCustomEmailHtml({
        userName: 'Admin / Testeur FYS',
        userEmail: recipient,
        headline: customHeadline?.trim() || undefined,
        messageContent: customMessage,
        ctaText: ctaText?.trim() || undefined,
        ctaUrl: ctaUrl?.trim() || undefined,
        attachments: attachments.map((a: any) => ({ filename: a.filename })),
      });

      const sendResult = await sendEmail({
        to: recipient,
        subject: `[TEST FYS] ${subject}`,
        html,
        attachments,
      });

      if (!sendResult.success) {
        return res.status(400).json({
          error: sendResult.error || 'Échec de l\'envoi du test personnalisé',
          provider: sendResult.provider,
        });
      }

      return res.status(200).json({
        success: true,
        message: `Email personnalisé de test envoyé avec succès à ${recipient}`,
        provider: sendResult.provider,
      });
    }

    // ── 6. Lancement de la diffusion personnalisée à tous les utilisateurs ──
    if (action === 'send_custom_campaign') {
      const {
        customSubject,
        customHeadline,
        customMessage,
        ctaText,
        ctaUrl,
        attachments = [],
      } = req.body || {};

      if (!customMessage || !customMessage.trim()) {
        return res.status(400).json({ error: 'Le corps du message ne peut pas être vide' });
      }

      const subject = customSubject?.trim() || '🌿 Message de votre équipe FYS For YourSelf';

      const usersSnap = await db.collection('users').get();
      const recipients: Array<{ uid: string; name: string; email: string }> = [];

      usersSnap.docs.forEach((doc) => {
        const d = doc.data();
        const email = (d.email || '').trim().toLowerCase();
        if (email && email.includes('@') && email.includes('.')) {
          if (!recipients.some((r) => r.email === email)) {
            recipients.push({
              uid: doc.id,
              name: d.name || 'Client FYS',
              email,
            });
          }
        }
      });

      if (recipients.length === 0) {
        return res.status(400).json({ error: 'Aucun utilisateur avec adresse email trouvé.' });
      }

      const isBatched = typeof req.body?.offset === 'number';
      const offset = Number(req.body?.offset) || 0;
      const limit = Number(req.body?.limit) || (isBatched ? 10 : recipients.length);
      const currentBatch = recipients.slice(offset, offset + limit);

      console.log(`[send-email-campaign] Custom broadcast: processing batch ${offset + 1}-${offset + currentBatch.length} of ${recipients.length}...`);

      let sentCount = 0;
      let failedCount = 0;
      const failures: Array<{ email: string; error: string }> = [];

      for (const user of currentBatch) {
        const html = generateCustomEmailHtml({
          userName: user.name,
          userEmail: user.email,
          headline: customHeadline?.trim() || undefined,
          messageContent: customMessage,
          ctaText: ctaText?.trim() || undefined,
          ctaUrl: ctaUrl?.trim() || undefined,
          attachments: attachments.map((a: any) => ({ filename: a.filename })),
        });

        const resEmail = await sendEmail({
          to: user.email,
          subject,
          html,
          attachments,
        });

        if (resEmail.success) {
          sentCount++;
        } else {
          failedCount++;
          failures.push({ email: user.email, error: resEmail.error || 'Inconnu' });
        }

        // Délai de 1000ms entre chaque envoi pour respecter les filtres anti-spam
        await new Promise((r) => setTimeout(r, 1000));
      }

      const hasMore = offset + limit < recipients.length;
      const nextOffset = hasMore ? offset + limit : null;

      if (!hasMore || !isBatched) {
        await db.collection('email_campaigns').add({
          type: 'custom_broadcast',
          subject,
          headline: customHeadline || null,
          attachmentsCount: attachments.length,
          attachmentsNames: attachments.map((a: any) => a.filename),
          recipientsTotal: recipients.length,
          sentCount,
          failedCount,
          failures: failures.slice(0, 20),
          sentAt: new Date(),
        }).catch((e) => console.warn('[send-email-campaign] Failed to log custom campaign to Firestore:', e));
      }

      return res.status(200).json({
        success: true,
        sentCount,
        failedCount,
        totalRecipients: recipients.length,
        offset,
        limit,
        hasMore,
        nextOffset,
        failures,
      });
    }

    return res.status(400).json({
      error: 'Action non reconnue (valeurs possibles: preview, stats, send_test, send_campaign, preview_custom, send_custom_test, send_custom_campaign)',
    });
  } catch (error: any) {
    console.error('[send-email-campaign] Unexpected handler error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
