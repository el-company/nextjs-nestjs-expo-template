import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, Role } from "@repo/db";
import {
  UserRepository as IUserRepository,
  UserEntity,
  RoleEntity,
  CreateUserData,
} from "@repo/services";

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({
      where: { email },
      relations: ["roles"],
    });
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({
      where: { username },
      relations: ["roles"],
    });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({
      where: { id },
      relations: ["roles"],
    });
  }

  async findByEmailVerificationToken(token: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({
      where: { emailVerificationToken: token },
      relations: ["roles"],
    });
  }

  async findByPasswordResetToken(token: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({
      where: { passwordResetToken: token },
      relations: ["roles"],
    });
  }

  async findByRefreshToken(refreshToken: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({
      where: { refreshToken },
      relations: ["roles"],
    });
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const user = this.userRepo.create({
      email: data.email,
      username: data.username,
      passwordHash: data.passwordHash,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      emailVerificationToken: data.emailVerificationToken,
      emailVerificationExpires: data.emailVerificationExpires,
      roles: data.roles as Role[],
    });

    return this.userRepo.save(user);
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    await this.userRepo.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error("User not found after update");
    }
    return updated;
  }

  async getRoleByName(name: string): Promise<RoleEntity | null> {
    return this.roleRepo.findOne({ where: { name } });
  }
}
