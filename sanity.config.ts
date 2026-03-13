import { defineConfig } from 'sanity'
import { deskTool } from 'sanity/desk'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'default',
  title: 'Novavix Admin',

  projectId: 'SEU_PROJECT_ID_AQUI', // Encontre no manage.sanity.io
  dataset: 'production',

  basePath: '/admin', // O painel ficará em novavix-site.onrender.com/admin

  plugins: [deskTool()],

  schema: {
    types: schemaTypes,
  },
})
