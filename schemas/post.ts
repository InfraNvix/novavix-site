export default {
  name: 'post',
  title: 'Novidades (Blog)',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Titulo da Noticia',
      type: 'string',
    },
    {
      name: 'slug',
      title: 'Link Amigavel (Slug)',
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
      title: 'Data de Publicacao',
      type: 'datetime',
    },
    {
      name: 'body',
      title: 'Conteudo da Noticia',
      type: 'array',
      of: [{ type: 'block' }],
    },
  ],
}
