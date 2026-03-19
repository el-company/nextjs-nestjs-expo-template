import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, Matches } from "class-validator";
import { Transform } from "class-transformer";

export class VerifyEmailDto {
  @ApiProperty({
    example: "123456",
    description: "6-digit verification code sent to your email",
  })
  @IsString()
  @Length(6, 6, { message: "Code must be exactly 6 digits" })
  @Matches(/^\d{6}$/, { message: "Code must contain only digits" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  code: string;
}
