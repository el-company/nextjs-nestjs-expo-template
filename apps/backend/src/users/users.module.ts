import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User, Role } from "@repo/db";
import { USER_REPOSITORY } from "@repo/services";
import { UserRepository } from "./user.repository.js";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role]),
  ],
  providers: [
    UserRepository,
    {
      provide: USER_REPOSITORY,
      useExisting: UserRepository,
    },
  ],
  exports: [UserRepository, USER_REPOSITORY],
})
export class UsersModule {}
