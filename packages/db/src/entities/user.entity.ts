import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { Role } from "./role.entity.js";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("varchar", { unique: true, length: 50 })
  username: string;

  @Column("varchar", { unique: true, length: 255 })
  email: string;

  @Column("varchar", { length: 255 })
  passwordHash: string;

  @Column("varchar", { nullable: true, length: 100 })
  firstName: string | null;

  @Column("varchar", { nullable: true, length: 100 })
  lastName: string | null;

  @Column("varchar", { nullable: true, length: 500 })
  imageUrl: string | null;

  @Column("boolean", { default: false })
  isEmailVerified: boolean;

  @Column("varchar", { nullable: true, length: 255 })
  emailVerificationToken: string | null;

  @Column("timestamp", { nullable: true })
  emailVerificationExpires: Date | null;

  @Column("varchar", { nullable: true, length: 255 })
  passwordResetToken: string | null;

  @Column("timestamp", { nullable: true })
  passwordResetExpires: Date | null;

  @Column("varchar", { nullable: true, length: 500 })
  refreshToken: string | null;

  @Column("timestamp", { nullable: true })
  refreshTokenExpires: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: "user_roles",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "role_id", referencedColumnName: "id" },
  })
  roles: Role[];
}
