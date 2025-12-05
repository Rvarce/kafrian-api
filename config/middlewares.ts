export default [
  {
    name: 'global::cache',
    config: {
      ttl: 3600 // 1 hora
    }
  },
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
