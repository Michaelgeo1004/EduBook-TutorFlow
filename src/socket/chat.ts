import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';
import { AuthPayload } from '../middleware/auth';

async function emitPresence(io: Server, session_id: string) {
  const room = `session:${session_id}`;
  const sockets = await io.in(room).fetchSockets();
  const seen = new Map<string, { email: string }>();
  for (const s of sockets) {
    const u = s.data.user as AuthPayload;
    seen.set(u.userId, { email: u.email });
  }
  const users = [...seen.entries()].map(([userId, v]) => ({
    userId,
    email: v.email,
  }));
  io.to(room).emit('presence', { users });
}

export const initSocket = (io: Server) => {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication token missing'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
      socket.data.user = decoded;
      return next();
    } catch {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user: AuthPayload = socket.data.user;

    socket.on('disconnecting', async () => {
      const rooms = [...socket.rooms].filter((r) => r.startsWith('session:'));
      for (const room of rooms) {
        const session_id = room.replace('session:', '');
        await emitPresence(io, session_id);
      }
    });

    socket.on('join_session', async ({ session_id }: { session_id: string }) => {
      const { data: session } = await supabase
        .from('sessions')
        .select('student_id, tutor_id')
        .eq('id', session_id)
        .single();

      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      const isParticipant =
        session.student_id === user.userId || session.tutor_id === user.userId;
      if (!isParticipant) {
        socket.emit('error', { message: 'You are not a participant of this session' });
        return;
      }

      const room = `session:${session_id}`;
      socket.join(room);
      socket.emit('joined', { room, session_id });

      const { data: history } = await supabase
        .from('messages')
        .select('*, sender:users!messages_sender_id_fkey(full_name, email)')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true })
        .limit(50);

      socket.emit('message_history', { messages: history || [] });
      await emitPresence(io, session_id);
    });

    socket.on(
      'send_message',
      async ({ session_id, content }: { session_id: string; content: string }) => {
        if (!content?.trim()) return;

        const { data: message, error } = await supabase
          .from('messages')
          .insert({
            session_id,
            sender_id: user.userId,
            content: content.trim(),
          })
          .select('*, sender:users!messages_sender_id_fkey(full_name, email)')
          .single();

        if (error) {
          socket.emit('error', { message: 'Failed to save message' });
          return;
        }

        const room = `session:${session_id}`;
        io.to(room).emit('new_message', { message });
      }
    );

    socket.on('typing', ({ session_id }: { session_id: string }) => {
      const room = `session:${session_id}`;
      socket.to(room).emit('user_typing', {
        userId: user.userId,
        email: user.email,
      });
    });

    socket.on('stop_typing', ({ session_id }: { session_id: string }) => {
      const room = `session:${session_id}`;
      socket.to(room).emit('user_stop_typing', {
        userId: user.userId,
        email: user.email,
      });
    });

    /** Read-through time so the other participant can show “seen” ticks (chat open / caught up). */
    socket.on(
      'chat_read',
      ({ session_id, read_through }: { session_id?: string; read_through?: string }) => {
        if (!session_id || !read_through) return;
        const room = `session:${session_id}`;
        if (!socket.rooms.has(room)) return;
        socket.to(room).emit('peer_read_through', {
          userId: user.userId,
          read_through,
        });
      }
    );
  });
};
