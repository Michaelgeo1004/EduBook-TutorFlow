/**
 * Socket.io smoke test (Postman does not speak the Socket.io protocol).
 *
 * Usage:
 *   npm run socket:demo -- "<JWT>" "<session_uuid>"
 *
 * Or:
 *   SOCKET_TOKEN="eyJ..." SESSION_ID="ebdde5d4-..." npm run socket:demo
 */
const { io } = require('socket.io-client');

const token = process.env.SOCKET_TOKEN || process.argv[2];
const sessionId = process.env.SESSION_ID || process.argv[3];

if (!token || !sessionId) {
  console.error('Usage: npm run socket:demo -- "<JWT>" "<session_id>"');
  console.error('Or set SOCKET_TOKEN and SESSION_ID env vars.');
  console.error('Get JWT: npm run jwt:demo');
  process.exit(1);
}

const url = process.env.API_URL || 'http://localhost:4000';

const socket = io(url, {
  auth: { token },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('connected', socket.id);
  socket.emit('join_session', { session_id: sessionId });
});

socket.on('joined', (p) => console.log('joined', p));
socket.on('message_history', (p) => console.log('message_history', JSON.stringify(p, null, 2)));
socket.on('new_message', (p) => console.log('new_message', JSON.stringify(p, null, 2)));
socket.on('user_typing', (p) => console.log('user_typing', p));
socket.on('user_stop_typing', (p) => console.log('user_stop_typing', p));
socket.on('error', (p) => console.log('socket error event', p));
socket.on('connect_error', (e) => console.error('connect_error', e.message));

// Optional: send a test message after join (comment out if you only want history)
socket.on('joined', () => {
  setTimeout(() => {
    socket.emit('send_message', { session_id: sessionId, content: 'Smoke test from socket-smoke.js' });
  }, 500);
});

setTimeout(() => {
  console.log('done (closing in 2s)');
  socket.close();
  process.exit(0);
}, 4000);
