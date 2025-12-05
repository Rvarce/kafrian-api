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

  async find(ctx) {
    const user = ctx.state.user;

    // Si no hay usuario autenticado → comportamiento por defecto
    if (!user) {
      // @ts-ignore
      return await super.find(ctx);
    }

    // Si es admin-front → ve TODAS las órdenes
    if (user.role && user.role.name === 'admin-front') {
      // @ts-ignore
      return await super.find(ctx);
    }

    // Resto de usuarios → sólo sus órdenes
    const q = (ctx.query || {}) as any;

    q.filters = {
      ...(q.filters || {}),
      // Filtro correcto por relación en Strapi 5
      user: {
        id: user.id,
      },
    };

    ctx.query = q;

    // @ts-ignore
    return await super.find(ctx);
  },

  async findOne(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;

    if (!user) {
      return ctx.unauthorized();
    }

    // admin-front puede ver cualquier orden
    if (user.role && user.role.name === 'admin-front') {
      // @ts-ignore
      return await super.findOne(ctx);
    }

    // Para usuarios normales: verificar que la orden sea suya
    const entity = (await strapi.entityService.findOne('api::order.order', id, {
      populate: { user: true },
    })) as any;

    if (!entity || !entity.user || entity.user.id !== user.id) {
      return ctx.unauthorized('No tienes acceso a esta orden');
    }

    // @ts-ignore
    return await super.findOne(ctx);
  },

  async update(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params;

    if (!user) {
      return ctx.unauthorized();
    }

    // Sólo admin-front puede actualizar órdenes (ej: marcar viewed)
    if (!user.role || user.role.name !== 'admin-front') {
      return ctx.unauthorized('Sólo administradores pueden actualizar órdenes');
    }

    const body = (ctx.request.body as any)?.data || {};

    // Limitamos lo que se puede actualizar desde el front: sólo `viewed`
    ctx.request.body = {
      data: {
        viewed: body.viewed === true,
      },
    };

    // @ts-ignore
    return await super.update(ctx);
  },
}))
