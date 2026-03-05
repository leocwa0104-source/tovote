(async () => {
  const { PrismaClient } = await import('@prisma/client')
  const fs = await import('node:fs')
  const path = await import('node:path')

  // Helper to load .env manually since we are in raw Node
  function loadEnv() {
    try {
      const envPath = path.resolve(__dirname, '.env')
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8')
        content.split('\n').forEach(line => {
          const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/)
          if (match) {
            const key = match[1]
            let value = match[2] || ''
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1)
            } else if (value.startsWith("'") && value.endsWith("'")) {
              value = value.slice(1, -1)
            }
            if (!process.env[key]) {
              process.env[key] = value
            }
          }
        })
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      console.warn('Warning: Failed to load .env manually:', errorMessage)
    }
  }

  loadEnv()

  // Modify DATABASE_URL to optimize for script execution
  let url = process.env.DATABASE_URL
  if (url) {
    const separator = url.includes('?') ? '&' : '?'
    // connection_limit=1: We only need one connection for this script
    // pool_timeout=30: Wait up to 30s for a connection (handling Neon cold starts)
    if (!url.includes('connection_limit')) {
      url += `${separator}connection_limit=1`
    }
    if (!url.includes('pool_timeout')) {
      url += `&pool_timeout=30`
    }
  } else {
    console.error('❌ Error: DATABASE_URL not found. Make sure .env file exists.')
    process.exit(1)
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  })

  async function main() {
    console.log('Starting database reset...')
    console.log('Using connection limit: 1, Timeout: 30s')

    try {
      // Truncate all tables with CASCADE
      await prisma.$executeRawUnsafe(`
        TRUNCATE TABLE 
          "User", 
          "Purchase", 
          "Topic", 
          "Faction", 
          "Transaction", 
          "Membership", 
          "Opinion", 
          "Citation", 
          "OpinionVote", 
          "VerificationToken" 
        RESTART IDENTITY CASCADE;
      `)
      console.log('✅ Database cleared successfully.')
    } catch (error) {
      console.error('❌ Failed to reset database:', error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  }

  await main()
})().catch((error) => {
  console.error('❌ Failed to run reset-db script:', error)
  process.exit(1)
})
