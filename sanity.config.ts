import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure' // Mudamos de deskTool para structureTool
import { schemaTypes } from './schemas'

export default defineConfig({
  name: 'default',
  title: 'Novavix Admin',

  projectId: 'SEU_PROJECT_ID_AQUI', // Verifique se o seu ID está aqui
  dataset: 'production',

  basePath: '/admin',

  plugins: [structureTool()], // Atualizado aqui também

  schema: {
    types: schemaTypes,
  },
})
