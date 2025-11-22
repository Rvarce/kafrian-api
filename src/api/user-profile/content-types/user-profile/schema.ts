export default {
  info: {
    singularName: 'user-profile',
    pluralName: 'user-profiles',
    displayName: 'User Profile',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    email: { type: 'string', required: true, unique: true },
    password: { type: 'string', required: true },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    address: { type: 'json' },
  },
}
