import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuthenticationFields1710864000000 implements MigrationInterface {
    name = 'AddAuthenticationFields1710864000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create roles table
        await queryRunner.query(`
            CREATE TABLE "roles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(50) NOT NULL,
                "description" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
                CONSTRAINT "PK_roles" PRIMARY KEY ("id")
            )
        `);

        // Create user_roles junction table
        await queryRunner.query(`
            CREATE TABLE "user_roles" (
                "user_id" uuid NOT NULL,
                "role_id" uuid NOT NULL,
                CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id")
            )
        `);

        // Add foreign key constraints for user_roles
        await queryRunner.query(`
            ALTER TABLE "user_roles"
            ADD CONSTRAINT "FK_user_roles_user"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "user_roles"
            ADD CONSTRAINT "FK_user_roles_role"
            FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // Create indexes for user_roles
        await queryRunner.query(`CREATE INDEX "IDX_user_roles_user" ON "user_roles" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_roles_role" ON "user_roles" ("role_id")`);

        // Drop clerkUserId column from users
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "clerkUserId"`);

        // Add new authentication columns to users
        await queryRunner.query(`ALTER TABLE "users" ADD "passwordHash" character varying(255) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "users" ADD "firstName" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "lastName" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "imageUrl" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "isEmailVerified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "emailVerificationToken" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "emailVerificationExpires" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD "passwordResetToken" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "passwordResetExpires" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD "refreshToken" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "refreshTokenExpires" TIMESTAMP`);

        // Remove default from passwordHash (it was only for migration)
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP DEFAULT`);

        // Insert default roles
        await queryRunner.query(`
            INSERT INTO "roles" ("name", "description") VALUES
            ('admin', 'Administrator with full access'),
            ('user', 'Regular user with standard access')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove new columns from users
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "refreshTokenExpires"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "refreshToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordResetExpires"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordResetToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerificationExpires"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerificationToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "isEmailVerified"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "imageUrl"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lastName"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "firstName"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordHash"`);

        // Re-add clerkUserId column
        await queryRunner.query(`ALTER TABLE "users" ADD "clerkUserId" character varying(255)`);

        // Drop user_roles indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_roles_role"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_roles_user"`);

        // Drop user_roles foreign keys and table
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "FK_user_roles_role"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "FK_user_roles_user"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);

        // Drop roles table
        await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    }
}
