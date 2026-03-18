import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, Matches } from "class-validator";
import { Transform } from "class-transformer";

export class ResetPasswordDto {
  @ApiProperty({
    example: "abc123token",
    description: "Password reset token received via email",
  })
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  token: string;

  @ApiProperty({
    example: "NewSecurePass123!",
    description:
      "New password (min 8 chars, must include uppercase, lowercase, number, and special character)",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    {
      message:
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)",
    }
  )
  newPassword: string;
}
