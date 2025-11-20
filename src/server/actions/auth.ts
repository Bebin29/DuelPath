'use server';

import { prisma } from '@/lib/prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

/**
 * Validierungsschema für Registrierung
 */
const signUpSchema = z
  .object({
    name: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
    email: z.string().email('Ungültige E-Mail-Adresse'),
    password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  });

/**
 * Server Action für Benutzerregistrierung
 */
export async function signUpAction(formData: FormData) {
  const rawData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  // Validierung
  const validationResult = signUpSchema.safeParse(rawData);
  if (!validationResult.success) {
    return {
      error: validationResult.error.errors[0]?.message || 'Validierungsfehler',
    };
  }

  const { name, email, password } = validationResult.data;

  try {
    // Prüfe ob E-Mail bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: 'Diese E-Mail-Adresse ist bereits registriert' };
    }

    // Hash Passwort
    const hashedPassword = await bcrypt.hash(password, 10);

    // Erstelle Benutzer
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Sign up error:', error);
    return { error: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.' };
  }
}
