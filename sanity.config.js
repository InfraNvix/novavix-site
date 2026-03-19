import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'default',
  title: 'Novavix Admin',

  projectId: '70qpcg23', 
  dataset: 'production',

  basePath: '/admin',

  plugins: [structureTool()],

  schema: {
    types: schemaTypes,
  },
})
