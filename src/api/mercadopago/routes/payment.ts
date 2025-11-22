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
  ],
}
