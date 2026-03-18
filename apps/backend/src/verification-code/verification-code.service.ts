import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VerificationCode, VerificationCodePurpose } from "@repo/db";
import type { IVerificationCodeService } from "@repo/services";

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;
const MAX_CODES_PER_HOUR = 3;

@Injectable()
export class VerificationCodeService implements IVerificationCodeService {
  constructor(
    @InjectRepository(VerificationCode)
    private readonly repo: Repository<VerificationCode>
  ) {}

  async generateCode(
    userId: string,
    purpose: "email_verification" | "password_reset"
  ): Promise<{ code: string; expiresAt: Date }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.repo
      .createQueryBuilder("vc")
      .where(
        "vc.userId = :userId AND vc.purpose = :purpose AND vc.createdAt > :since",
        { userId, purpose, since: oneHourAgo }
      )
      .getCount();

    if (recentCount >= MAX_CODES_PER_HOUR) {
      throw new BadRequestException(
        "Too many code requests. Please try again in an hour."
      );
    }

    // Invalidate any existing active codes for this purpose
    await this.repo.update({ userId, purpose: purpose as VerificationCodePurpose, isUsed: false }, { isUsed: true });

    const code = this.generateSixDigitCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

    await this.repo.save({
      userId,
      purpose: purpose as VerificationCodePurpose,
      code,
      expiresAt,
    });

    return { code, expiresAt };
  }

  async verifyCode(
    userId: string,
    purpose: "email_verification" | "password_reset",
    code: string
  ): Promise<void> {
    const record = await this.repo.findOne({
      where: {
        userId,
        purpose: purpose as VerificationCodePurpose,
        isUsed: false,
      },
      order: { createdAt: "DESC" },
    });

    if (!record) {
      throw new BadRequestException("Invalid or expired verification code");
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException(
        "Verification code has expired. Please request a new one."
      );
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(
        "Maximum attempts exceeded. Please request a new code."
      );
    }

    if (record.code !== code) {
      await this.repo.increment({ id: record.id }, "attempts", 1);
      const remaining = MAX_ATTEMPTS - record.attempts - 1;
      throw new BadRequestException(
        `Invalid code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`
      );
    }

    await this.repo.update(record.id, { isUsed: true });
  }

  private generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
