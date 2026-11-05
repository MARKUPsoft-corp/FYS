import type { VercelRequest, VercelResponse } from '@vercel/node';

const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1420693941130535';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const to = (req.query.to as string) || '237675108876';
  const mode = (req.query.mode as string) || 'minimal';

  if (!WHATSAPP_API_TOKEN) {
    return res.status(500).json({ error: 'WHATSAPP_API_TOKEN is not defined on server' });
  }

  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  // Payload avec boutons interactifs
  let interactivePayload: any = {
    type: 'button',
    body: {
      text: 'Test boutons interactifs NutriFYS : Choisissez une option',
    },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: {
            id: 'btn_test_order',
            title: 'Commander',
          },
        },
        {
          type: 'reply',
          reply: {
            id: 'btn_test_nutrition',
            title: 'Fiche nutrition',
          },
        },
      ],
    },
  };

  if (mode === 'full') {
    interactivePayload.header = {
      type: 'text',
      text: 'NutriFYS',
    };
    interactivePayload.footer = {
      type: 'text',
      text: 'Votre nutritionniste FYS',
    };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: interactivePayload,
  };

  try {
    const metaRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const metaData = await metaRes.text();
    return res.status(200).json({
      metaStatus: metaRes.status,
      metaOk: metaRes.ok,
      metaResponse: metaData,
      payloadSent: payload,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || err });
  }
}
