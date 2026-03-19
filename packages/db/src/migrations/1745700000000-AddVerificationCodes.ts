import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVerificationCodes1745700000000 implements MigrationInterface {
  name = "AddVerificationCodes1745700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "verification_code_purpose_enum"
      AS ENUM ('email_verification', 'password_reset')
    `);

    await queryRunner.query(`
      CREATE TABLE "verification_codes" (
        "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"    UUID        NOT NULL,
        "code"       VARCHAR(6)  NOT NULL,
        "purpose"    "verification_code_purpose_enum" NOT NULL,
        "expires_at" TIMESTAMP   NOT NULL,
        "is_used"    BOOLEAN     NOT NULL DEFAULT false,
        "attempts"   INTEGER     NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP   NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_verification_codes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_verification_codes_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_verification_codes_lookup"
      ON "verification_codes" ("user_id", "purpose", "is_used")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_verification_codes_expires"
      ON "verification_codes" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "verification_codes"`);
    await queryRunner.query(`DROP TYPE "verification_code_purpose_enum"`);
  }
}
