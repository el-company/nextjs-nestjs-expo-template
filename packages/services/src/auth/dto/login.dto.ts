import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";
import { Transform } from "class-transformer";

export class LoginDto {
  @ApiProperty({
    example: "john@example.com",
    description: "Email address",
  })
  @IsEmail()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  email: string;

  @ApiProperty({
    example: "SecurePass123!",
    description: "Password",
  })
  @IsString()
  @MinLength(1)
  password: string;
}
