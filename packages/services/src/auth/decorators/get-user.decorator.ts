import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "../types.js";

export const GetUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (data) {
      return user?.[data];
    }

    return user;
  }
);
