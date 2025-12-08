import { Redis } from '@upstash/redis'

let redis: Redis | null = null

function getRedis() {
  const url = process.env.REDIS_URL
  const token = process.env.REDIS_TOKEN
  if (!url || !token) {
    // En local o si no quieres Redis, simplemente loguea y no caches
    console.warn('[cache] REDIS_URL o REDIS_TOKEN no configurados, se omite cache')
    return null
  }

  if (!redis) {
    redis = new Redis({ url, token })
  }

  return redis
}

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

    const client = getRedis()
    if (!client) {
      // No hay Redis configurado → seguimos sin cache
      return next()
    }

    const key = `cache:${ctx.url}`

    try {
      const cached = await client.get(key)

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
        await client.set(key, ctx.body, { ex: ttl })
        ctx.set('X-Cache', 'MISS')
      }
    } catch (err) {
      console.error('[cache] Error usando Redis', err)
      // Si Redis falla, no matamos la request, solo seguimos
      await next()
    }
  }
}
