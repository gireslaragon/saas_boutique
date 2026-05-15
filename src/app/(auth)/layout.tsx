export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pas de sidebar ni navbar — layout minimal pour les pages d'auth
  return <>{children}</>;
}
