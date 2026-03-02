import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  try {
    return new PrismaClient();
  } catch (e) {
    console.error('Failed to initialize Prisma Client:', e);
    // Return a proxy that throws a meaningful error when accessed
    // This prevents the application from crashing on startup if DB connection fails
    // or if environment variables are missing during build
    return new Proxy({} as PrismaClient, {
      get: (target, prop) => {
        // Allow basic object inspection to prevent crashes in debug tools
        if (prop === 'toJSON' || prop === 'toString' || prop === Symbol.toStringTag) {
          return () => 'PrismaClientProxy(Failed)';
        }
        if (prop === 'then') {
          return undefined; // Prevent treating as a Promise
        }
        
        throw new Error(`Prisma Client failed to initialize. Check server logs for details. Original error: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
