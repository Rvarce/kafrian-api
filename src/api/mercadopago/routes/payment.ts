export default {
  routes: [
    {
      method: 'POST',
      path: '/webhook/mercadopago',
      handler: 'payment.webhook',
      config: {
        auth: false,   // 👈 IMPORTANTE (v5 permite esto)
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/mercadopago/webhook-test',
      handler: 'payment.webhookTest',
      config: {
        auth: false, // solo para desarrollo, luego lo puedes proteger
      },
    },
  ],
}
