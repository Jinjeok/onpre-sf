import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService implements OnModuleInit {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async onModuleInit() {
        const adminUser = this.configService.get<string>('ADMIN_USERNAME');
        const adminPass = this.configService.get<string>('ADMIN_PASSWORD');

        if (!adminUser || !adminPass) return;

        const exists = await this.userRepository.findOne({ where: { username: adminUser } });
        if (!exists) {
            const hashedPassword = await bcrypt.hash(adminPass, 10);
            const user = this.userRepository.create({
                username: adminUser,
                password: hashedPassword,
            });
            await this.userRepository.save(user);
            this.logger.log(`Admin user '${adminUser}' seeded.`);
        }
    }

    async validateUser(username: string, pass: string): Promise<any> {
        const user = await this.userRepository.findOne({ where: { username } });
        if (user && await bcrypt.compare(pass, user.password)) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { username: user.username, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
