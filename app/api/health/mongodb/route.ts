import { NextResponse } from 'next/server'
import { pingMongoDb } from '@/lib/mongodb/client'

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
    const code = error instanceof Error ? error.message : 'MONGODB_CONNECTION_ERROR'
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'MONGODB_UNAVAILABLE',
          message: 'Falha ao conectar no MongoDB Atlas.',
          details: [code],
        },
      },
      { status: 500 }
    )
  }
}
