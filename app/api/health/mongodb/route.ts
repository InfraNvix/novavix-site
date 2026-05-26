import { NextResponse } from 'next/server'
import { pingMongoDb } from '@/lib/mongodb/client'
import { getPublicErrorDetails, sanitizeErrorMessage } from '@/lib/security/safe-error'

export async function GET(): Promise<NextResponse> {
  try {
    const result = await pingMongoDb()
    return NextResponse.json(
      {
        ok: true,
        data: {
          status: 'connected',
          dbName: result.dbName,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const code = sanitizeErrorMessage(error, 'MONGODB_CONNECTION_ERROR')
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'MONGODB_UNAVAILABLE',
          message: 'Falha ao conectar no MongoDB Atlas.',
          details: getPublicErrorDetails(code),
        },
      },
      { status: 500 }
    )
  }
}
