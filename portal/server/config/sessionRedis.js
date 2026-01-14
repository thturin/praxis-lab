//THIS REDIS SCRIPT IS FOR THE SESSION REDIS STORE ONLY IN APP.JS PRODUCTION USE ONLY
const Redis = require('ioredis');

const parseRedisUrl = (url) => {
    const parsed = new URL(url);
    return {
        host: parsed.hostname,
        port: Number(parsed.port) || 6379,
        password: parsed.password || undefined,
    };
};

const buildRedisOptions = () => {
    if (process.env.REDIS_URL) {
        return parseRedisUrl(process.env.REDIS_URL);
    }

    return {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
    };
};

const createSessionStore = (session) => {
    const RedisStore = require('connect-redis')(session);  // v6 syntax
    const redisOptions = buildRedisOptions();
    
    const sessionRedis = new Redis(redisOptions);
    
    sessionRedis.on('error', (err) => console.error('Redis session error:', err));
    sessionRedis.on('connect', () => console.log('Redis session store connected'));

    return new RedisStore({
        client: sessionRedis,
        prefix: 'sess:',
    });
};

module.exports = { createSessionStore };