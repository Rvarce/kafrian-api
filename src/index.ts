// src/index.ts
import { Redis } from '@upstash/redis'

export default {
  register() {},

  bootstrap({ strapi }) {
    // Puedes unificar con el middleware si quieres:
    // primero REDIS_URL/REDIS_TOKEN, luego UPSTASH_REDIS_REST_URL/_TOKEN como fallback
    const url =
      process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL
    const token =
      process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      strapi.log.warn(
        '[cache] Redis/Upstash no configurado (REDIS_URL / REDIS_TOKEN o UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN vacíos). Se desactiva invalidación automática de cache.'
      )
      // 👇 no seteamos lifecycles si no hay Redis
      return
    }

    const redis = new Redis({ url, token })

    const clearCache = async () => {
      try {
        const keys = await redis.keys('cache:*')
        if (keys.length) {
          await redis.del(...keys)
        }
        strapi.log.info(`[cache] Cache invalidado automáticamente (${keys.length} keys)`)
      } catch (err) {
        strapi.log.error('[cache] Error al invalidar cache', err)
      }
    }

    const events = [
      'api::product.product',
      'api::category.category'
    ]

    events.forEach((uid) => {
      strapi.db.lifecycles.subscribe({
        models: [uid],

        async afterCreate() {
          await clearCache()
        },
        async afterUpdate() {
          await clearCache()
        },
        async afterDelete() {
          await clearCache()
        },
      })
    })
  },
}
