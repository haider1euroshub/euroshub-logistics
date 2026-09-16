# EliteShip — Courier & Logistics Management Platform

A full-stack, enterprise-grade courier and logistics operating system featuring hub-and-spoke tracking, shipment management, driver dispatch, automated pricing snapshots, and multi-role dashboards.

---

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Leaflet / OpenStreetMap
- **Backend API**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL (Supabase / connection-pooled)
- **Auth & Identity**: Supabase Auth (server-side verified JWTs, role-based access control)

---

## Getting Started

### 1. Prerequisites
- Node.js >= 20.0.0
- npm >= 9.0.0

### 2. Environment Configuration
Copy `.env.example` to `.env` and provide your credentials:
```bash
cp .env.example .env
```

Key environment variables:
- `DATABASE_URL` & `DIRECT_URL`: PostgreSQL connection strings
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase server-side service key (never exposed to frontend)
- `SUPABASE_JWT_SECRET`: Secret used to verify client JWTs
- `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`: Client-side Supabase keys

### 3. Database Migration & Reference Data Seeding
```bash
# Generate Prisma Client
npm run prisma:generate

# Seed initial system settings, hubs, and pricing rules
npm run prisma:seed
```

---

## Development Staff Accounts Provisioning

To provision real testing/development staff accounts in Supabase Auth and the local application database:

### 1. Configure Dev Provisioning Variables in `.env`
```env
# Enable dev staff seeding (must be explicitly true, ignored in production)
ALLOW_DEV_STAFF_SEED=true

# Dev staff account password
DEV_STAFF_PASSWORD=YourSecureDevPasswordHere

# Dev staff email addresses (defaults shown below)
DEV_ADMIN_EMAIL=haider1.euroshub@gmail.com
DEV_HUB_STAFF_EMAIL=haider1.euroshub+hubstaff@gmail.com
DEV_DRIVER_EMAIL=haider1.euroshub+driver@gmail.com
```

### 2. Run the Staff Provisioning Script
```bash
npm run seed:staff
```

### 3. Account Details & Role Dashboard Routing
When users log in, `LoginPage.tsx` authenticates with Supabase, verifies the authoritative role from `/api/auth/me`, and redirects to the appropriate dashboard:

| Role | Email | Profile / Assignment | Redirect Route |
|---|---|---|---|
| **ADMIN** | `haider1.euroshub@gmail.com` | Full platform administration | `/admin` |
| **HUB_STAFF** | `haider1.euroshub+hubstaff@gmail.com` | Assigned to Karachi Central Mega Hub | `/hub/dashboard` |
| **DRIVER** | `haider1.euroshub+driver@gmail.com` | Assigned to Karachi Central Mega Hub | `/driver/dashboard` |
| **CUSTOMER** | Registered via `/register` | Public customer tracking & booking | `/customer/dashboard` |

> [!NOTE]
> `npm run seed:staff` is idempotent. If the user already exists in Supabase or the database, it safely updates their password, role, and profile associations.

---

## Running the Application

To run both backend API and frontend Vite dev server concurrently:
```bash
npm run dev
```

Or run them individually in separate terminals:
```bash
# Terminal 1: Backend Express API (port 4000)
npm run dev:api

# Terminal 2: Frontend Vite application (port 5173)
npm run dev:web
```

Open [http://localhost:5173](http://localhost:5173) in your browser.
