import { BazarProfile } from '../types';

interface CachedProfile {
  profile: BazarProfile;
  timestamp: number;
}

interface ProfileCache {
  [address: string]: CachedProfile;
}

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 60 * 60 * 1000;

class BazarProfileCache {
  private static instance: BazarProfileCache;
  private cache: ProfileCache = {};

  private constructor() {
    // Load cache from localStorage on initialization
    try {
      const savedCache = localStorage.getItem('bazarProfileCache');
      if (savedCache) {
        this.cache = JSON.parse(savedCache);
      }
    } catch (error) {
      console.error('Error loading cache from localStorage:', error);
    }
  }

  public static getInstance(): BazarProfileCache {
    if (!BazarProfileCache.instance) {
      BazarProfileCache.instance = new BazarProfileCache();
    }
    return BazarProfileCache.instance;
  }

  public getProfile(address: string): BazarProfile | null {
    const cachedData = this.cache[address];
    if (!cachedData) return null;

    const now = Date.now();
    if (now - cachedData.timestamp > CACHE_DURATION) {
      // Cache is expired
      delete this.cache[address];
      this.saveToLocalStorage();
      return null;
    }

    return cachedData.profile;
  }

  public setProfile(address: string, profile: BazarProfile): void {
    this.cache[address] = {
      profile,
      timestamp: Date.now()
    };
    this.saveToLocalStorage();
  }

  public clearCache(): void {
    this.cache = {};
    this.saveToLocalStorage();
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('bazarProfileCache', JSON.stringify(this.cache));
    } catch (error) {
      console.error('Error saving cache to localStorage:', error);
    }
  }

  public isExpired(address: string): boolean {
    const cachedData = this.cache[address];
    if (!cachedData) return true;

    const now = Date.now();
    return now - cachedData.timestamp > CACHE_DURATION;
  }
}

export const profileCache = BazarProfileCache.getInstance();
