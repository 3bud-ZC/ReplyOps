const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const argon2 = require('argon2');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const secretsPath = path.join(__dirname, '..', 'SECRETS.local.env');
  let secrets = '';
  if (fs.existsSync(secretsPath)) {
    secrets = fs.readFileSync(secretsPath, 'utf8');
  } else {
    console.error('SECRETS.local.env not found!');
  }

  // Check if INITIAL_ADMIN_PASSWORD exists
  let initialPassword = '';
  const match = secrets.match(/^INITIAL_ADMIN_PASSWORD=(.*)$/m);
  if (match) {
    initialPassword = match[1];
  } else {
    // Generate a secure random password
    initialPassword = crypto.randomBytes(16).toString('hex');
    secrets += `\nINITIAL_ADMIN_PASSWORD=${initialPassword}\n`;
    fs.writeFileSync(secretsPath, secrets, 'utf8');
    console.log('Generated new INITIAL_ADMIN_PASSWORD in SECRETS.local.env');
  }

  const hash = await argon2.hash(initialPassword);

  const adminUser = await prisma.user.upsert({
    where: { email: 'abudfun@gmail.com' },
    update: {
      passwordHash: hash,
    },
    create: {
      email: 'abudfun@gmail.com',
      name: 'Admin User',
      passwordHash: hash,
    },
  });

  console.log('Admin user upserted successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
