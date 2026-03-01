import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { tokensPayload } from 'contracts/my-library';

interface RequestWithUser {
  user: tokensPayload;
  [key: string]: unknown;
}

export const CurrentUser = createParamDecorator(
  (data: keyof tokensPayload, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<unknown>();

    const requestWithUser = request as RequestWithUser;

    const user = requestWithUser.user;

    if (!user) {
      return null;
    }

    if (data) {
      return user[data];
    }

    return user;
  },
);
