type CacheEntry = {
    value: any;
    timestamp: number;
};

export class RateLimiter {
    private cache: Map<string, CacheEntry> = new Map();
    private readonly cacheTime: number;

    constructor(cacheTimeMs: number = 5000) { 
        this.cacheTime = cacheTimeMs;
    }

    async executeWithRateLimit<T>(
        key: string,
        fn: () => Promise<T>
    ): Promise<T> {
        const cached = this.cache.get(key);
        const now = Date.now();

        if (cached && now - cached.timestamp < this.cacheTime) {
            console.log('Using cached result for:', key);
            return cached.value as T;
        }

        console.log('Executing rate-limited function for:', key);
        const result = await fn();
        this.cache.set(key, { value: result, timestamp: now });
        return result;
    }

    clearCache() {
        this.cache.clear();
    }
}

export const rateLimiter = new RateLimiter();
