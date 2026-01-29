import { Strategy, VerifyCallback, Profile, StrategyOptions } from 'passport-google-oauth20';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    private allowedEmails: string[];

    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        super({
            clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
            clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
            callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '/auth/google/callback',
            scope: ['email', 'profile'],
        } as StrategyOptions);

        const emailsEnv = configService.get<string>('GOOGLE_ALLOWED_EMAILS') || '';
        this.allowedEmails = emailsEnv.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
    ): Promise<any> {
        const email = profile.emails?.[0]?.value?.toLowerCase();

        if (!email) {
            return done(new UnauthorizedException('No email found in Google profile'), false);
        }

        if (this.allowedEmails.length > 0 && !this.allowedEmails.includes(email)) {
            return done(new UnauthorizedException('Email not in allowed list'), false);
        }

        const user = await this.authService.findOrCreateGoogleUser(email, profile.displayName);
        done(null, user);
    }
}
