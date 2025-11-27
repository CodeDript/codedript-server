const dotenv = require('dotenv');
const path = require('path');
const logger = require('../utils/logger');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Configuration object
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  server: {
    port: parseInt(process.env.PORT, 10) || 5000,
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
    apiVersion: process.env.API_VERSION || 'v1'
  },
  database: {
    uri: process.env.MONGODB_URI,
    name: process.env.DB_NAME || 'codedript'
  },
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',').map(s => s.trim()),
    credentials: true,
    optionsSuccessStatus: 200
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucketName: process.env.SUPABASE_BUCKET_NAME || 'Contracts'
  },
  pinata: {
    jwt: process.env.PINATA_JWT,
    gateway: process.env.PINATA_GATEWAY
  }
};

/**
 * Parse MongoDB host and port from URI
 */
function parseMongoHostPort(uri) {
  try {
    const withoutProto = uri.replace(/^mongodb(?:\+srv)?:\/\//, '');
    const parts = withoutProto.split('/')[0];
    const hostpart = parts.split('@').pop();
    const host = hostpart.split(',')[0];
    const [hostname, port] = host.split(':');
    return { hostname, port: port ? parseInt(port, 10) : 27017 };
  } catch (e) {
    return { hostname: 'localhost', port: 27017 };
  }
}

/**
 * Check MongoDB connection
 */
async function checkMongoConnection(timeout = 5000) {
  const uri = process.env.MONGODB_URI;
  if (!uri) return { ok: false, reason: 'MONGODB_URI missing' };

  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(uri, { 
      serverSelectionTimeoutMS: timeout,
      connectTimeoutMS: timeout,
      socketTimeoutMS: timeout
    });
    
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), timeout)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    await client.db().admin().ping();
    await client.close();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err && err.message ? err.message : String(err) };
  }
}

/**
 * Check Supabase connection
 */
async function checkSupabaseConnection(timeout = 5000) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return { ok: false, reason: 'SUPABASE_URL or SUPABASE_ANON_KEY missing' };

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(url, key);
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const listPromise = supabase.storage.listBuckets({ signal: controller.signal });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      );
      
      const { data, error } = await Promise.race([listPromise, timeoutPromise]);
      clearTimeout(id);
      if (error) return { ok: false, reason: error.message || String(error) };
      return { ok: true };
    } catch (e) {
      clearTimeout(id);
      return { ok: false, reason: e && e.message ? e.message : String(e) };
    }
  } catch (e) {
    return { ok: false, reason: e && e.message ? e.message : String(e) };
  }
}

/**
 * Get configuration
 */
function getConfig() {
  return {
    env: config.env,
    isDevelopment: config.env === 'development',
    isProduction: config.env === 'production',
    isTest: config.env === 'test',
    server: config.server,
    database: config.database,
    cors: config.cors,
    supabase: config.supabase,
    pinata: config.pinata
  };
}

/**
 * Print minimal startup information
 */
async function printStartupMinimal(opts = {}) {
  const c = getConfig();
  const base = opts.url || c.server.baseUrl || `http://localhost:${c.server.port}`;

  logger.info('[Server]');
  logger.info(`  • Port: ${c.server.port}`);
  logger.info(`  • Base URL: ${base}`);
  logger.info('');

  const mongo = await checkMongoConnection();
  const supa = await checkSupabaseConnection();

  logger.info('[Connections]');
  logger.info(`  • MongoDB: ${mongo.ok ? 'connected' : `not connected${mongo.reason ? ' (' + mongo.reason + ')' : ''}`}`);
  logger.info(`  • Supabase: ${supa.ok ? 'connected' : `not connected${supa.reason ? ' (' + supa.reason + ')' : ''}`}`);
  logger.info('');
}

module.exports = {
  getConfig,
  printStartupMinimal,
  checkMongoConnection,
  checkSupabaseConnection,
  config
};
