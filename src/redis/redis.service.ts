import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Redis as redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly client: redis) {}

  async setTokens(userId: string, access: string, refresh: string) {
    const multi = this.client.multi();

    multi.set(`access:${userId}`, access, 'EX', 60 * 15);
    multi.set(`refresh:${userId}`, refresh, 'EX', 60 * 60 * 24 * 7);

    const result = await multi.exec();

    if (!result) {
      throw new Error('Redis transaction failed');
    }
  }

  async updateTokens(userId: string, access: string, refresh?: string) {
    const multi = this.client.multi();

    multi.set(`access:${userId}`, access, 'EX', 60 * 15);
    if (refresh) {
      multi.set(`refresh:${userId}`, refresh, 'EX', 60 * 60 * 24 * 7);
    }

    const result = await multi.exec();

    if (!result) {
      throw new Error('Redis transaction failed');
    }
  }

  async getTokens(
    userId: string,
  ): Promise<{ access: string; refresh: string }> {
    const multi = this.client.multi();
    multi.get(`access:${userId}`);
    multi.get(`refresh:${userId}`);

    const result = await multi.exec();

    if (!result || !result[0] || !result[1]) {
      throw new InternalServerErrorException('Redis transaction failed');
    }

    // Redis'ten gelen değer null ise result[x][1] null döner
    const access = result[0][1] as string | null;
    const refresh = result[1][1] as string | null;

    // EĞER REFRESH TOKEN SİLİNMİŞSE (TTL DOLMUŞSA)
    if (!refresh) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    // Access silinmiş ama refresh duruyorsa, yeni bir access üretme mantığına da gidebilirsin
    // Ama şimdilik basit tutalım:
    if (!access) {
      throw new UnauthorizedException('Access token missing.');
    }

    return { access, refresh };
  }
  async deleteTokens(userId: string) {
    await this.client.del(`auth:access:${userId}`);
    await this.client.del(`auth:refresh:${userId}`);
  }
}
