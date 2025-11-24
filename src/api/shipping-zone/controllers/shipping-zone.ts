// src/api/shipping-zone/controllers/shipping-zone.ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::shipping-zone.shipping-zone', ({ strapi }) => ({

  async calculate(ctx) {
    try {
      const { region, commune, items } = ctx.request.body;
      console.log('region', region)
      if (!region || !items?.length) {
        return ctx.badRequest('Region e items son requeridos');
      }

      // 1) Cargar productos del carrito
      const productIds = items.map((i: any) => i.id);

      const products = await strapi.db.query('api::product.product').findMany({
        where: { id: { $in: productIds } },
        select: ['id', 'price', 'proveedor'],
      });

      // 2) Armar grupos por proveedor
      const groups: Record<string, {
        supplier: string;
        items: any[];
        subtotal: number;
        totalWeight: number;
      }> = {};

      for (const item of items) {
        const product = products.find((p) => p.id === item.id);
        if (!product) continue;

        const qty = Number(item.qty) || 1;
        const supplier = product.proveedor || 'default';

        if (!groups[supplier]) {
          groups[supplier] = {
            supplier,
            items: [],
            subtotal: 0,
            totalWeight: 0,
          };
        }

        groups[supplier].items.push({ product, qty });

        groups[supplier].subtotal += Number(product.price) * qty;
        // groups[supplier].totalWeight += (product.weight_kg || 0.5) * qty;
      }

      // 3) Calcular envío por cada proveedor (misma lógica de zona, pero por grupo)
      let totalShipping = 0;
      const breakdown: any[] = [];

      for (const supplierKey of Object.keys(groups)) {
        const group = groups[supplierKey];

        // buscar zona por región (puedes luego diferenciar por proveedor si quieres)
        const zone = await strapi.db.query('api::shipping-zone.shipping-zone').findOne({
          where: {
            regions: { $containsi: region },
          },
        });

        if (!zone) {
          return ctx.badRequest(`No hay zona de envío para la región ${region}`);
        }

        const basePrice = Number((zone as any).base_price || 0);
        const pricePerKg = Number((zone as any).price_per_kg || 0);
        const freeFrom = Number((zone as any).free_shipping_from || 0);

        let shippingPrice = basePrice + pricePerKg * group.totalWeight;

        if (freeFrom > 0 && group.subtotal >= freeFrom) {
          shippingPrice = 0;
        }

        shippingPrice = Math.round(shippingPrice);

        totalShipping += shippingPrice;

        breakdown.push({
          supplier: group.supplier,
          zone: (zone as any).name,
          price: shippingPrice,
          subtotal: group.subtotal,
          totalWeight: group.totalWeight,
        });
      }

      ctx.body = {
        price: totalShipping,
        currency: 'CLP',
        breakdown, // 👈 por si quieres mostrar info por proveedor o guardarla en la orden
      };
    } catch (err) {
      strapi.log.error('Error calculando envío', err);
      return ctx.internalServerError('Error calculando envío');
    }
  },

}));
