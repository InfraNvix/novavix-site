export default {
  name: 'landingPage',
  title: 'Página Inicial',
  type: 'document',
  fields: [
    {
      name: 'tituloHero',
      title: 'Título Principal',
      type: 'string',
      description: 'Ex: Segurança do Trabalho Digital e Eficiente'
    },
    {
      name: 'subtituloHero',
      title: 'Subtítulo/Descrição',
      type: 'text',
      description: 'O texto que explica sua atuação nacional.'
    },
    {
      name: 'servicos',
      title: 'Nossos Serviços',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'titulo', title: 'Título do Serviço', type: 'string' },
            { name: 'descricao', title: 'Descrição do Serviço', type: 'text' }
          ]
        }
      ]
    }
  ]
}
