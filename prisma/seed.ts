import { prisma } from '@/lib/prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Seed-Script für DuelPath
 *
 * Erstellt einen Test-User für Entwicklung und Tests
 */
async function main() {
  console.log('🌱 Starte Seeding...');

  // Test-User erstellen
  const testEmail = 'test@duelpath.local';
  const testPassword = 'Test1234!';
  const hashedPassword = await bcrypt.hash(testPassword, 10);

  // Prüfe ob Test-User bereits existiert
  const existingUser = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (existingUser) {
    console.log('ℹ️  Test-User existiert bereits, überspringe Erstellung.');
  } else {
    const testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        password: hashedPassword,
      },
    });

    console.log('✅ Test-User erstellt:', {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
    });
    console.log('📧 E-Mail:', testEmail);
    console.log('🔑 Passwort:', testPassword);
  }

  console.log('✨ Seeding abgeschlossen!');
}

main()
  .catch((e) => {
    console.error('❌ Fehler beim Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
