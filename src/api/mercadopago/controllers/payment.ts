// src/api/mercadopago/controllers/payment.ts
import { processWebhook } from '../services/payment'
import type { Context } from 'koa'
import { buildOrderReceivedEmail, buildAdminOrderNotificationEmail } from '../../utils/buildOrderReceivedEmail'

type MpTestPayment = {
  id: string
  status: string
  status_detail: string
  transaction_amount: number
  payment_type_id?: string
  date_approved: string
  date_created: string
  payer?: {
    email?: string
    first_name?: string
    last_name?: string
    phone?: {
      number?: string | null
    }
  }
  metadata?: any
  additional_info?: {
    items?: any[]
    payer?: {
      address?: any
    }
  }
}

export default {
  async webhook(ctx: Context) {
    const payload = ctx.request.body

    // Log inicial para debugging
    console.log('📩 Mercado Pago Webhook recibido:', JSON.stringify(payload, null, 2))

    // Respuesta inmediata (requisito MP)
    ctx.status = 200
    ctx.body = 'OK'

    // Procesar asincrónicamente
    try {
      await processWebhook(payload)
    } catch (err) {
      console.error('❌ Error procesando webhook:', err)
    }
  },

  // 🚧 SOLO PARA PRUEBAS: simula un pago aprobado sin llamar a MP
  async webhookTest(ctx) {
    try {
      const body = ctx.request.body || {}

      const fakePayload = {
        type: 'payment',
        data: {
          id: body.paymentId || 'TEST-PAYMENT-123',
        },
      }

      console.log('🧪 Webhook de prueba recibido, payload:', fakePayload)

      // 🔹 Pago fake tipado
      const payment: MpTestPayment = {
        id: fakePayload.data.id,
        status: 'approved',
        status_detail: 'accredited',
        transaction_amount: body.transactionAmount || 15000,
        date_approved: body.date_approved || new Date().toString(),
        date_created: body.date_created || new Date().toString(),
        payment_type_id: 'test',

        payer: {
          email: body.email || 'test_user@test.com',
          first_name: body.first_name || 'Cliente',
          last_name: body.last_name || 'Prueba',
          phone: {
            number: body.phone || null,
          },
        },

        metadata: body.metadata || {
          userId: body.userId || null,
          checkoutEmail: body.email || 'test_user@test.com',
          first_name: body.first_name || 'Cliente',
          last_name: body.last_name || 'Prueba',
          phone: body.phone || null,
          address: body.address || null,
        },

        additional_info: {
          items: body.items || [],
          payer: {
            address: body.address || null,
          },
        },
      }

      const metadata: any = payment.metadata || {}
      const additionalAddress = payment.additional_info?.payer?.address || null
      const finalAddress = metadata.address || additionalAddress

      const orderData = {
        payment_id: payment.id,
        payment_status: 'paid',
        payment_method: payment.payment_type_id ?? 'test',
        total: payment.transaction_amount,
        items: payment.additional_info?.items || [],
        email: metadata.checkoutEmail || payment.payer?.email || null,
        first_name: metadata.first_name || payment.payer?.first_name || null,
        last_name: metadata.last_name || payment.payer?.last_name || null,
        phone: metadata.phone || payment.payer?.phone?.number || null,
        address: finalAddress,
        user: metadata.userId || null,
        payment_detail: payment,
        date_created: payment.date_approved || null,
        date_approved: payment.date_created || null,
      }

      console.log('🧪 [TEST] Datos que se guardarán en Order:')
      console.log(orderData)

      const existing = await strapi.db
        .query('api::order.order')
        .findOne({ where: { payment_id: payment.id } })

      let order

      if (existing) {
        order = await strapi.db
          .query('api::order.order')
          .update({ where: { id: existing.id }, data: orderData })
      } else {
        order = await strapi.db
          .query('api::order.order')
          .create({ data: orderData })
      }

      console.log('✅ [TEST] Orden creada/actualizada correctamente:', order.id)

      const htmlClient = buildOrderReceivedEmail(orderData)
      await strapi.plugin('email').service('email').send({
        to: orderData.email,
        subject: 'KafriaN: ¡Tu compra ha sido recepcionada!',
        html: htmlClient,
      })

      const htmlAdmin = buildAdminOrderNotificationEmail(orderData)
      await strapi.plugin('email').service('email').send({
        to: 'hola@kafrian.cl',
        subject: 'KafriaN: Nueva compra desde la web, Yuhuu!!',
        html: htmlAdmin,
      })

      ctx.send({
        ok: true,
        order,
      })
    } catch (err) {
      console.error('❌ Error en webhookTest:', err)
      ctx.badRequest('Error en webhook de prueba')
    }
  }

}
