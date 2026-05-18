import { Controller, Post, Get, Body, Query, Res, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response, Request, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoginDto, RefreshDto, AcceptInviteDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_BASE: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  path: '/',
};
const ACCESS_MAX_AGE = 15 * 60 * 1000;             // 15 min
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 * 1000;  // 30 days

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token',  accessToken,  { ...COOKIE_BASE, maxAge: ACCESS_MAX_AGE });
  res.cookie('refresh_token', refreshToken, { ...COOKIE_BASE, maxAge: REFRESH_MAX_AGE });
}

function clearAuthCookies(res: Response) {
  res.clearCookie('access_token',  { ...COOKIE_BASE });
  res.clearCookie('refresh_token', { ...COOKIE_BASE });
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 attempts per 15 min
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body.email, body.password, body.deviceId, body.deviceName);
    if (result?.token && result?.refreshToken) {
      setAuthCookies(res, result.token, result.refreshToken);
    }
    return result;
  }

  @Post('refresh')
  async refresh(
    @Body() body: Partial<RefreshDto>,
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = body?.refreshToken || req.cookies?.refresh_token;
    if (!token) return { error: 'No refresh token' };
    const result = await this.authService.refreshToken(token);
    if (result?.token && result?.refreshToken) {
      setAuthCookies(res, result.token, result.refreshToken);
    }
    return result;
  }

  @Post('logout')
  async logout(
    @Body() body: Partial<RefreshDto>,
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = body?.refreshToken || req.cookies?.refresh_token;
    clearAuthCookies(res);
    if (token) return this.authService.logout(token);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    clearAuthCookies(res);
    return this.authService.logoutAll(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  getSessions(@CurrentUser() user: any) {
    return this.authService.getActiveSessions(user.id);
  }

  @Get('invite/check')
  checkInvite(@Query('token') token: string) {
    return this.authService.checkInvite(token);
  }

  @Post('invite/accept')
  acceptInvite(@Body() body: AcceptInviteDto) {
    return this.authService.acceptInvite(body.token, body.password, body.name, body.consent);
  }

  @Post('forgot')
  @Throttle({ default: { limit: 3, ttl: 900000 } }) // 3 per 15 min
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('reset')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.id);
  }
}
