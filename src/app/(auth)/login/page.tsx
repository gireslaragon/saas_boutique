import type { Metadata } from "next";
import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace de gestion de boutique",
};

export default function LoginPage() {
  return <LoginForm />;
}
