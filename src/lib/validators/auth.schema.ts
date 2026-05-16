import { z } from "zod";

export const loginSchema = z.object({
  email:    z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const registerSchema = z.object({
  firstName:       z.string().min(2, "Prénom trop court"),
  lastName:        z.string().min(2, "Nom trop court"),
  email:           z.string().email("Email invalide"),
  password:        z.string().min(8, "Au moins 8 caractères")
                     .regex(/[A-Z]/, "Une majuscule requise")
                     .regex(/[0-9]/, "Un chiffre requis"),
  confirmPassword: z.string(),
  tenantName:      z.string().min(2, "Nom de boutique requis"),
  tenantCity:      z.string().min(2, "Ville requise"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path:    ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword:     z.string().min(8, "Au moins 8 caractères")
                     .regex(/[A-Z]/, "Une majuscule requise")
                     .regex(/[0-9]/, "Un chiffre requis"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path:    ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
});

export const resetPasswordSchema = z.object({
  token:           z.string().min(1),
  newPassword:     z.string().min(8, "Au moins 8 caractères")
                     .regex(/[A-Z]/, "Une majuscule requise")
                     .regex(/[0-9]/, "Un chiffre requis"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path:    ["confirmPassword"],
});

export type LoginInput           = z.infer<typeof loginSchema>;
export type RegisterInput        = z.infer<typeof registerSchema>;
export type ChangePasswordInput  = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput  = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput   = z.infer<typeof resetPasswordSchema>;