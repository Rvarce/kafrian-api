import type { Schema, Struct } from '@strapi/strapi';

export interface ArrayList extends Struct.ComponentSchema {
  collectionName: 'components_array_lists';
  info: {
    displayName: 'List';
    icon: 'bulletList';
  };
  attributes: {};
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'array.list': ArrayList;
    }
  }
}
