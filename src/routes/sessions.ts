import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { saveReadAiRecap } from '../lib/readai-recap';
import { authenticate, requireRole } from '../middleware/auth';
import { createGoogleCalendarEvent } from '../lib/google-calendar';
import { updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from '../lib/google-calendar-mgmt';

const router = Router();

router.post('/book', authenticate, requireRole('student'), async (req: Request, res: Response) => {
  const { tutor_id, subject, scheduled_at, duration_minutes } = req.body;
  const student_id = req.user!.userId;

  if (!tutor_id || !subject || !scheduled_at) {
    return res.status(400).json({ error: 'tutor_id, subject, and scheduled_at are required' });
  }

  const sessionStart = new Date(scheduled_at);
  const sessionEnd = new Date(sessionStart.getTime() + (duration_minutes || 60) * 60000);

  const { data: conflicts } = await supabase
    .from('sessions')
    .select('id')
    .eq('tutor_id', tutor_id)
    .in('status', ['pending', 'confirmed'])
    .lt('scheduled_at', sessionEnd.toISOString())
    .gt('scheduled_at', new Date(sessionStart.getTime() - (duration_minutes || 60) * 60000).toISOString());

  if (conflicts && conflicts.length > 0) {
    return res.status(409).json({ error: 'Tutor is already booked at this time' });
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      student_id,
      tutor_id,
      subject,
      scheduled_at,
      duration_minutes: duration_minutes || 60,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Trigger Google Calendar sync in the background
  // (Don't await it so the response to the student is fast)
  createGoogleCalendarEvent(data.id).catch((err) => {
    console.error('Background Google Calendar sync failed:', err.message);
  });

  return res.status(201).json({ message: 'Session booked successfully', session: data });
});

router.get('/my', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const role = req.user!.role;
  const filterField = role === 'student' ? 'student_id' : 'tutor_id';

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      student:users!sessions_student_id_fkey(id, full_name, email),
      tutor:users!sessions_tutor_id_fkey(id, full_name, email)
    `)
    .eq(filterField, userId)
    .order('scheduled_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ sessions: data });
});

router.patch('/:id/reschedule', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { scheduled_at } = req.body;
  const userId = req.user!.userId;

  if (!scheduled_at) {
    return res.status(400).json({ error: 'scheduled_at is required' });
  }

  const { data: session, error: fetchError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !session) return res.status(404).json({ error: 'Session not found' });

  if (session.student_id !== userId && session.tutor_id !== userId) {
    return res.status(403).json({ error: 'You are not a participant of this session' });
  }

  if (session.status === 'completed' || session.status === 'cancelled') {
    return res.status(400).json({ error: `Cannot reschedule a ${session.status} session` });
  }

  const { data, error } = await supabase
    .from('sessions')
    .update({ scheduled_at, status: 'rescheduled' })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Update Google Calendar in background
  updateGoogleCalendarEvent(id).catch((err) => {
    console.error('Background Google Calendar update failed:', err.message);
  });

  return res.json({ message: 'Session rescheduled', session: data });
});

router.patch('/:id/cancel', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const { data: session } = await supabase.from('sessions').select('*').eq('id', id).single();

  if (!session) return res.status(404).json({ error: 'Session not found' });

  if (session.student_id !== userId && session.tutor_id !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // --- NEW: REFUND LOGIC ---
  if (session.status === 'confirmed') {
    // If it's confirmed, it means it's paid. Find the payment.
    const { data: payment } = await supabase
      .from('payments')
      .select('stripe_payment_intent_id')
      .eq('session_id', id)
      .eq('status', 'paid')
      .maybeSingle();

    if (payment?.stripe_payment_intent_id) {
      try {
        const stripe = new (require('stripe'))(process.env.STRIPE_SECRET_KEY);
        await stripe.refunds.create({
          payment_intent: payment.stripe_payment_intent_id,
        });
        console.log('Successfully refunded payment for session:', id);
      } catch (e: any) {
        console.error('Stripe refund failed:', e.message);
        // Note: In production, you'd fail the cancellation or flag for manual review
      }
    }
  }
  // -------------------------

  const { data, error } = await supabase
    .from('sessions')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Delete from Google Calendar in background
  deleteGoogleCalendarEvent(id).catch((err) => {
    console.error('Background Google Calendar deletion failed:', err.message);
  });

  return res.json({ message: 'Session cancelled', session: data });
});

router.post('/:id/simulate-recap', authenticate, async (req: Request, res: Response) => {
  if (process.env.ALLOW_SIMULATE_RECAP === 'false') {
    return res.status(403).json({ error: 'Demo recap is disabled on this server' });
  }

  const { id } = req.params;
  const userId = req.user!.userId;
  const { summary, key_points, action_items, transcript_url } = req.body as {
    summary?: string;
    key_points?: string[];
    action_items?: string[];
    transcript_url?: string;
  };

  const { data: session, error: fetchErr } = await supabase
    .from('sessions')
    .select('student_id, tutor_id')
    .eq('id', id)
    .single();

  if (fetchErr || !session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.student_id !== userId && session.tutor_id !== userId) {
    return res.status(403).json({ error: 'Only session participants can trigger a demo recap' });
  }

  const meeting_id = `readai_demo_${Date.now()}`;
  const { error: saveErr } = await saveReadAiRecap({
    session_id: id,
    meeting_id,
    summary:
      summary ||
      'Demo recap: student and tutor reviewed core concepts and agreed on next steps.',
    key_points: key_points?.length
      ? key_points
      : ['Session goals reviewed', 'Practice problems assigned', 'Next session topic set'],
    action_items: action_items?.length
      ? action_items
      : ['Complete assigned exercises', 'Skim reading before next lesson'],
    transcript_url: transcript_url || 'https://read.ai/demo',
    raw_payload: {
      source: 'simulate-recap',
      triggered_by_user_id: userId,
      meeting_id,
    },
  });

  if (saveErr) {
    return res.status(500).json({ error: saveErr.message });
  }

  return res.json({ ok: true, message: 'Recap saved; session marked completed (demo).' });
});

export default router;
