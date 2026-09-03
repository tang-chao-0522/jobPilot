import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { prisma } from '@jobpilot/database';
import bcrypt from 'bcryptjs';
import { IsEmail, IsString, MinLength } from 'class-validator';
export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(6) password!: string;
  @IsString() nickname!: string;
}
export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}
@Injectable()
export class AuthService {
  constructor(private jwt: JwtService) {}
  async register(d: RegisterDto) {
    if (await prisma.user.findUnique({ where: { email: d.email } }))
      throw new UnauthorizedException('邮箱已注册');
    const user = await prisma.user.create({
      data: {
        email: d.email,
        nickname: d.nickname,
        passwordHash: await bcrypt.hash(d.password, 10),
      },
    });
    return this.token(user);
  }
  async login(d: LoginDto) {
    const user = await prisma.user.findUnique({ where: { email: d.email } });
    if (!user || !(await bcrypt.compare(d.password, user.passwordHash)))
      throw new UnauthorizedException('邮箱或密码错误');
    return this.token(user);
  }
  token(u: any) {
    return {
      accessToken: this.jwt.sign({ sub: u.id.toString(), email: u.email }),
      user: { id: u.id, email: u.email, nickname: u.nickname },
    };
  }
}
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  canActivate(c: ExecutionContext) {
    const req = c.switchToHttp().getRequest();
    const token = req.headers.authorization?.replace(/^Bearer /, '') || req.query?.token;
    if (!token) throw new UnauthorizedException();
    try {
      const p = this.jwt.verify(token);
      req.user = { id: BigInt(p.sub), email: p.email };
      return true;
    } catch {
      throw new UnauthorizedException('登录已过期');
    }
  }
}
@Controller('auth')
export class AuthController {
  constructor(private s: AuthService) {}
  @Post('register') register(@Body() d: RegisterDto) {
    return this.s.register(d);
  }
  @Post('login') login(@Body() d: LoginDto) {
    return this.s.login(d);
  }
  @UseGuards(JwtAuthGuard) @Get('me') async me(@Req() request: any) {
    return request.user;
  }
}
