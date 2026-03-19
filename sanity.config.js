import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'novavix-admin',
  title: 'Novavix Admin',

  projectId: '70qpcg23', 
  dataset: 'production',

  // IMPORTANTE: O basePath deve ser exatamente o nome da pasta em /app
  basePath: '/admin',

  plugins: [structureTool()],

  schema: {
    types: schemaTypes,
  },
})
