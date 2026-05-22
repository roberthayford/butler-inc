interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
}

interface TokenBucket {
  count: number;
  resetAt: number;
}

export class InMemoryRateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private maxRequests: number;
  private windowMs: number;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    if (bucket.count >= this.maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    bucket.count++;
    return { allowed: true, remaining: this.maxRequests - bucket.count };
  }
}

// Shared instances for API routes
export const bookingLimiter = new InMemoryRateLimiter({ maxRequests: 5, windowMs: 60_000 });
export const priceLimiter = new InMemoryRateLimiter({ maxRequests: 20, windowMs: 60_000 });
export const webhookLimiter = new InMemoryRateLimiter({ maxRequests: 10, windowMs: 60_000 });
