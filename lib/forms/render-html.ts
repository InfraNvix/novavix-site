import type { FormFieldSchema, FormTemplateSchema } from '@/lib/forms/parser'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function inputType(field: FormFieldSchema): string {
  if (field.type === 'number') return 'number'
  if (field.type === 'date') return 'date'
  return 'text'
}

function renderField(field: FormFieldSchema): string {
  const label = escapeHtml(field.label)
  const required = field.required ? 'required' : ''
  const name = escapeHtml(field.key)

  if (field.type === 'select') {
    const options = (field.options ?? [])
      .map((opt) => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`)
      .join('')
    return `
      <div class="field">
        <label>
          <span>${label}${field.required ? ' *' : ''}</span>
          <select name="${name}" ${required}>
            <option value="">Selecione</option>
            ${options}
          </select>
        </label>
      </div>
    `
  }

  if (field.type === 'boolean') {
    return `
      <div class="field">
        <label class="checkbox">
          <input type="checkbox" name="${name}" />
          <span>${label}${field.required ? ' *' : ''}</span>
        </label>
      </div>
    `
  }

  return `
    <div class="field">
      <label>
        <span>${label}${field.required ? ' *' : ''}</span>
        <input type="${inputType(field)}" name="${name}" ${required} />
      </label>
    </div>
  `
}

export function renderTemplateHtml(schema: FormTemplateSchema, templateName: string): string {
  const title = escapeHtml(templateName || schema.title || 'Formulario')
  const fields = schema.fields.map(renderField).join('\n')

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        font-family: "Inter", "Segoe UI", sans-serif;
        background: #f8fafc;
        margin: 0;
        padding: 32px;
        color: #0f172a;
      }
      .card {
        max-width: 720px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      }
      h1 {
        margin: 0 0 8px;
        font-size: 24px;
      }
      p.subtitle {
        margin: 0 0 24px;
        color: #475569;
        font-size: 14px;
      }
      form {
        display: grid;
        gap: 16px;
      }
      .field label {
        display: grid;
        gap: 8px;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #475569;
      }
      .field input,
      .field select {
        font-size: 14px;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        text-transform: none;
        letter-spacing: normal;
      }
      button {
        padding: 12px 16px;
        border-radius: 10px;
        border: none;
        background: #1d4ed8;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>${title}</h1>
      <form>
        ${fields}
        <button type="submit">Enviar</button>
      </form>
    </main>
  </body>
</html>`
}
