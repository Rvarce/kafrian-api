function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function buildOrderReceivedEmail(orderData) {
  const {
    payment_id,
    payment_status,
    payment_method,
    total,
    items,
    first_name,
    last_name,
    address,
  } = orderData;
  console.log('address', address)

  const finalAddress = `${address.street_name} ${address.street_number}, ${address.zip_code}`
  console.log('finalAddress', finalAddress)

  const totalFormatted = formatCurrency(total || 0);

  const itemsRows = (items || [])
    .map((item) => {
      const title = item.title || item.description || 'Producto';
      const quantity = item.quantity || 1;
      const unitPrice = item.unit_price || item.price || 0;
      const subtotal = unitPrice * quantity;

      return `
        <tr>
          <td>${title}</td>
          <td style="text-align:center;">${quantity}</td>
          <td style="text-align:right;">${formatCurrency(unitPrice)}</td>
          <td style="text-align:right;">${formatCurrency(subtotal)}</td>
        </tr>
      `;
    })
    .join('');

  const year = new Date().getFullYear();

  // Aquí puedes pegar el HTML de arriba y reemplazar los placeholders
  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Compra recepcionada</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
        font-family: Arial, Helvetica, sans-serif;
        color: #333333;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e0e0e0;
      }
      .email-header {
        background-color: #0f172a;
        color: #ffffff;
        padding: 20px 24px;
        text-align: left;
      }
      .email-header h1 {
        margin: 0;
        font-size: 20px;
      }
      .email-body {
        padding: 24px;
      }
      .highlight-box {
        background-color: #f1f5f9;
        border-radius: 6px;
        padding: 16px;
        margin-bottom: 24px;
        font-size: 14px;
        line-height: 1.5;
      }
      .highlight-label {
        font-weight: bold;
        color: #0f172a;
      }
      .order-summary-title {
        font-size: 16px;
        font-weight: bold;
        margin: 0 0 12px 0;
        color: #0f172a;
      }
      .products-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
        margin-bottom: 24px;
      }
      .products-table th,
      .products-table td {
        padding: 8px;
        border-bottom: 1px solid #e5e7eb;
        text-align: left;
      }
      .products-table th {
        background-color: #f9fafb;
        font-weight: 600;
      }
      .products-table tfoot td {
        font-weight: bold;
        border-top: 2px solid #0f172a;
        border-bottom: none;
      }
      .footer-note {
        font-size: 12px;
        color: #6b7280;
        margin-top: 12px;
      }
      .email-footer {
        padding: 16px 24px 20px 24px;
        text-align: center;
        font-size: 12px;
        color: #9ca3af;
      }
      @media (max-width: 600px) {
        .email-container {
          border-radius: 0;
        }
        .email-body {
          padding: 16px;
        }
        .email-header {
          padding: 16px;
        }
      }
    </style>
  </head>
  <body>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding: 16px 0;">
          <div class="email-container">
            <div class="email-header">
              <h1>¡Tu compra ha sido recepcionada! 🎉</h1>
            </div>

            <div class="email-body">
              <h1>KafriaN</h1>
              <p style="font-size:14px;margin:0 0 12px 0;">
                Hola <strong>${first_name || ''} ${last_name || ''}</strong>,
              </p>
              <p style="font-size:14px;margin:0 0 20px 0;">
                Hemos recibido correctamente tu pago y estamos preparando tu pedido.
                A continuación encontrarás el detalle de tu compra.
              </p>

              <div class="highlight-box">
                <div>
                  <span class="highlight-label">Payment ID:</span>
                  <span>${payment_id}</span>
                </div>
                <div>
                  <span class="highlight-label">Estado del pago:</span>
                  <span>${payment_status}</span>
                </div>
                <div>
                  <span class="highlight-label">Método de pago:</span>
                  <span>${payment_method}</span>
                </div>
                <div>
                  <span class="highlight-label">Total:</span>
                  <span>${totalFormatted}</span>
                </div>
                <div>
                  <span class="highlight-label">Despacho a:</span>
                  <span>${finalAddress || ''}</span>
                </div>
              </div>

              <p class="order-summary-title">Resumen de tu compra</p>
              <table class="products-table" role="presentation">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style="text-align:center;">Cant.</th>
                    <th style="text-align:right;">Precio</th>
                    <th style="text-align:right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="text-align:right;">Total</td>
                    <td style="text-align:right;">${totalFormatted}</td>
                  </tr>
                </tfoot>
              </table>

              <p style="font-size:14px;margin:0 0 8px 0;">
                Te avisaremos por este mismo medio cuando tu pedido haya sido despachado.
              </p>
              <p class="footer-note">
                Si no reconoces esta compra o tienes alguna duda, por favor contáctanos
                al correo hola@kafrian.cl.
              </p>
            </div>

            <div class="email-footer">
              © ${year} KafriaN. Todos los derechos reservados.
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return html;
}

export function buildAdminOrderNotificationEmail(orderData: any) {
  const {
    payment_id,
    payment_status,
    payment_method,
    total,
    items,
    email,
    first_name,
    last_name,
    phone,
    address,
    payment_detail,
  } = orderData;

  const totalFormatted = formatCurrency(total || 0);
  const finalAddress = `${address.street_name} ${address.street_number}, ${address.zip_code}`
  console.log('finalAddress', finalAddress)

  const itemsRows = (items || [])
    .map((item) => {
      const title = item.title || item.description || 'Producto';
      const quantity = item.quantity || 1;
      const unitPrice = item.unit_price || item.price || 0;
      const subtotal = unitPrice * quantity;

      return `
        <tr>
          <td>${title}</td>
          <td style="text-align:center;">${quantity}</td>
          <td style="text-align:right;">${formatCurrency(unitPrice)}</td>
          <td style="text-align:right;">${formatCurrency(subtotal)}</td>
        </tr>
      `;
    })
    .join('');

  const year = new Date().getFullYear();

  // Algunos datos opcionales desde payment_detail (si existen)
  const createdAt =
    payment_detail?.date_created ||
    payment_detail?.date_approved ||
    null;
  const statusDetail = payment_detail?.status_detail || '';

  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Nueva compra recibida</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
        font-family: Arial, Helvetica, sans-serif;
        color: #333333;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e0e0e0;
      }
      .email-header {
        background-color: #0f172a;
        color: #ffffff;
        padding: 20px 24px;
        text-align: left;
      }
      .email-header h1 {
        margin: 0;
        font-size: 20px;
      }
      .email-body {
        padding: 24px;
      }
      .section-title {
        font-size: 15px;
        font-weight: bold;
        margin: 16px 0 8px 0;
        color: #0f172a;
      }
      .info-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        margin-bottom: 12px;
      }
      .info-table td {
        padding: 4px 0;
        vertical-align: top;
      }
      .info-label {
        font-weight: bold;
        width: 130px;
        padding-right: 8px;
        color: #0f172a;
      }
      .products-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
        margin-bottom: 24px;
      }
      .products-table th,
      .products-table td {
        padding: 8px;
        border-bottom: 1px solid #e5e7eb;
        text-align: left;
      }
      .products-table th {
        background-color: #f9fafb;
        font-weight: 600;
      }
      .products-table tfoot td {
        font-weight: bold;
        border-top: 2px solid #0f172a;
        border-bottom: none;
      }
      .json-box {
        background-color: #f9fafb;
        border-radius: 6px;
        padding: 12px;
        font-size: 11px;
        font-family: "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        color: #111827;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 260px;
        overflow: auto;
      }
      .email-footer {
        padding: 16px 24px 20px 24px;
        text-align: center;
        font-size: 12px;
        color: #9ca3af;
      }
      @media (max-width: 600px) {
        .email-container {
          border-radius: 0;
        }
        .email-body {
          padding: 16px;
        }
        .email-header {
          padding: 16px;
        }
      }
    </style>
  </head>
  <body>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding: 16px 0;">
          <div class="email-container">
            <!-- Header -->
            <div class="email-header">
              <h1>Nueva compra registrada 🧾</h1>
            </div>

            <!-- Body -->
            <div class="email-body">
              <p style="font-size:13px;margin:0 0 12px 0;">
                Se ha registrado una nueva compra en el sistema. A continuación se detallan los datos del pedido y del comprador.
              </p>

              <!-- Datos del comprador -->
              <div class="section-title">Datos del comprador</div>
              <table class="info-table" role="presentation">
                <tr>
                  <td class="info-label">Nombre:</td>
                  <td>${(first_name || '') + ' ' + (last_name || '')}</td>
                </tr>
                <tr>
                  <td class="info-label">Email:</td>
                  <td>${email || '—'}</td>
                </tr>
                <tr>
                  <td class="info-label">Teléfono:</td>
                  <td>${phone || '—'}</td>
                </tr>
                <tr>
                  <td class="info-label">Dirección:</td>
                  <td>${finalAddress || '—'}</td>
                </tr>
              </table>

              <!-- Datos del pago -->
              <div class="section-title">Datos de pago</div>
              <table class="info-table" role="presentation">
                <tr>
                  <td class="info-label">Payment ID:</td>
                  <td>${payment_id}</td>
                </tr>
                <tr>
                  <td class="info-label">Estado:</td>
                  <td>${payment_status || '—'}</td>
                </tr>
                <tr>
                  <td class="info-label">Detalle estado:</td>
                  <td>${statusDetail || '—'}</td>
                </tr>
                <tr>
                  <td class="info-label">Método:</td>
                  <td>${payment_method || '—'}</td>
                </tr>
                <tr>
                  <td class="info-label">Fecha pago:</td>
                  <td>${createdAt || '—'}</td>
                </tr>
                <tr>
                  <td class="info-label">Total:</td>
                  <td>${totalFormatted}</td>
                </tr>
              </table>

              <!-- Productos -->
              <div class="section-title">Productos</div>
              <table class="products-table" role="presentation">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style="text-align:center;">Cant.</th>
                    <th style="text-align:right;">Precio</th>
                    <th style="text-align:right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows || `
                    <tr>
                      <td colspan="4" style="text-align:center;color:#6b7280;font-size:13px;">
                        Sin items asociados en la orden.
                      </td>
                    </tr>
                  `}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="text-align:right;">Total</td>
                    <td style="text-align:right;">${totalFormatted}</td>
                  </tr>
                </tfoot>
              </table>

              <!-- JSON raw (útil para debug) -->
              <div class="section-title">Payload de la orden (debug)</div>
              <div class="json-box">
${JSON.stringify(orderData, null, 2)
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')}
              </div>
            </div>

            <!-- Footer -->
            <div class="email-footer">
              © ${year} Tu Sistema de Ventas. Notificación interna.
            </div>
          </div>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return html;
}
