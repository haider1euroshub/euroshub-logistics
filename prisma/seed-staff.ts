/**
 * prisma/seed-staff.ts
 *
 * Development-only staff account provisioning script.
 *
 * Creates three real Supabase Auth identities + application User records:
 *   ADMIN    — haider1.euroshub@gmail.com (or DEV_ADMIN_EMAIL)
 *   HUB_STAFF — haider1.euroshub+hubstaff@gmail.com (or DEV_HUB_STAFF_EMAIL)
 *   DRIVER   — haider1.euroshub+driver@gmail.com (or DEV_DRIVER_EMAIL)
 *
 * SAFETY GUARDS:
 *   - Requires ALLOW_DEV_STAFF_SEED=true environment variable
 *   - Aborts if NODE_ENV=production
 *   - Aborts if DEV_STAFF_PASSWORD is not set
 *   - Idempotent: safe to run multiple times
 *
 * Usage:
 *   npm run seed:staff
 */

import dotenv from "dotenv";
import path from "path";
import { PrismaClient, Role } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

// Load .env from workspace root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Production Safety
const NODE_ENV = process.env.NODE_ENV || "development";
const ALLOW_DEV_STAFF_SEED = process.env.ALLOW_DEV_STAFF_SEED;

if (NODE_ENV === "production") {
  console.error(
    "\n ABORTED: This command is development-only and cannot run against a production environment.\n" +
    "    NODE_ENV is set to production.\n"
  );
  process.exit(1);
}

if (ALLOW_DEV_STAFF_SEED !== "true") {
  console.error(
    "\n ABORTED: Development staff seeding requires explicit opt-in.\n" +
    "    Add ALLOW_DEV_STAFF_SEED=true to your .env file and retry.\n"
  );
  process.exit(1);
}

const DEV_STAFF_PASSWORD = process.env.DEV_STAFF_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DEV_STAFF_PASSWORD) {
  console.error(
    "\n ABORTED: DEV_STAFF_PASSWORD environment variable is not set.\n" +
    "    Add DEV_STAFF_PASSWORD=<your-dev-password> to your .env file.\n" +
    "    Do NOT commit this value to source control.\n"
  );
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("\n ABORTED: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.\n");
  process.exit(1);
}

const ADMIN_EMAIL = process.env.DEV_ADMIN_EMAIL || "haider1.euroshub@gmail.com";
const HUB_STAFF_EMAIL = process.env.DEV_HUB_STAFF_EMAIL || "haider1.euroshub+hubstaff@gmail.com";
const DRIVER_EMAIL = process.env.DEV_DRIVER_EMAIL || "haider1.euroshub+driver@gmail.com";

const prisma = new PrismaClient();
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getOrCreateSupabaseUser(email: string, password: string, fullName: string, role: Role): Promise<string> {
  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw new Error("Failed to list Supabase users: " + listError.message);

  const existing = listData.users.find((u) => u.email === email);
  if (existing) {
    console.log("  - Supabase Auth user already exists: " + email + " (" + existing.id + ")");
    // Ensure password and metadata are up-to-date with dev staff password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { fullName, role },
    });
    if (updateError) {
      console.warn("  WARN: Could not update Supabase password for " + email + ": " + updateError.message);
    } else {
      console.log("  + Supabase Auth password & metadata updated for: " + email);
    }
    return existing.id;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { fullName, role },
  });

  if (error || !data.user) throw new Error("Failed to create Supabase Auth user for " + email + ": " + error?.message);
  console.log("  + Supabase Auth user created: " + email + " (" + data.user.id + ")");
  return data.user.id;
}

async function ensureAppUser(supabaseUserId: string, email: string, fullName: string, phone: string | null, role: Role) {
  const existing = await prisma.user.findUnique({ where: { supabaseUserId } });
  if (existing) {
    if (existing.role !== role) {
      console.log("  * Updating existing user " + email + " role from " + existing.role + " to " + role);
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { role, isActive: true },
      });
      return updated;
    } else {
      console.log("  - Application User exists: " + email + " (role=" + existing.role + ")");
    }
    return existing;
  }
  const user = await prisma.user.create({ data: { supabaseUserId, email, fullName, phone, role, isActive: true } });
  console.log("  + Application User created: " + email + " (id=" + user.id + ", role=" + role + ")");
  return user;
}

async function main() {
  console.log("\n================================================");
  console.log("  EliteShip - Development Staff Account Seed");
  console.log("================================================\n");
  console.log("NODE_ENV: " + NODE_ENV);

  const firstHub = await prisma.hub.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  if (!firstHub) {
    console.error("\n ABORTED: No active Hub found. Run npm run prisma:seed first.\n");
    process.exit(1);
  }
  console.log("Hub for staff assignment: " + firstHub.name + " (" + firstHub.id + ")\n");

  // 1. ADMIN
  console.log("[1/3] Provisioning ADMIN: " + ADMIN_EMAIL);
  const adminSupabaseId = await getOrCreateSupabaseUser(ADMIN_EMAIL, DEV_STAFF_PASSWORD, "Haider Ali (Admin)", Role.ADMIN);
  const adminUser = await ensureAppUser(adminSupabaseId, ADMIN_EMAIL, "Haider Ali (Admin)", "+92 300 0000001", Role.ADMIN);
  await prisma.auditLog.create({
    data: { actorUserId: null, actorRole: null, action: "DEVELOPMENT_STAFF_ACCOUNT_PROVISIONED", entityType: "User", entityId: adminUser.id, metadataJson: { role: Role.ADMIN, email: ADMIN_EMAIL, development: true } },
  });
  console.log("  ADMIN done.\n");

  // 2. HUB_STAFF
  console.log("[2/3] Provisioning HUB_STAFF: " + HUB_STAFF_EMAIL);
  const hubStaffSupabaseId = await getOrCreateSupabaseUser(HUB_STAFF_EMAIL, DEV_STAFF_PASSWORD, "Haider Ali (Hub Staff)", Role.HUB_STAFF);
  const hubStaffUser = await ensureAppUser(hubStaffSupabaseId, HUB_STAFF_EMAIL, "Haider Ali (Hub Staff)", "+92 300 0000002", Role.HUB_STAFF);
  const existingHSP = await prisma.hubStaffProfile.findUnique({ where: { userId: hubStaffUser.id } });
  if (!existingHSP) {
    await prisma.hubStaffProfile.create({ data: { userId: hubStaffUser.id, hubId: firstHub.id } });
    console.log("  + HubStaffProfile created — assigned to: " + firstHub.name);
  } else {
    console.log("  - HubStaffProfile exists — hub: " + firstHub.name);
  }
  await prisma.auditLog.create({
    data: { actorUserId: null, actorRole: null, action: "DEVELOPMENT_STAFF_ACCOUNT_PROVISIONED", entityType: "User", entityId: hubStaffUser.id, metadataJson: { role: Role.HUB_STAFF, email: HUB_STAFF_EMAIL, hubId: firstHub.id, development: true } },
  });
  console.log("  HUB_STAFF done.\n");

  // 3. DRIVER
  console.log("[3/3] Provisioning DRIVER: " + DRIVER_EMAIL);
  const driverSupabaseId = await getOrCreateSupabaseUser(DRIVER_EMAIL, DEV_STAFF_PASSWORD, "Haider Ali (Driver)", Role.DRIVER);
  const driverUser = await ensureAppUser(driverSupabaseId, DRIVER_EMAIL, "Haider Ali (Driver)", "+92 300 0000003", Role.DRIVER);
  const existingDP = await prisma.driverProfile.findUnique({ where: { userId: driverUser.id } });
  if (!existingDP) {
    await prisma.driverProfile.create({ data: { userId: driverUser.id, homeHubId: firstHub.id } });
    console.log("  + DriverProfile created — home hub: " + firstHub.name);
  } else {
    console.log("  - DriverProfile exists — home hub: " + firstHub.name);
  }
  await prisma.auditLog.create({
    data: { actorUserId: null, actorRole: null, action: "DEVELOPMENT_STAFF_ACCOUNT_PROVISIONED", entityType: "User", entityId: driverUser.id, metadataJson: { role: Role.DRIVER, email: DRIVER_EMAIL, hubId: firstHub.id, development: true } },
  });
  console.log("  DRIVER done.\n");

  console.log("================================================");
  console.log("  Development Staff Accounts Ready");
  console.log("================================================");
  console.log("  ADMIN     => " + ADMIN_EMAIL);
  console.log("  HUB_STAFF => " + HUB_STAFF_EMAIL);
  console.log("  DRIVER    => " + DRIVER_EMAIL);
  console.log("  Hub       => " + firstHub.name);
  console.log("  Password  => (value of DEV_STAFF_PASSWORD)");
  console.log("================================================\n");
}

main()
  .catch((e) => { console.error("\n Error during staff seeding:", e instanceof Error ? e.message : e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
