import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  canActivate(context: ExecutionContext): Promise<boolean> {
    return context.getType() === 'http' ? super.canActivate(context) : Promise.resolve(true);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // req.ip honors only configured trusted proxies; never trust the raw XFF header.
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (req.route?.path === '/api/auth/login' || req.route?.path === '/api/auth/forgot') {
      return `${ip}:${String(req.body?.email || '').trim().toLowerCase().slice(0, 254)}`;
    }
    return ip;
  }
}
