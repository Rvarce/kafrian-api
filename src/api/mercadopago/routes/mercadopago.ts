module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/mercadopago/preference',
      handler: 'mercadopago.createPreference',
      config: {
        auth: false
      }
    }
  ]
}
