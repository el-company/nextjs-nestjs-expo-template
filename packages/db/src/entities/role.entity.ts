import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
} from "typeorm";
import { User } from "./user.entity.js";

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("varchar", { unique: true, length: 50 })
  name: string;

  @Column("text", { nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];
}
