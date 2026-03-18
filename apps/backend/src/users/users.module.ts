import { Module, OnModuleInit } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User, Role } from "@repo/db";
import { AuthService, AuthModule } from "@repo/services";
import { UserRepository } from "./user.repository.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role]),
    AuthModule,
  ],
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UsersModule implements OnModuleInit {
  constructor(
    private readonly authService: AuthService,
    private readonly userRepository: UserRepository
  ) {}

  onModuleInit() {
    // Inject the repository into the auth service
    this.authService.setUserRepository(this.userRepository);
  }
}
