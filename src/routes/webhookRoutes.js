import { Router } from 'express';
import { approvePaymentFromProvider } from '../services/paymentService.js';

export const webhookRoutes = Router();

webhookRoutes.post('/mercadopago', async (req, res) => {
  try {
    const providerId = req.body?.data?.id || req.query['data.id'] || req.query.id || req.body?.id;
    const topic = String(req.body?.type || req.query.type || req.query.topic || '').toLowerCase();

    if (!providerId) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'Sem ID do recurso.' });
    }

    // A aplicação nova usa Orders (type=order). Mantém também payment para
    // pagamentos antigos criados antes da troca de conta/API.
    const supported = !topic || topic.includes('order') || topic.includes('payment');
    if (!supported) {
      return res.status(200).json({ ok: true, skipped: true, reason: `Tipo ignorado: ${topic}` });
    }

    const providerHint = topic.includes('order') ? 'mercadopago_orders' : 'mercadopago_payments';
    const result = await approvePaymentFromProvider(String(providerId), providerHint);
    res.json({ ok: true, status: result.status });
  } catch (err) {
    // Mercado Pago deve receber 200 para não entrar em repetição infinita.
    // A sincronização automática/pela tela tentará novamente depois.
    console.error('Webhook Mercado Pago erro:', err);
    res.status(200).json({ ok: false, error: err.message });
  }
});

webhookRoutes.get('/mercadopago', (req, res) => {
  res.json({ ok: true, message: 'Webhook Mercado Pago ativo para Orders e Payments.' });
});
