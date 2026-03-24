import { isUserRole, type UserRole } from '@/lib/auth/roles'

export const DEMO_MODE_ENABLED = true
export const DEMO_AUTH_COOKIE_NAME = 'novavix_demo_role'

export const DEMO_COMPANY_AUTH = {
  cnpj: '12345678000195',
  password: 'Demo@12345',
  email: 'empresa.demo@novavix.local',
  razaoSocial: 'Empresa Demo Novavix LTDA',
  nomeFantasia: 'Novavix Demo',
}

export const DEMO_ADMIN_AUTH = {
  email: 'admin.demo@novavix.local',
  password: 'Demo@12345',
  displayName: 'Administrador Demo',
}

export type DemoWhatsAppStatus = 'confirmado' | 'pendente' | 'falhou'

export type DemoEmployee = {
  id: string
  companyId: string
  nome: string
  cpf: string
  whatsapp: string
  email: string
  ativo: boolean
  whatsappStatus: DemoWhatsAppStatus
  tokenEnviadoEm: string | null
  tokenUsadoEm: string | null
  questionarioAcessadoEm: string | null
  questionarioRespondidoEm: string | null
}

export type DemoCompany = {
  id: string
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  status: 'active' | 'inactive'
}

export const DEMO_COMPANIES: DemoCompany[] = [
  {
    id: 'demo-company-1',
    cnpj: DEMO_COMPANY_AUTH.cnpj,
    razaoSocial: DEMO_COMPANY_AUTH.razaoSocial,
    nomeFantasia: DEMO_COMPANY_AUTH.nomeFantasia,
    status: 'active',
  },
  {
    id: 'demo-company-2',
    cnpj: '11222333000181',
    razaoSocial: 'Metalurgica Horizonte S.A.',
    nomeFantasia: 'Horizonte Metal',
    status: 'active',
  },
]

export const DEMO_EMPLOYEES: DemoEmployee[] = [
  {
    id: 'emp-001',
    companyId: 'demo-company-1',
    nome: 'Ana Souza',
    cpf: '12345678901',
    whatsapp: '27999110001',
    email: 'ana.souza@novavixdemo.com',
    ativo: true,
    whatsappStatus: 'confirmado',
    tokenEnviadoEm: '2026-03-21T10:30:00Z',
    tokenUsadoEm: '2026-03-21T12:10:00Z',
    questionarioAcessadoEm: '2026-03-21T12:11:00Z',
    questionarioRespondidoEm: '2026-03-21T12:18:00Z',
  },
  {
    id: 'emp-002',
    companyId: 'demo-company-1',
    nome: 'Carlos Lima',
    cpf: '32165498700',
    whatsapp: '27999110002',
    email: 'carlos.lima@novavixdemo.com',
    ativo: true,
    whatsappStatus: 'confirmado',
    tokenEnviadoEm: '2026-03-22T09:00:00Z',
    tokenUsadoEm: null,
    questionarioAcessadoEm: null,
    questionarioRespondidoEm: null,
  },
  {
    id: 'emp-003',
    companyId: 'demo-company-1',
    nome: 'Fernanda Rocha',
    cpf: '78912345678',
    whatsapp: '27999110003',
    email: 'fernanda.rocha@novavixdemo.com',
    ativo: true,
    whatsappStatus: 'pendente',
    tokenEnviadoEm: '2026-03-22T09:05:00Z',
    tokenUsadoEm: null,
    questionarioAcessadoEm: null,
    questionarioRespondidoEm: null,
  },
  {
    id: 'emp-004',
    companyId: 'demo-company-1',
    nome: 'Joao Pedro',
    cpf: '45678912345',
    whatsapp: '27999110004',
    email: 'joao.pedro@novavixdemo.com',
    ativo: false,
    whatsappStatus: 'confirmado',
    tokenEnviadoEm: '2026-03-20T14:20:00Z',
    tokenUsadoEm: '2026-03-20T15:00:00Z',
    questionarioAcessadoEm: '2026-03-20T15:02:00Z',
    questionarioRespondidoEm: null,
  },
  {
    id: 'emp-005',
    companyId: 'demo-company-1',
    nome: 'Marina Alves',
    cpf: '65432198701',
    whatsapp: '27999110005',
    email: 'marina.alves@novavixdemo.com',
    ativo: true,
    whatsappStatus: 'confirmado',
    tokenEnviadoEm: '2026-03-23T11:45:00Z',
    tokenUsadoEm: '2026-03-23T12:22:00Z',
    questionarioAcessadoEm: '2026-03-23T12:23:00Z',
    questionarioRespondidoEm: '2026-03-23T12:40:00Z',
  },
  {
    id: 'emp-006',
    companyId: 'demo-company-1',
    nome: 'Rafael Martins',
    cpf: '95175385246',
    whatsapp: '27999110006',
    email: 'rafael.martins@novavixdemo.com',
    ativo: true,
    whatsappStatus: 'falhou',
    tokenEnviadoEm: null,
    tokenUsadoEm: null,
    questionarioAcessadoEm: null,
    questionarioRespondidoEm: null,
  },
  {
    id: 'emp-007',
    companyId: 'demo-company-2',
    nome: 'Bianca Costa',
    cpf: '14725836900',
    whatsapp: '31988120001',
    email: 'bianca.costa@horizonte.com',
    ativo: true,
    whatsappStatus: 'confirmado',
    tokenEnviadoEm: '2026-03-21T08:00:00Z',
    tokenUsadoEm: '2026-03-21T08:44:00Z',
    questionarioAcessadoEm: '2026-03-21T08:45:00Z',
    questionarioRespondidoEm: '2026-03-21T09:01:00Z',
  },
  {
    id: 'emp-008',
    companyId: 'demo-company-2',
    nome: 'Diego Nunes',
    cpf: '36925814725',
    whatsapp: '31988120002',
    email: 'diego.nunes@horizonte.com',
    ativo: true,
    whatsappStatus: 'pendente',
    tokenEnviadoEm: '2026-03-23T13:00:00Z',
    tokenUsadoEm: null,
    questionarioAcessadoEm: null,
    questionarioRespondidoEm: null,
  },
  {
    id: 'emp-009',
    companyId: 'demo-company-2',
    nome: 'Elaine Prado',
    cpf: '25814736984',
    whatsapp: '31988120003',
    email: 'elaine.prado@horizonte.com',
    ativo: true,
    whatsappStatus: 'confirmado',
    tokenEnviadoEm: '2026-03-22T16:20:00Z',
    tokenUsadoEm: null,
    questionarioAcessadoEm: '2026-03-22T17:01:00Z',
    questionarioRespondidoEm: null,
  },
  {
    id: 'emp-010',
    companyId: 'demo-company-2',
    nome: 'Gustavo Vieira',
    cpf: '74185296310',
    whatsapp: '31988120004',
    email: 'gustavo.vieira@horizonte.com',
    ativo: false,
    whatsappStatus: 'confirmado',
    tokenEnviadoEm: '2026-03-19T10:10:00Z',
    tokenUsadoEm: '2026-03-19T11:00:00Z',
    questionarioAcessadoEm: '2026-03-19T11:05:00Z',
    questionarioRespondidoEm: '2026-03-19T11:30:00Z',
  },
  {
    id: 'emp-011',
    companyId: 'demo-company-2',
    nome: 'Isabela Moraes',
    cpf: '85296374105',
    whatsapp: '31988120005',
    email: 'isabela.moraes@horizonte.com',
    ativo: true,
    whatsappStatus: 'falhou',
    tokenEnviadoEm: null,
    tokenUsadoEm: null,
    questionarioAcessadoEm: null,
    questionarioRespondidoEm: null,
  },
  {
    id: 'emp-012',
    companyId: 'demo-company-2',
    nome: 'Leandro Gomes',
    cpf: '96374185201',
    whatsapp: '31988120006',
    email: 'leandro.gomes@horizonte.com',
    ativo: true,
    whatsappStatus: 'confirmado',
    tokenEnviadoEm: '2026-03-24T08:12:00Z',
    tokenUsadoEm: '2026-03-24T08:48:00Z',
    questionarioAcessadoEm: '2026-03-24T08:49:00Z',
    questionarioRespondidoEm: null,
  },
]

export function getDemoCompanyById(companyId: string): DemoCompany | null {
  return DEMO_COMPANIES.find((company) => company.id === companyId) ?? null
}

export function getDemoCompanyByCnpj(cnpj: string): DemoCompany | null {
  return DEMO_COMPANIES.find((company) => company.cnpj === cnpj) ?? null
}

export function getDemoEmployeesByCompanyId(companyId: string): DemoEmployee[] {
  return DEMO_EMPLOYEES.filter((employee) => employee.companyId === companyId)
}

export function getDemoRoleFromCookieValue(value: string | null | undefined): UserRole | null {
  return isUserRole(value) ? value : null
}

export function getDemoRoleFromCookieHeader(cookieHeader: string | null | undefined): UserRole | null {
  if (!cookieHeader) {
    return null
  }

  const chunks = cookieHeader.split(';')
  for (const chunk of chunks) {
    const [key, ...rest] = chunk.trim().split('=')
    if (key === DEMO_AUTH_COOKIE_NAME) {
      const rawValue = rest.join('=')
      return getDemoRoleFromCookieValue(rawValue || null)
    }
  }

  return null
}

export function buildDemoAuthCookie(role: UserRole): string {
  return `${DEMO_AUTH_COOKIE_NAME}=${role}; path=/; max-age=86400; samesite=lax`
}

export function buildDemoLogoutCookie(): string {
  return `${DEMO_AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`
}
