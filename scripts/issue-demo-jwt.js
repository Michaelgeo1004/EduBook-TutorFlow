/**
 * Prints JWTs signed with JWT_SECRET from .env (no login endpoint in this API).
 * Usage: npm run jwt:demo
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('Missing JWT_SECRET in .env');
  process.exit(1);
}

const signOpts = { expiresIn: '7d' };

const student = {
  userId: '11111111-1111-1111-1111-111111111101',
  email: 'student.demo@tutorflow.test',
  role: 'student',
};

const tutor = {
  userId: '11111111-1111-1111-1111-111111111102',
  email: 'tutor.demo@tutorflow.test',
  role: 'tutor',
};

console.log('--- Student (Authorization: Bearer ...) ---');
console.log(jwt.sign(student, secret, signOpts));
console.log('\n--- Tutor ---');
console.log(jwt.sign(tutor, secret, signOpts));
