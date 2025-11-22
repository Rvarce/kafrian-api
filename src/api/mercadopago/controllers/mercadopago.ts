"use strict";

const { MercadoPagoConfig, Preference } = require("mercadopago");

module.exports = {
  async createPreference(ctx) {
    try {
      const { items, payer, metadata } = ctx.request.body;

      const client = new MercadoPagoConfig({
        accessToken: process.env.MP_ACCESS_TOKEN,
      });

      const preference = new Preference(client);

      const result = await preference.create({
        body: {
          items: items.map(i => ({
            title: i.title,
            quantity: i.qty,
            unit_price: Number(i.price),
            currency_id: "CLP",
          })),

          payer: {
            name: payer.first_name,
            surname: payer.last_name,
            email: payer.email,
            address: payer.address
          },

          metadata, // <── IMPORTANTÍSIMO

          back_urls: {
            success: 'http://localhost:3000/success',
            failure: 'http://localhost:3000/failure',
            pending: 'http://localhost:3000/pending',
          },

          auto_return: 'approved'
        },
      });

      return {
        id: result.id,
        init_point: result.init_point,
      };

    } catch (error) {
      console.error("MP ERROR:", error);
      return ctx.badRequest("Error creando preference");
    }
  }
};
