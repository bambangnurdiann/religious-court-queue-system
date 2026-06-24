import { db } from '@/lib/db'

export async function GET() {
  try {
    // Test database connection
    const result = await db.query.user.findFirst()
    
    return Response.json({
      status: 'ok',
      database: 'connected',
      message: 'Database connection successful',
    })
  } catch (error) {
    console.error('[v0] Database error:', error)
    return Response.json(
      {
        status: 'error',
        database: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        env: {
          hasDatabase: !!process.env.DATABASE_URL,
          hasSecret: !!process.env.BETTER_AUTH_SECRET,
        },
      },
      { status: 500 }
    )
  }
}
