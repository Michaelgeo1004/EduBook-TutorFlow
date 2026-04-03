import { google } from 'googleapis';
import { supabase } from './supabase';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.BACKEND_URL}/calendar/callback`
);

/**
 * Creates a Google Calendar event for a tutoring session.
 * 1. Fetches the tutor's Google Refresh Token from Supabase
 * 2. Authenticates with Google
 * 3. Inerts the event into their primary calendar
 */
export async function createGoogleCalendarEvent(sessionId: string) {
  try {
    // 1. Get session details and tutor's refresh token
    const { data: session, error: sessErr } = await supabase
      .from('sessions')
      .select('*, tutor:users!sessions_tutor_id_fkey(full_name), student:users!sessions_student_id_fkey(full_name)')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) throw new Error('Session not found');

    const { data: profile } = await supabase
      .from('tutor_profiles')
      .select('google_refresh_token')
      .eq('user_id', session.tutor_id)
      .single();

    if (!profile?.google_refresh_token) {
      console.log('Tutor has no Google Calendar sync enabled.');
      return null;
    }

    // 2. Authenticate the client
    oauth2Client.setCredentials({
      refresh_token: profile.google_refresh_token,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 3. Create the event
    const startTime = new Date(session.scheduled_at);
    const endTime = new Date(startTime.getTime() + session.duration_minutes * 60000);

    const event = {
      summary: `🎓 Tutoring Session: ${session.subject}`,
      description: `EduBook Session with ${session.student.full_name}. \nView in Dashboard: ${process.env.FRONTEND_URL}/dashboard/sessions/${sessionId}`,
      start: {
        dateTime: startTime.toISOString(),
      },
      end: {
        dateTime: endTime.toISOString(),
      },
      // Optional: Add Google Meet link automatically
      conferenceData: {
        createRequest: {
          requestId: `edubook_${sessionId}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
    });

    // 4. Save the Google Event ID and Meet link back to our database
    await supabase
      .from('sessions')
      .update({
        google_event_id: response.data.id,
        meeting_url: response.data.hangoutLink,
      })
      .eq('id', sessionId);

    console.log('Successfully created Google Calendar event:', response.data.htmlLink);
    return response.data;
  } catch (error: any) {
    console.error('Failed to create Google Calendar event:', error.message);
    return null;
  }
}
