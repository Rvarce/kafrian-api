import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::order.order', ({ strapi }) => ({

  // 🔹 GET /api/orders/mine
  async mine(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.unauthorized('Debes iniciar sesión')
    }

    // Paginación opcional ?page=&pageSize=
    const page = Number(ctx.request.query.page || 1)
    const pageSize = Number(ctx.request.query.pageSize || 10)

    const [data, total] = await Promise.all([
      strapi.db.query('api::order.order').findMany({
        where: { user: user.id },
        orderBy: { createdAt: 'desc' },
        offset: (page - 1) * pageSize,
        limit: pageSize,
      }),
      strapi.db.query('api::order.order').count({
        where: { user: user.id },
      }),
    ])

    ctx.body = {
      data,
      meta: {
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
          total,
        },
      },
    }
  },

}))
