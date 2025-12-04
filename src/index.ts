import { Redis } from '@upstash/redis'

export default {
  register() {},

  bootstrap({ strapi }) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    })

    const clearCache = async () => {
      const keys = await redis.keys('cache:*')
      for (const key of keys) await redis.del(key)
      strapi.log.info('Cache invalidado automáticamente')
    }

    const events = [
      'api::product.product',
      'api::category.category'
    ]

    events.forEach(uid => {
      strapi.db.lifecycles.subscribe({
        models: [uid],

        afterCreate() {
          clearCache()
        },
        afterUpdate() {
          clearCache()
        },
        afterDelete() {
          clearCache()
        }
      })
    })
  }
}
