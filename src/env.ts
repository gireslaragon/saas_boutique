import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Variables serveur — jamais exposées au client
   */
  server: {
    // Base de données
    DATABASE_URL: z.string().url("DATABASE_URL doit être une URL PostgreSQL valide"),

    // Auth JWT
    JWT_SECRET: z
      .string()
      .min(32, "JWT_SECRET doit faire au moins 32 caractères"),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

    // Cloudinary — stockage images
    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),

    // Email (Resend)
    RESEND_API_KEY: z.string().startsWith("re_").optional(),
    EMAIL_FROM: z.string().email().default("noreply@boutique-saas.cm"),

    // Super Admin initial (seed)
    SUPER_ADMIN_EMAIL: z.string().email().default("admin@boutique-saas.cm"),
    SUPER_ADMIN_PASSWORD: z
      .string()
      .min(12, "SUPER_ADMIN_PASSWORD doit faire au moins 12 caractères"),

    // App
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Cron jobs (secret partagé pour sécuriser les routes /api/cron)
    CRON_SECRET: z
      .string()
      .min(20)
      .optional()
      .default("change-me-in-production"),
  },

  /**
   * Variables client — exposées au navigateur (préfixe NEXT_PUBLIC_)
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_APP_NAME: z.string().default("Boutique SaaS"),
  },

  /**
   * Mapping des variables d'environnement
   * Nécessaire pour que Next.js sache quoi injecter
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
    CRON_SECRET: process.env.CRON_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },

  /**
   * En dev, on skip la validation pour les vars optionnelles
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});