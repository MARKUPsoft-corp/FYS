import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { amount, phone, provider, orderId, customerName } = req.body;

  if (!amount || !phone || !provider || !orderId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const apiKey = process.env.KPAY_API_KEY;

  if (!apiKey) {
    console.error('[kpay-init] KPAY_API_KEY env variable is not set!');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    // Appel à l'API K-Pay pour initier un paiement USSD
    const response = await fetch('https://api.kpay.site/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount),
        currency: 'XAF',
        phone_number: phone,
        provider: provider === 'MTN' ? 'MTN_MOMO_CMR' : 'ORANGE_CMR',
        external_id: orderId,
        metadata: {
          customerName,
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[kpay-init] Error from K-Pay API:', data);
      return res.status(response.status).json({ error: data.message || 'Payment initiation failed' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('[kpay-init] Request error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
