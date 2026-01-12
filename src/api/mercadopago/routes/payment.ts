import type { Core } from '@strapi/strapi'

const config: Core.RouterConfig = {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/webhook/mercadopago',
      handler: 'api::mercadopago.payment.webhook',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/mercadopago/webhook-test',
      handler: 'api::mercadopago.payment.webhookTest',
      config: { auth: false },
    },
  ],
}

export default config
