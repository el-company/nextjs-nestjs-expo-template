import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";
import { Transform } from "class-transformer";

export class ForgotPasswordDto {
  @ApiProperty({
    example: "john@example.com",
    description: "Email address of the account",
  })
  @IsEmail()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  email: string;
}
