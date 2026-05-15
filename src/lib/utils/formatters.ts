/**
 * Formate un montant en FCFA
 * ex: 15000 → "15 000 F"
 */
export function formatMoney(amount: number, currency = "FCFA"): string {
  return new Intl.NumberFormat("fr-FR", {
    style:    "decimal",
    maximumFractionDigits: 0,
  }).format(amount) + ` ${currency === "FCFA" ? "F" : currency}`;
}

/**
 * Formate un nombre avec séparateurs
 * ex: 1500 → "1 500"
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

/**
 * Formate une date en français
 * ex: "2026-05-15" → "15 mai 2026"
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day:   "numeric",
    month: "long",
    year:  "numeric",
  }).format(new Date(date));
}

/**
 * Formate une date courte
 * ex: "2026-05-15" → "15/05/2026"
 */
export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(date));
}

/**
 * Formate heure + date
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day:    "2-digit",
    month:  "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Calcule le % de variation entre deux valeurs
 * ex: prev=1000, curr=1200 → "+20%"
 */
export function formatVariation(current: number, previous: number): {
  value:     string;
  positive:  boolean;
  neutral:   boolean;
} {
  if (previous === 0) {
    return { value: "—", positive: false, neutral: true };
  }
  const pct  = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return {
    value:    `${sign}${pct.toFixed(1)}%`,
    positive: pct >= 0,
    neutral:  false,
  };
}

/**
 * Formate un nom de mois
 * ex: new Date() → "Mai 2026"
 */
export function formatMonth(date = new Date()): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year:  "numeric",
  }).format(date);
}