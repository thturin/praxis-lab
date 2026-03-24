//REDIS CONFIGURATION FOR GENERAL PURPOSE REDIS USAGE IN THE APP NOT FOR SESSIONS
const IORedis = require('ioredis');

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
    maxRetriesPerRequest: null
  };
};

const redisOptions = buildRedisOptions();
const redis = new IORedis(redisOptions);

module.exports = {
  redis,
  redisOptions
};
