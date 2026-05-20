import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { testConnection } from './config/database';
import { runMigrations } from './database/migrate';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
      maxAge: 86400,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  if (config.env === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  app.set('trust proxy', 1);
  app.use('/api/', generalLimiter);
  app.use('/api/v1', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();
let initPromise: Promise<void> | null = null;

export async function ensureAppReady(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    await runMigrations();
    await testConnection();
  })().catch((error) => {
    initPromise = null;
    throw error;
  });

  return initPromise;
}

async function start(): Promise<void> {
  await ensureAppReady();

  const { port, host } = config.server;
  app.listen(port, host, () => {
    console.log('\n========================================');
    console.log('  CalcMaster API Server');
    console.log(`  Env      : ${config.env}`);
    console.log(`  Address  : http://${host}:${port}`);
    console.log(`  Health   : http://${host}:${port}/api/v1/health`);
    console.log(`  SQLite   : ${config.db.path}`);
    console.log(`  Redis    : ${config.redis.host}:${config.redis.port}`);
    console.log('========================================\n');
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  });
}

export default app;
