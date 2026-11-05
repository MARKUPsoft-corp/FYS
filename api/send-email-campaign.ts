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

const WHATSAPP_PHONE = '237675108876';
const DEFAULT_PREFILLED_MSG =
  'Bonjour NutriFYS ! Je suis client FYS et je souhaite activer mon suivi nutritionnel sur WhatsApp 🌿';

function getWhatsAppUrl(prefilledText: string = DEFAULT_PREFILLED_MSG) {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(prefilledText)}`;
}

function getQrCodeUrl(targetUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=png&data=${encodeURIComponent(targetUrl)}`;
}

// ── Génération du Template HTML FYS Haute Qualité ─────────────────────────────

export function generateCampaignHtml(options: {
  userName: string;
  userEmail?: string;
  waUrl: string;
  qrCodeUrl: string;
}): string {
  const { userName, waUrl, qrCodeUrl } = options;
  const firstName = userName && userName !== 'Client WhatsApp' && userName !== 'Client'
    ? userName.split(' ')[0]
    : 'cher(e) ami(e) du bien-être';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NutriFYS sur WhatsApp</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F6F4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F4F6F4; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #E5E7EB;">
          
          <!-- En-tête Vert Forêt FYS -->
          <tr>
            <td style="background: linear-gradient(135deg, #063A2F 0%, #0B4D3C 60%, #156650 100%); padding: 36px 30px; text-align: center; color: #FFFFFF;">
              <div style="display: inline-block; background-color: rgba(255,255,255,0.15); padding: 6px 16px; border-radius: 50px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; color: #A7F3D0; border: 1px solid rgba(255,255,255,0.2);">
                🌱 FYS · FRESH &amp; YOUNG SPIRIT
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; line-height: 1.25; color: #FFFFFF; letter-spacing: -0.5px;">
                Votre Nutritionniste Personnel est désormais sur WhatsApp !
              </h1>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #D1FAE5; line-height: 1.5;">
                Prenez soin de votre corps au quotidien avec des conseils sur-mesure et des jus 100% frais.
              </p>
            </td>
          </tr>

          <!-- Corps du message -->
          <tr>
            <td style="padding: 36px 30px 24px 30px;">
              <p style="font-size: 17px; font-weight: 700; color: #063A2F; margin: 0 0 16px 0;">
                Bonjour ${firstName} 👋,
              </p>
              <p style="font-size: 15px; line-height: 1.65; color: #374151; margin: 0 0 20px 0;">
                Au quotidien, écouter son corps et savoir quels fruits privilégier selon son rythme de vie (fatigue, digestion, sommeil ou activité physique) n'est pas toujours simple.
              </p>
              <p style="font-size: 15px; line-height: 1.65; color: #374151; margin: 0 0 28px 0;">
                C'est pourquoi nous avons le plaisir de vous présenter <strong>NutriFYS</strong>, votre assistant nutritionniste intelligent, désormais disponible <strong>24h/24 directement dans votre WhatsApp</strong> !
              </p>

              <!-- Les 3 Piliers de NutriFYS -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="background-color: #F0FDF4; border-left: 4px solid #10B981; padding: 14px 18px; border-radius: 0 14px 14px 0; margin-bottom: 12px;">
                    <strong style="color: #065F46; font-size: 14px; display: block; margin-bottom: 3px;">
                      ⚡ 1. Bilan santé express &amp; offert
                    </strong>
                    <span style="color: #4B5563; font-size: 13px; line-height: 1.5;">
                      Envoyez une note vocale ou un message sur ce que vous ressentez : NutriFYS compose la recette idéale pour rééquilibrer votre énergie.
                    </span>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="background-color: #F0FDF4; border-left: 4px solid #10B981; padding: 14px 18px; border-radius: 0 14px 14px 0; margin-bottom: 12px;">
                    <strong style="color: #065F46; font-size: 14px; display: block; margin-bottom: 3px;">
                      🍹 2. Commande sans formulaire en 30 secondes
                    </strong>
                    <span style="color: #4B5563; font-size: 13px; line-height: 1.5;">
                      Format 500ml ou 1 Litre, livraison partout à Yaoundé (1 000 XAF fixe). Commandez directement par message !
                    </span>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="background-color: #F0FDF4; border-left: 4px solid #10B981; padding: 14px 18px; border-radius: 0 14px 14px 0;">
                    <strong style="color: #065F46; font-size: 14px; display: block; margin-bottom: 3px;">
                      📄 3. Fiches nutritionnelles &amp; Factures PDF
                    </strong>
                    <span style="color: #4B5563; font-size: 13px; line-height: 1.5;">
                      Recevez instantanément la fiche santé certifiée de vos cocktails et vos reçus officiels.
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Action Mobile : Bouton Vert WhatsApp -->
              <div style="text-align: center; margin: 32px 0 28px 0;">
                <a href="${waUrl}" target="_blank" style="display: inline-block; background-color: #25D366; color: #FFFFFF; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 50px; box-shadow: 0 6px 20px rgba(37, 211, 102, 0.35); text-align: center;">
                  💬 Discuter avec NutriFYS sur WhatsApp
                </a>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #6B7280;">
                  (Un clic ouvre directement la discussion WhatsApp sur votre smartphone)
                </p>
              </div>

              <!-- Action Ordinateur : Encadré QR Code -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F9FAFB; border: 1px dashed #D1D5DB; border-radius: 18px; padding: 20px; text-align: center; margin-top: 24px;">
                <tr>
                  <td align="center">
                    <p style="font-size: 13px; font-weight: 700; color: #1F2937; margin: 0 0 12px 0;">
                      💻 Vous lisez cet email sur votre ordinateur ?
                    </p>
                    <div style="display: inline-block; padding: 10px; background-color: #FFFFFF; border-radius: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #E5E7EB;">
                      <img src="${qrCodeUrl}" width="160" height="160" alt="Scannez pour ouvrir WhatsApp" style="display: block; border-radius: 8px;" />
                    </div>
                    <p style="font-size: 12px; color: #4B5563; margin: 10px 0 0 0;">
                      Pointez l'appareil photo de votre téléphone sur le QR Code pour rejoindre NutriFYS instantanément !
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Pied de page FYS -->
          <tr>
            <td style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 24px 30px; text-align: center; font-size: 12px; color: #6B7280; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #374151;">
                FYS — Fresh &amp; Young Spirit · Yaoundé, Cameroun
              </p>
              <p style="margin: 0 0 8px 0;">
                Atelier artisanal de jus et cocktails frais 100% naturels, sans conservateurs ni sucre ajouté.
              </p>
              <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
                Vous recevez cet email car vous avez un compte sur <a href="https://fys-app.com" target="_blank" style="color: #0B4D3C; text-decoration: underline;">fys-app.com</a>.
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

// ── Fonction d'Envoi d'Email Multi-Fournisseurs (Resend ou SMTP/Gmail) ─────────

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string; provider: string }> {
  const { to, subject, html } = options;

  let lastError = '';

  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || (smtpUser?.includes('@gmail.com') ? 'smtp.gmail.com' : undefined);
  const smtpPort = Number(process.env.SMTP_PORT) || 465;

  const hasResendKey = Boolean(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'FYS Fresh & Young Spirit <onboarding@resend.dev>';
  const isUnverifiedResendDomain = fromEmail.includes('@resend.dev');

  const preferSmtp = Boolean(smtpUser && smtpPass && smtpHost && (isUnverifiedResendDomain || !hasResendKey));

  async function trySmtp() {
    if (!smtpUser || !smtpPass || !smtpHost) return null;
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const fromAddress = process.env.SMTP_FROM || `"FYS - Fresh & Young Spirit" <${smtpUser}>`;
      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
      });

      return { success: true, provider: 'smtp' };
    } catch (e: any) {
      console.error('[send-email-campaign] SMTP failed:', e);
      lastError = e?.message || 'SMTP error';
      return null;
    }
  }

  async function tryResend() {
    if (!hasResendKey) return null;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html,
        }),
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
    const subject = customSubject || '🌿 Votre nutritionniste personnel NutriFYS vous attend sur WhatsApp !';

    // ── 2. Envoi d'un email de test ──
    if (action === 'send_test') {
      const recipient = (testEmail || '').trim();
      if (!recipient || !recipient.includes('@')) {
        return res.status(400).json({ error: 'Adresse email de test invalide' });
      }

      const waMsg = `Bonjour NutriFYS ! Je suis un client FYS (test) et je viens découvrir mon suivi nutrition sur WhatsApp 🌿`;
      const waUrl = getWhatsAppUrl(waMsg);
      const qrCodeUrl = getQrCodeUrl(waUrl);

      const html = generateCampaignHtml({
        userName: 'Admin / Testeur FYS',
        userEmail: recipient,
        waUrl,
        qrCodeUrl,
      });

      const sendResult = await sendEmail({
        to: recipient,
        subject: `[TEST FYS] ${subject}`,
        html,
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

    // ── 3. Lancement de la campagne collective à tous les utilisateurs ──
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

      console.log(`[send-email-campaign] Starting WhatsApp drainage email campaign for ${recipients.length} recipients...`);

      let sentCount = 0;
      let failedCount = 0;
      const failures: Array<{ email: string; error: string }> = [];

      // Envoi séquentiel avec léger délai pour respecter les quotas des fournisseurs (100ms)
      for (const user of recipients) {
        const personalizedWaMsg = `Bonjour NutriFYS ! Je suis ${user.name} (${user.email}) et je souhaite activer mon suivi nutritionnel sur WhatsApp 🌿`;
        const waUrl = getWhatsAppUrl(personalizedWaMsg);
        const qrCodeUrl = getQrCodeUrl(waUrl);

        const html = generateCampaignHtml({
          userName: user.name,
          userEmail: user.email,
          waUrl,
          qrCodeUrl,
        });

        const resEmail = await sendEmail({
          to: user.email,
          subject,
          html,
        });

        if (resEmail.success) {
          sentCount++;
        } else {
          failedCount++;
          failures.push({ email: user.email, error: resEmail.error || 'Inconnu' });
        }

        // Pause de 80ms entre chaque envoi pour fluidité
        await new Promise((r) => setTimeout(r, 80));
      }

      console.log(`[send-email-campaign] Campaign completed: ${sentCount} sent, ${failedCount} failed.`);

      // Enregistrer un journal dans Firestore de la campagne
      await db.collection('email_campaigns').add({
        type: 'whatsapp_drainage',
        subject,
        recipientsTotal: recipients.length,
        sentCount,
        failedCount,
        failures: failures.slice(0, 20),
        sentAt: new Date(),
      }).catch((e) => console.warn('[send-email-campaign] Failed to log campaign to Firestore:', e));

      return res.status(200).json({
        success: true,
        sentCount,
        failedCount,
        totalRecipients: recipients.length,
        failures,
      });
    }

    return res.status(400).json({ error: 'Action non reconnue (valeurs possibles: preview, stats, send_test, send_campaign)' });
  } catch (error: any) {
    console.error('[send-email-campaign] Unexpected handler error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
