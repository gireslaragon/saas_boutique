# 🛒 Boutique SaaS (POS + Stock + ERP léger)

SaaS de gestion de boutique moderne (POS, stock, facturation, offline-first, event-driven).

## 🚀 Objectif du projet

Créer un système de caisse moderne, rapide et fiable pour petites et moyennes boutiques :

- Fonctionne même en cas de coupure internet (offline-first)
- Gestion stricte du stock en temps réel
- Traçabilité complète de toutes les opérations
- Système simple pour les caissières
- Vision avancée pour le patron

## 🧠 Concept clé (TRÈS IMPORTANT)

> Une vente est immuable.  
> Toute modification est un événement, jamais une édition directe.

Tout repose sur :
- Event Store (source of truth)
- Transaction Engine central
- Stock snapshots (lecture rapide)
- Audit complet

---

## 🚀 Features

### 💳 POS (Caisse)
- Vente rapide
- Panier intelligent
- Paiement + rendu monnaie
- Produits avec variantes

### 📦 Stock
- Stock temps réel
- Mouvements traçables
- Alertes stock faible

### 🧾 Facturation
- Factures individuelles
- Factures groupées (micro-achats)
- Numérotation automatique

### 🔁 Retours / échanges
- Retour partiel ou total
- Échanges produits
- Ajustements tracés

### 👥 Utilisateurs
- Admin (patron)
- Caissière
- Permissions strictes

## ⚙️ Stack technique

Frontend :
- Next.js (App Router)
- TypeScript
- TailwindCSS
- shadcn/ui
- Zustand
- React Query
- PWA

Backend :
- Next.js API Routes
- Transaction Engine (Node)

DB :
- PostgreSQL
- Drizzle ORM

Offline :
- IndexedDB (Dexie.js)
- Sync engine

Auth :
- JWT custom

DevOps :
- Docker
- VPS
- Coolify

## 📁 Scripts

```bash
pnpm dev       # dev server
pnpm build     # build production
pnpm start     # start production
pnpm lint      # lint code

## 🤝 Collaboration / Contact

Projet: Auteur et développé par : Gires NKONGA

📧 Email : giresnkonga9@gmail.com

👉 Ouvert aux collaborations :

- Développement SaaS
- POS / ERP
- Architecture backend
- Optimisation systèmes offline-first