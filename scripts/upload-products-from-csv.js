#!/usr/bin/env node

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const STRAPI_URL = process.env.STRAPI_URL || 'https://uplifting-friends-8807bc49ab.strapiapp.com';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;
const DEFAULT_LOCALE = process.env.STRAPI_LOCALE;
const PUBLISH = process.env.DRAFT_ONLY !== '1';

if (!STRAPI_TOKEN) {
  console.error('Missing STRAPI_TOKEN env var (create a Strapi API token with create/upload permissions).');
  process.exit(1);
}

const inputPath = path.resolve(process.argv[2] || 'products.csv');

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(fileContent) {
  const lines = fileContent.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line, rowIndex) => {
    const cells = splitCsvLine(line);
    if (cells.length !== headers.length) {
      console.warn(`Row ${rowIndex + 2} has ${cells.length} cells but ${headers.length} headers.`);
    }

    return headers.reduce((acc, header, idx) => {
      acc[header] = cells[idx] || '';
      return acc;
    }, {});
  });
}

function parseXlsx(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) return [];

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: '',
  });

  return rows.map((row) => {
    const normalized = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[key.toLowerCase().trim()] = typeof value === 'string' ? value.trim() : value;
    });
    return normalized;
  });
}

function parseInput(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xlsx') {
    return parseXlsx(filePath);
  }
  if (ext === '.csv') {
    return parseCsv(fs.readFileSync(filePath, 'utf8'));
  }

  throw new Error(`Unsupported file type: ${ext || 'unknown'}. Use .csv or .xlsx`);
}

async function apiJson(pathname, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${STRAPI_URL}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN}`,
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = isJson ? payload?.error?.message || payload?.message : payload;
    throw new Error(`Request to ${pathname} failed: ${response.status} ${response.statusText} - ${message || 'Unknown error'}`);
  }

  return payload;
}

const categoryCache = new Map();

async function ensureCategory(name) {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  if (categoryCache.has(key)) return categoryCache.get(key);

  // Buscar por nombre
  const existing = await apiJson(
    `/api/categories?filters[name][$eq]=${encodeURIComponent(name.trim())}`
  );

  // 👇 Usar documentId, NO id
  const existingDocId = existing?.data?.[0]?.documentId;
  if (existingDocId) {
    categoryCache.set(key, existingDocId);
    return existingDocId;
  }

  // Crear categoría si no existe
  const created = await apiJson('/api/categories', {
    method: 'POST',
    body: {
      data: {
        name: name.trim(),
        ...(PUBLISH ? { publishedAt: new Date().toISOString() } : {}),
      },
    },
  });

  const newDocId = created?.data?.documentId;
  categoryCache.set(key, newDocId);
  return newDocId;
}

function buildRichText(value) {
  const text = (value || '').trim();
  if (!text) return [];

  return [
    {
      type: 'paragraph',
      children: [{ type: 'text', text }],
    },
  ];
}

function parseImagesField(raw) {
  if (!raw) return [];
  return raw
    .trim()
    .split(/[|;]\s*/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

async function uploadImages(urls) {
  const ids = [];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Skipping image ${url} - could not download (${response.status})`);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileName = (url.split('/').pop() || 'image').split('?')[0] || 'image';

      const formData = new FormData();
      formData.append('files', new Blob([arrayBuffer]), fileName);

      const uploaded = await apiJson('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (Array.isArray(uploaded) && uploaded[0]?.id) {
        ids.push(uploaded[0].id);
      } else {
        console.warn(`Upload response for ${url} did not contain an id. Response: ${JSON.stringify(uploaded)}`);
      }
    } catch (err) {
      console.warn(`Skipping image ${url}: ${err.message}`);
    }
  }

  return ids;
}

function parsePrice(raw) {
  if (raw === undefined || raw === null) return undefined;
  const cleaned = raw.toString().replace(/[^\d.,-]/g, '').replace(',', '.');
  const num = Number.parseFloat(cleaned);
  if (Number.isNaN(num)) return undefined;
  return Math.round(num);
}

function slugify(str) {
  return str
    .normalize('NFD')                    // separa acentos
    .replace(/[\u0300-\u036f]/g, '')     // elimina acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')         // todo lo que no sea letra/num → -
    .replace(/^-+|-+$/g, '');            // limpia guiones al inicio/fin
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  const rows = parseInput(inputPath);
  console.log(`Found ${rows.length} rows in ${inputPath}`);

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const productIndex = i + 1;

    try {
      const categoryId = await ensureCategory(row.category);
      const imageUrls = parseImagesField(row.images);
      // const uploadedImageIds = imageUrls.length ? await uploadImages(imageUrls) : [];
      const price = parsePrice(row.price);
      const rawTitle = row.title?.trim() || '';
      const slug = rawTitle ? slugify(rawTitle) : undefined;

      const payload = {
        title: rawTitle || undefined,
        slug,
        supplier_code: row.supplier_code?.trim() || undefined,
        price,
        description: buildRichText(row.description),
        images_url: imageUrls.join('\n') || undefined,
        category: categoryId,
        in_stock: true,
        // ...(uploadedImageIds.length ? { images: uploadedImageIds } : {}),
        ...(DEFAULT_LOCALE ? { locale: DEFAULT_LOCALE } : {}),
        ...(PUBLISH ? { publishedAt: new Date().toISOString() } : {}),
      };

      const created = await apiJson('/api/products', {
        method: 'POST',
        body: { data: payload },
      });

      console.log(`✅ (${productIndex}/${rows.length}) Created product "${payload.title}" (id: ${created?.data?.id || 'unknown'})`);
    } catch (err) {
      console.error(`❌ (${productIndex}/${rows.length}) Failed to create product "${row.title}": ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
