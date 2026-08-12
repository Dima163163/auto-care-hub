import type { MigrationInterface, QueryRunner } from "typeorm"

export class InitialSchema1781370550060 implements MigrationInterface {
    name = 'InitialSchema1781370550060'
    transaction = false

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Safe type creation
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN CREATE TYPE "public"."user_role" AS ENUM('client', 'owner', 'admin', 'super_admin'); END IF; END $$;`)
        
        // Ensure super_admin exists if type was already there (ALTER TYPE ... ADD VALUE cannot be in transaction, but we disabled it)
        await queryRunner.query(`ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'super_admin'`)
        await queryRunner.query(`ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'admin'`)
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN CREATE TYPE "public"."user_status" AS ENUM('active', 'blocked'); END IF; END $$;`)
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_provider') THEN CREATE TYPE "public"."user_provider" AS ENUM('email', 'google', 'yandex'); END IF; END $$;`)
        
        // Tables
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" text NOT NULL, "email" text NOT NULL, "passwordHash" text, "phone" text, "role" "public"."user_role" NOT NULL, "status" "public"."user_status" NOT NULL DEFAULT 'active', "avatarUrl" text, "provider" "public"."user_provider" NOT NULL DEFAULT 'email', "tokenVersion" integer NOT NULL DEFAULT '1', "emailVerifiedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`)
        
        // Ensure emailVerifiedAt exists if table was already there
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='emailVerifiedAt') THEN ALTER TABLE "users" ADD COLUMN "emailVerifiedAt" TIMESTAMP WITH TIME ZONE; END IF; END $$;`)
        
        // Ensure provider exists
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='provider') THEN ALTER TABLE "users" ADD COLUMN "provider" "public"."user_provider" NOT NULL DEFAULT 'email'; END IF; END $$;`)
        
        // Ensure tokenVersion exists
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='tokenVersion') THEN ALTER TABLE "users" ADD COLUMN "tokenVersion" integer NOT NULL DEFAULT 1; END IF; END $$;`)
        
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cabinet_status') THEN CREATE TYPE "public"."cabinet_status" AS ENUM('draft', 'active', 'blocked'); END IF; END $$;`)
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "cabinets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ownerId" uuid NOT NULL, "title" text NOT NULL, "description" text NOT NULL, "address" text NOT NULL, "city" text NOT NULL, "pricePerHour" integer NOT NULL, "status" "public"."cabinet_status" NOT NULL DEFAULT 'draft', "photos" text array NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bc7cc7e3c814364dbdde3d3be6c" PRIMARY KEY ("id"))`)
        
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cabinetId" uuid NOT NULL, "title" text NOT NULL, "description" text, "durationMinutes" integer NOT NULL, "price" integer NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`)
        
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'completed'); END IF; END $$;`)
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clientId" uuid NOT NULL, "cabinetId" uuid NOT NULL, "serviceId" uuid NOT NULL, "date" date NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "status" "public"."booking_status" NOT NULL DEFAULT 'pending', "comment" text, "cancellationReason" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`)
        
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected'); END IF; END $$;`)
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cabinetId" uuid NOT NULL, "clientId" uuid NOT NULL, "bookingId" uuid NOT NULL, "rating" integer NOT NULL, "text" text NOT NULL, "status" "public"."review_status" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`)
        
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'security_token_purpose') THEN CREATE TYPE "public"."security_token_purpose" AS ENUM('password_setup', 'password_reset', 'email_verification'); END IF; END $$;`)
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "security_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "purpose" "public"."security_token_purpose" NOT NULL, "tokenHash" text NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e54ac3c5ad006c346c0e580a194" PRIMARY KEY ("id"))`)
        
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_624c6ef3a906343f959456b1f5" ON "security_tokens" ("userId") `)
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_8554284d4966ac629ade106e14" ON "security_tokens" ("tokenHash") `)
        
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "user_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "userAgent" text, "ipAddress" text, "lastActiveAt" TIMESTAMP WITH TIME ZONE NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY ("id"))`)
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actor_id" uuid, "action" text NOT NULL, "target_id" text, "target_type" text, "metadata" jsonb NOT NULL DEFAULT '{}', "ip_address" text, "user_agent" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`)
        
        // Constraints
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_bb6e4079da089476697ed7fc91e') THEN ALTER TABLE "cabinets" ADD CONSTRAINT "FK_bb6e4079da089476697ed7fc91e" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION; END IF; END $$;`)
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_fe7ee4f52622be1bd6a430a99bf') THEN ALTER TABLE "services" ADD CONSTRAINT "FK_fe7ee4f52622be1bd6a430a99bf" FOREIGN KEY ("cabinetId") REFERENCES "cabinets"("id") ON DELETE CASCADE ON UPDATE NO ACTION; END IF; END $$;`)
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ea203405627b9fb15023dd75661') THEN ALTER TABLE "bookings" ADD CONSTRAINT "FK_ea203405627b9fb15023dd75661" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION; END IF; END $$;`)
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_4d731e11af61b1f9b61e765ab77') THEN ALTER TABLE "bookings" ADD CONSTRAINT "FK_4d731e11af61b1f9b61e765ab77" FOREIGN KEY ("cabinetId") REFERENCES "cabinets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION; END IF; END $$;`)
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_15a2431ec10d29dcd96c9563b65') THEN ALTER TABLE "bookings" ADD CONSTRAINT "FK_15a2431ec10d29dcd96c9563b65" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE NO ACTION; END IF; END $$;`)
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_2ff8a5da084bfd506bc1515aff6') THEN ALTER TABLE "reviews" ADD CONSTRAINT "FK_2ff8a5da084bfd506bc1515aff6" FOREIGN KEY ("cabinetId") REFERENCES "cabinets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION; END IF; END $$;`)
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_8bf30713187361f910f8fb3c2c1') THEN ALTER TABLE "reviews" ADD CONSTRAINT "FK_8bf30713187361f910f8fb3c2c1" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION; END IF; END $$;`)
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_c357057587a1c2afae453515bf6') THEN ALTER TABLE "reviews" ADD CONSTRAINT "FK_c357057587a1c2afae453515bf6" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION; END IF; END $$;`)
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_624c6ef3a906343f959456b1f52') THEN ALTER TABLE "security_tokens" ADD CONSTRAINT "FK_624c6ef3a906343f959456b1f52" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION; END IF; END $$;`)
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_e9658e959c490b0a634dfc54783') THEN ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_e9658e959c490b0a634dfc54783" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION; END IF; END $$;`)
        await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_177183f29f438c488b5e8510cdb') THEN ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_177183f29f438c488b5e8510cdb" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; END IF; END $$;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Standard down migration
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "FK_177183f29f438c488b5e8510cdb"`)
        await queryRunner.query(`ALTER TABLE "user_sessions" DROP CONSTRAINT IF EXISTS "FK_e9658e959c490b0a634dfc54783"`)
        await queryRunner.query(`ALTER TABLE "security_tokens" DROP CONSTRAINT IF EXISTS "FK_624c6ef3a906343f959456b1f52"`)
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_c357057587a1c2afae453515bf6"`)
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_8bf30713187361f910f8fb3c2c1"`)
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_2ff8a5da084bfd506bc1515aff6"`)
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "FK_15a2431ec10d29dcd96c9563b65"`)
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "FK_4d731e11af61b1f9b61e765ab77"`)
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "FK_ea203405627b9fb15023dd75661"`)
        await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT IF EXISTS "FK_fe7ee4f52622be1bd6a430a99bf"`)
        await queryRunner.query(`ALTER TABLE "cabinets" DROP CONSTRAINT IF EXISTS "FK_bb6e4079da089476697ed7fc91e"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "user_sessions"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_8554284d4966ac629ade106e14"`)
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_624c6ef3a906343f959456b1f5"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "security_tokens"`)
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."security_token_purpose"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`)
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."review_status"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "bookings"`)
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."booking_status"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "services"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "cabinets"`)
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."cabinet_status"`)
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`)
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_provider"`)
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_status"`)
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_role"`)
    }

}
