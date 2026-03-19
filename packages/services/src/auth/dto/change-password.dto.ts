import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, Matches } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({
    example: "OldSecurePass123!",
    description: "Current password",
  })
  @IsString()
  @MinLength(1)
  currentPassword: string;

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
