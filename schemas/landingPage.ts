export default {
  name: 'landingPage',
  title: 'Pagina Inicial',
  type: 'document',
  fields: [
    {
      name: 'tituloHero',
      title: 'Titulo Principal',
      type: 'string',
      description: 'Ex: Seguranca do Trabalho Digital e Eficiente',
    },
    {
      name: 'subtituloHero',
      title: 'Subtitulo/Descricao',
      type: 'text',
      description: 'Texto de apoio da pagina inicial.',
    },
    {
      name: 'servicos',
      title: 'Nossos Servicos',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'titulo', title: 'Titulo do Servico', type: 'string' },
            { name: 'descricao', title: 'Descricao do Servico', type: 'text' },
          ],
        },
      ],
    },
  ],
}
