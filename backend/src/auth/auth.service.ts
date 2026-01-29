import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
    ) { }

    async login(user: any) {
        const payload = { username: user.username || user.email, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    async findOrCreateGoogleUser(email: string, displayName: string): Promise<User> {
        let user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
            user = this.userRepository.create({
                email,
                username: displayName || email.split('@')[0],
            });
            await this.userRepository.save(user);
            this.logger.log(`Google user '${email}' created.`);
        }

        return user;
    }
}
