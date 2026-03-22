import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('invite/accept')
  acceptInvite(@Body() body: { token: string; password: string; name: string }) {
    return this.authService.acceptInvite(body.token, body.password, body.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.id);
  }
}
