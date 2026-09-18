/**
 * One-time production task: Create or update admin account in Hostinger production MySQL database.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@zassports.com';
  const plainPassword = 'ZasAdmin2026Secure';

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`User ${email} already exists. Updating role to admin, resetting password, and setting isBlocked to false...`);
    await prisma.user.update({
      where: { email },
      data: {
        role: 'admin',
        password: hashedPassword,
        isBlocked: false,
      },
    });
    console.log('Admin account successfully updated.');
  } else {
    console.log(`Creating new admin account for ${email}...`);
    await prisma.user.create({
      data: {
        name: 'Zassports Admin',
        email,
        password: hashedPassword,
        provider: 'credentials',
        role: 'admin',
        isBlocked: false,
      },
    });
    console.log('Admin account successfully created.');
  }
}

main()
  .catch((e) => {
    console.error('Error executing admin creation script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
