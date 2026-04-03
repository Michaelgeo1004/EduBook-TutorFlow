import { google } from 'googleapis';
import { supabase } from './supabase';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BACKEND_URL}/calendar/callback`
);

/**
 * Updates a Google Calendar event for a tutoring session.
 * 1. Fetches the session and tutor's refresh token
 * 2. Authenticates with Google
 * 3. Updates the event in their primary calendar
 */
export async function updateGoogleCalendarEvent(sessionId: string) {
  try {
    const { data: session, error: sessErr } = await supabase
      .from('sessions')
      .select('*, tutor:users!sessions_tutor_id_fkey(full_name), student:users!sessions_student_id_fkey(full_name)')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session || !session.google_event_id) return null;

    const { data: profile } = await supabase
      .from('tutor_profiles')
      .select('google_refresh_token')
      .eq('user_id', session.tutor_id)
      .single();

    if (!profile?.google_refresh_token) return null;

    oauth2Client.setCredentials({ refresh_token: profile.google_refresh_token });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const startTime = new Date(session.scheduled_at);
    const endTime = new Date(startTime.getTime() + session.duration_minutes * 60000);

    const event = {
      summary: `🎓 (Rescheduled) Tutoring Session: ${session.subject}`,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
    };

    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId: session.google_event_id,
      requestBody: event,
    });

    return response.data;
  } catch (error: any) {
    console.error('Failed to update Google Calendar event:', error.message);
    return null;
  }
}

/**
 * Deletes a Google Calendar event for a tutoring session.
 */
export async function deleteGoogleCalendarEvent(sessionId: string) {
  try {
    const { data: session, error: sessErr } = await supabase
      .from('sessions')
      .select('google_event_id, tutor_id')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session || !session.google_event_id) return null;

    const { data: profile } = await supabase
      .from('tutor_profiles')
      .select('google_refresh_token')
      .eq('user_id', session.tutor_id)
      .single();

    if (!profile?.google_refresh_token) return null;

    oauth2Client.setCredentials({ refresh_token: profile.google_refresh_token });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: session.google_event_id,
    });

    console.log('Successfully deleted Google Calendar event:', session.google_event_id);
    return true;
  } catch (error: any) {
    console.error('Failed to delete Google Calendar event:', error.message);
    return null;
  }
}
