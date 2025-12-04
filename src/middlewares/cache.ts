import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!
})

// Endpoints que quieres cachear
const CACHEABLE_PATHS = [
  '/api/products',
  '/api/categories',
  '/api/home',
]

export default (config, { strapi }) => {
  const ttl = config.ttl || 3600 // 1 hora por defecto

  return async (ctx, next) => {
    const isGET = ctx.method === 'GET'
    const path = ctx.path

    // Solo cacheamos GET y endpoints seleccionados
    if (!isGET || !CACHEABLE_PATHS.some(p => path.startsWith(p))) {
      return next()
    }

    const key = `cache:${ctx.url}`
    const cached = await redis.get(key)

    if (cached) {
      // 🔥 Asegurar headers CORS en respuestas cacheadas
      ctx.set('Access-Control-Allow-Origin', ctx.request.header.origin || '*')
      ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      ctx.set('Access-Control-Allow-Headers', ctx.request.header['access-control-request-headers'] || '*')
      ctx.set('Access-Control-Allow-Credentials', 'true')

      ctx.set('X-Cache', 'HIT')
      ctx.body = cached
      return
    }

    await next()

    // Solo cacheamos respuestas válidas
    if (ctx.status === 200 && ctx.body) {
      await redis.set(key, ctx.body, { ex: ttl })
      ctx.set('X-Cache', 'MISS')
    }
  }
}
