import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class ForgotPasswordDto {
  @ApiProperty({
    example: "john@example.com",
    description: "Email address of the account",
  })
  @IsEmail()
  email: string;
}
