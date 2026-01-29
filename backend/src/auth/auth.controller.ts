import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) { }

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth() {
        // Guard redirects to Google
    }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthCallback(@Req() req: any, @Res() res: Response) {
        const { access_token } = await this.authService.login(req.user);
        // Use FRONTEND_URL if set, otherwise use VITE_API_URL base
        const frontendUrl = this.configService.get<string>('FRONTEND_URL')
            || this.configService.get<string>('VITE_API_URL')?.replace(/\/api$/, '')
            || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/?token=${access_token}`);
    }
}

