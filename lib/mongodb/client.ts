import { MongoClient, type Db } from 'mongodb'

const defaultDbName = process.env.MONGODB_DB_NAME ?? 'novavix'

type MongoGlobal = typeof globalThis & {
  __novavixMongoClient?: MongoClient
}

const mongoGlobal = globalThis as MongoGlobal

function getMongoClient(): MongoClient {
  if (mongoGlobal.__novavixMongoClient) {
    return mongoGlobal.__novavixMongoClient
  }

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('Missing required environment variable: MONGODB_URI')
  }

  const client = new MongoClient(uri, {
    appName: 'novavix-site',
  })

  mongoGlobal.__novavixMongoClient = client
  return client
}

export async function getMongoDb(dbName = defaultDbName): Promise<Db> {
  const client = getMongoClient()
  await client.connect()
  return client.db(dbName)
}

export async function pingMongoDb(dbName = defaultDbName): Promise<{ ok: boolean; dbName: string }> {
  const db = await getMongoDb(dbName)
  const result = await db.command({ ping: 1 })
  return {
    ok: Number(result.ok) === 1,
    dbName: db.databaseName,
  }
}
