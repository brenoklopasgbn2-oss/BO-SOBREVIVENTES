import { Router } from 'express';
import { approvePaymentFromProvider } from '../services/paymentService.js';

export const webhookRoutes = Router();

webhookRoutes.post('/mercadopago', async (req, res) => {
  try {
    const paymentId = req.body?.data?.id || req.query['data.id'] || req.query.id || req.body?.id;
    const topic = req.body?.type || req.query.type || req.query.topic;

    if (!paymentId) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'Sem payment id.' });
    }

    if (topic && !String(topic).includes('payment')) {
      return res.status(200).json({ ok: true, skipped: true, reason: `Tipo ignorado: ${topic}` });
    }

    const result = await approvePaymentFromProvider(String(paymentId));
    res.json({ ok: true, status: result.status });
  } catch (err) {
    console.error('Webhook Mercado Pago erro:', err);
    res.status(200).json({ ok: false, error: err.message });
  }
});

webhookRoutes.get('/mercadopago', (req, res) => {
  res.json({ ok: true, message: 'Webhook Mercado Pago ativo.' });
});
