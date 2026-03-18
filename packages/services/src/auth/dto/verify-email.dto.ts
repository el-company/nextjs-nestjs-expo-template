import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { Transform } from "class-transformer";

export class VerifyEmailDto {
  @ApiProperty({
    example: "abc123token",
    description: "Email verification token",
  })
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  token: string;
}
