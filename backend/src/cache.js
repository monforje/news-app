import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL;
let client = null;
let isRedisConnected = false;

// In-memory fallback cache
const memoryCache = new Map();

// Инициализация Redis клиента
async function initRedis() {
  if (!REDIS_URL) {
    console.log('Redis URL not found, using in-memory cache');
    return;
  }
  
  try {
    client = createClient({ url: REDIS_URL });
    
    client.on('error', (err) => {
      console.error('Redis error:', err);
      isRedisConnected = false;
    });
    
    client.on('connect', () => {
      console.log('Redis connected');
      isRedisConnected = true;
    });
    
    await client.connect();
    
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    isRedisConnected = false;
  }
}

// Инициализируем при загрузке модуля
initRedis();

export async function getCache(key) {
  if (isRedisConnected && client) {
    try {
      return await client.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      isRedisConnected = false;
    }
  }
  
  // Fallback to memory cache
  const cached = memoryCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }
  
  // Remove expired entry
  if (cached) {
    memoryCache.delete(key);
  }
  
  return null;
}

export async function setCache(key, value, ttlSec) {
  if (isRedisConnected && client) {
    try {
      await client.set(key, value, { EX: ttlSec });
      return;
    } catch (error) {
      console.error('Redis set error:', error);
      isRedisConnected = false;
    }
  }
  
  // Fallback to memory cache
  memoryCache.set(key, {
    value,
    expires: Date.now() + (ttlSec * 1000)
  });
  
  // Clean up expired entries periodically
  if (memoryCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of memoryCache.entries()) {
      if (v.expires <= now) {
        memoryCache.delete(k);
      }
    }
  }
}
