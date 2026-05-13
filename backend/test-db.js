const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({
  datasources: { db: { url: 'postgresql://globoatlas:changeme@localhost:5432/globoatlas' } }
});
p.$connect()
  .then(() => { console.log('DB Connected OK'); return p.$disconnect(); })
  .catch(e => { console.error('FAIL:', e.message); process.exit(1); });
