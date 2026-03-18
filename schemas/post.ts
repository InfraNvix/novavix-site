export default {
  name: 'post',
  title: 'Novidades (Blog)',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Título da Notícia',
      type: 'string',
    },
    {
      name: 'slug',
      title: 'Link Amigável (Slug)',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
    },
    {
      name: 'mainImage',
      title: 'Imagem de Capa',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'publishedAt',
      title: 'Data de Publicação',
      type: 'datetime',
    },
    {
      name: 'body',
      title: 'Conteúdo da Notícia',
      type: 'array',
      of: [{ type: 'block' }],
    },
  ],
}
