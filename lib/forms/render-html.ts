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

  if (field.type === 'section') {
    return `
      <div class="section">
        <h2>${label}</h2>
      </div>
    `
  }

  if (field.type === 'select') {
    const options = (field.options ?? [])
      .map((opt) => {
        const safe = escapeHtml(opt)
        return `<label class="radio-pill">
          <input type="radio" name="${name}" value="${safe}" ${required} />
          <span>${safe}</span>
        </label>`
      })
      .join('\n')
    return `
      <div class="field">
        <label>
          <span>${label}${field.required ? ' *' : ''}</span>
          <div class="radio-group pills">
            ${options}
          </div>
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
      .radio-group {
        display: grid;
        gap: 8px;
      }
      .radio-group.pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .radio-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #0f172a;
      }
      .radio-pill input {
        width: 12px;
        height: 12px;
      }
      @media (max-width: 640px) {
        .radio-group.pills {
          flex-direction: column;
          align-items: stretch;
        }
        .radio-pill {
          width: 100%;
          justify-content: flex-start;
        }
      }
      .section h2 {
        margin: 8px 0 0;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #64748b;
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
