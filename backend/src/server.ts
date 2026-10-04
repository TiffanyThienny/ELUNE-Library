import { createApp } from './app';
import { ENV } from './config/env';
import { prisma } from './config/prisma';

const app = createApp();

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('Successfully connected to PostgreSQL database (elune on port 5433).');

    const server = app.listen(ENV.PORT, () => {
      console.log(`
  🌙 Elunè Backend API is running!
  -----------------------------------------------
  • Local Server:      http://localhost:${ENV.PORT}
  • Health Check:      http://localhost:${ENV.PORT}/api/health
  • Environment:       ${ENV.NODE_ENV}
  • Frontend Origin:   ${ENV.FRONTEND_URL}
  -----------------------------------------------
      `);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nGracefully shutting down Elunè server...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database connection closed. Goodbye.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Failed to start Elunè server:', error);
    process.exit(1);
  }
}

startServer();
