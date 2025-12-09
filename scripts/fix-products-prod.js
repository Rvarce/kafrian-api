#!/usr/bin/env node

/* eslint-disable no-console */
require('dotenv').config()

const STRAPI_URL = process.env.STRAPI_URL
const STRAPI_TOKEN = process.env.STRAPI_TOKEN

const SOURCE_CATEGORY_NAME = process.env.SOURCE_CATEGORY_NAME || 'Bebe'
const TARGET_CATEGORY_NAME = process.env.TARGET_CATEGORY_NAME || 'Bebés'

if (!STRAPI_URL || !STRAPI_TOKEN) {
  console.error('Faltan STRAPI_URL o STRAPI_TOKEN en .env')
  process.exit(1)
}

async function apiJson(pathname, { method = 'GET', body, headers = {} } = {}) {
  const url = `${STRAPI_URL}${pathname}`
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message = isJson ? payload?.error?.message || payload?.message : payload
    throw new Error(
      `Request ${method} ${pathname} failed: ${response.status} ${response.statusText} - ${message || 'Unknown error'}`
    )
  }

  return payload
}

// Helper para paginar todos los documentos
async function fetchAll(path, params = {}) {
  const all = []
  let page = 1
  let pageCount = 1

  do {
    const searchParams = new URLSearchParams({
      ...Object.entries(params).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null) acc[k] = String(v)
        return acc
      }, {}),
      'pagination[page]': String(page),
      'pagination[pageSize]': '100',
    })

    const res = await apiJson(`${path}?${searchParams.toString()}`)
    all.push(...(res.data || []))
    pageCount = res.meta?.pagination?.pageCount || 1
    page += 1
  } while (page <= pageCount)

  return all
}

async function getCategoryDocumentIdByName(name) {
  const res = await apiJson(
    `/api/categories?filters[name][$eq]=${encodeURIComponent(name)}&pagination[pageSize]=1`
  )

  const category = res.data?.[0]
  if (!category) {
    throw new Error(`No se encontró categoría con name="${name}"`)
  }

  // Strapi 5: usamos documentId para relaciones
  return category.documentId
}

async function main() {
  console.log('STRAPI_URL:', STRAPI_URL)
  console.log(`Corrigiendo productos:`)
  console.log(`  - in_stock: false -> true para TODOS`)
  console.log(`  - categoría "${SOURCE_CATEGORY_NAME}" -> "${TARGET_CATEGORY_NAME}"`)

  // 1) Obtener documentId de la categoría destino
  const targetCategoryDocId = await getCategoryDocumentIdByName(TARGET_CATEGORY_NAME)
  console.log('documentId de categoría destino:', targetCategoryDocId)

  // 2) Traer TODOS los productos (con categoría populada)
  const products = await fetchAll('/api/products', {
    'populate[category]': 'true',
  })

  console.log(`Encontrados ${products.length} productos en total`)

  let updatedCount = 0

  for (const p of products) {
    const documentId = p.documentId           // 👈 clave para la URL
    const title = p.title
    const currentInStock = p.in_stock
    const currentCategoryName = p.category?.name || null

    const needsCategoryFix = currentCategoryName === SOURCE_CATEGORY_NAME
    const needsStockFix = currentInStock !== true

    if (!needsCategoryFix && !needsStockFix) {
      continue // nada que hacer en este producto
    }

    const payload = {}

    // Fix de stock (para todos los que no estén true)
    if (needsStockFix) {
      payload.in_stock = true
    }

    // Fix de categoría SOLO si estaba en la categoría equivocada
    if (needsCategoryFix) {
      payload.category = targetCategoryDocId
    }

    try {
      // 👇 IMPORTANTE: usamos documentId, no id numérico
      await apiJson(`/api/products/${documentId}`, {
        method: 'PUT',
        body: { data: payload },
      })
      updatedCount += 1
      console.log(
        `✅ Actualizado producto doc=${documentId} title="${title}"` +
          (needsCategoryFix
            ? ` [category: "${currentCategoryName}" -> "${TARGET_CATEGORY_NAME}"]`
            : ' [solo in_stock]')
      )
    } catch (err) {
      console.error(
        `❌ Error actualizando producto doc=${documentId} title="${title}": ${err.message}`
      )
    }
  }

  console.log(`Listo ✅ Productos actualizados: ${updatedCount}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
