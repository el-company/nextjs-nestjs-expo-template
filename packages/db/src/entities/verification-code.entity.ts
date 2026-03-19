import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { User } from "./user.entity.js";

export enum VerificationCodePurpose {
  EMAIL_VERIFICATION = "email_verification",
  PASSWORD_RESET = "password_reset",
}

@Entity("verification_codes")
@Index(["userId", "purpose", "isUsed"])
export class VerificationCode {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ length: 6 })
  code: string;

  @Column({ type: "enum", enum: VerificationCodePurpose })
  purpose: VerificationCodePurpose;

  @Column({ name: "expires_at" })
  expiresAt: Date;

  @Column({ name: "is_used", default: false })
  isUsed: boolean;

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
