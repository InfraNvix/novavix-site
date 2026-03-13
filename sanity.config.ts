import { defineConfig } from 'sanity'
import { deskTool } from 'sanity/desk'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'default',
  title: 'Novavix Admin',

  // Você encontra esse ID no site manage.sanity.io
  projectId: 'SEU_PROJECT_ID_AQUI', 
  dataset: 'production',

  basePath: '/admin',

  plugins: [deskTool()],

  schema: {
    types: schemaTypes,
  },
})
