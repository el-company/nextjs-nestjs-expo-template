import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsEmail, Length, Matches, MinLength } from "class-validator";
import { Transform } from "class-transformer";

export class ResetPasswordDto {
  @ApiProperty({
    example: "user@example.com",
    description: "Email address associated with the account",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @Transform(({ value }) =>
    typeof value === "string" ? value.toLowerCase().trim() : value
  )
  email: string;

  @ApiProperty({
    example: "123456",
    description: "6-digit password reset code sent to your email",
  })
  @IsString()
  @Length(6, 6, { message: "Code must be exactly 6 digits" })
  @Matches(/^\d{6}$/, { message: "Code must contain only digits" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  code: string;

  @ApiProperty({
    example: "NewSecurePass123!",
    description:
      "New password (min 8 chars, must include uppercase, lowercase, number, and special character)",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])[^\s]{8,}$/,
    {
      message:
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    }
  )
  newPassword: string;
}
