import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::user-profile.user-profile', ({ strapi }) => ({
  // Registro
  async register(ctx) {
    const { email, password, firstName, lastName, address } = ctx.request.body

    if (!email || !password) {
      return ctx.badRequest('Email y password requeridos')
    }

    const exists = await strapi.db
      .query('api::user-profile.user-profile')
      .findOne({ where: { email } })

    if (exists) {
      return ctx.conflict('Usuario ya existe')
    }

    const user = await strapi.db
      .query('api::user-profile.user-profile')
      .create({
        data: { email, password, firstName, lastName, address },
      })

    ctx.body = { user }
  },

  // Login
  async login(ctx) {
    const { email, password } = ctx.request.body

    const user = await strapi.db
      .query('api::user-profile.user-profile')
      .findOne({ where: { email } })

    if (!user) return ctx.notFound('Usuario no encontrado')
    if (user.password !== password) return ctx.unauthorized('Credenciales inválidas')

    ctx.body = { user }
  },
}))
