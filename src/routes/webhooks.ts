import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { supabase } from '../lib/supabase';
import { saveReadAiRecap } from '../lib/readai-recap';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).send('Missing stripe-signature header');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      const { session_id } = checkoutSession.metadata || {};

      const pi = checkoutSession.payment_intent;
      const paymentIntentId = typeof pi === 'string' ? pi : pi?.id;

      const paymentUpdate: Record<string, string> = {
        status: 'paid',
        paid_at: new Date().toISOString(),
      };
      if (paymentIntentId) {
        paymentUpdate.stripe_payment_intent_id = paymentIntentId;
      }

      const { error: payErr } = await supabase
        .from('payments')
        .update(paymentUpdate)
        .eq('stripe_checkout_session_id', checkoutSession.id);

      if (payErr) {
        console.error('Stripe webhook: payments update failed', payErr.message);
      }

      if (session_id) {
        const { error: sessErr } = await supabase
          .from('sessions')
          .update({ status: 'confirmed' })
          .eq('id', session_id);
        if (sessErr) {
          console.error('Stripe webhook: sessions update failed', sessErr.message);
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await supabase.from('payments').update({ status: 'failed' }).eq('stripe_payment_intent_id', paymentIntent.id);
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      await supabase
        .from('payments')
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent_id', charge.payment_intent as string);
      break;
    }
  }

  return res.json({ received: true });
});

router.post('/readai', async (req: Request, res: Response) => {
  const webhookSecret = req.headers['x-readai-secret'];
  if (webhookSecret !== process.env.READAI_WEBHOOK_SECRET && process.env.READAI_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = req.body;
  const { meeting_id, external_id: session_id, summary, key_points, action_items, transcript_url } = payload;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id in payload' });
  }

  const { data: session } = await supabase.from('sessions').select('id').eq('id', session_id).single();
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const { error: saveErr } = await saveReadAiRecap({
    session_id,
    meeting_id,
    summary,
    key_points: key_points || [],
    action_items: action_items || [],
    transcript_url,
    raw_payload: payload as Record<string, unknown>,
  });

  if (saveErr) {
    return res.status(500).json({ error: saveErr.message });
  }

  return res.json({ received: true });
});

router.get('/recaps/:session_id', async (req: Request, res: Response) => {
  const { session_id } = req.params;

  const { data, error } = await supabase
    .from('ai_recaps')
    .select('*')
    .eq('session_id', session_id)
    .order('received_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: 'No recap found for this session yet' });
  }

  return res.json({ recap: data });
});

export default router;
