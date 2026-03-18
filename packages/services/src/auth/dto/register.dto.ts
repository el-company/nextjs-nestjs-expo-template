import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from "class-validator";
import { Transform } from "class-transformer";

export class RegisterDto {
  @ApiProperty({
    example: "john_doe",
    description: "Unique username (3-50 characters)",
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({
    example: "john@example.com",
    description: "Valid email address",
  })
  @IsEmail()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  email: string;

  @ApiProperty({
    example: "SecurePass123!",
    description:
      "Password (min 8 chars, must include uppercase, lowercase, number, and special character)",
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
  password: string;

  @ApiProperty({
    example: "John",
    description: "First name (optional)",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @MaxLength(100)
  firstName?: string;

  @ApiProperty({
    example: "Doe",
    description: "Last name (optional)",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @MaxLength(100)
  lastName?: string;
}
