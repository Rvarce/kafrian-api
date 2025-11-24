export default {
  routes: [
    {
      method: 'POST',
      path: '/shipping/calculate',
      handler: 'shipping-zone.calculate',
      config: {
        auth: false, // o true si quieres protegerlo
      },
    },
  ],
};
