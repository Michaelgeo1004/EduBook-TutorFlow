import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { supabase } from '../lib/supabase';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

router.post('/checkout', authenticate, requireRole('student'), async (req: Request, res: Response) => {
  const { session_id } = req.body;
  const student_id = req.user!.userId;

  if (!session_id) return res.status(400).json({ error: 'session_id is required' });

  const { data: session, error } = await supabase
    .from('sessions')
    .select(
      `
      *,
      tutor:users!sessions_tutor_id_fkey(full_name)
    `
    )
    .eq('id', session_id)
    .eq('student_id', student_id)
    .single();

  if (error || !session) return res.status(404).json({ error: 'Session not found' });
  if (session.status === 'cancelled') return res.status(400).json({ error: 'Session is cancelled' });

  const { data: tutorProfile, error: profileError } = await supabase
    .from('tutor_profiles')
    .select('hourly_rate')
    .eq('user_id', session.tutor_id)
    .maybeSingle();

  if (profileError || tutorProfile == null) {
    return res.status(404).json({
      error: 'Tutor has no profile or hourly rate; add a tutor_profiles row for this tutor',
    });
  }

  const durationHours = session.duration_minutes / 60;
  const amount = Math.round(Number(tutorProfile.hourly_rate) * durationHours * 100);

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amount,
          product_data: {
            name: `Tutoring Session - ${session.subject}`,
            description: `${session.duration_minutes} min with ${session.tutor.full_name}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      session_id,
      student_id,
    },
    success_url: `${process.env.FRONTEND_URL}/payment/success?session_id=${session_id}`,
    cancel_url: `${process.env.FRONTEND_URL}/payment/cancelled`,
  });

  await supabase.from('payments').insert({
    session_id,
    student_id,
    stripe_payment_intent_id: (checkoutSession.payment_intent as string) || `pending_${Date.now()}`,
    stripe_checkout_session_id: checkoutSession.id,
    amount: amount / 100,
    currency: 'usd',
    status: 'pending',
  });

  return res.json({ checkout_url: checkoutSession.url });
});

router.get('/session/:session_id', authenticate, async (req: Request, res: Response) => {
  const { session_id } = req.params;
  const userId = req.user!.userId;

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('session_id', session_id)
    .eq('student_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return res.status(404).json({ error: 'Payment not found' });

  return res.json({ payment: data });
});

export default router;
