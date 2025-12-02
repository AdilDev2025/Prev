const { PrismaClient } = require('@prisma/client')

// Create a single instance of PrismaClient to be reused
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

module.exports = prisma

