const dotenv = require('dotenv');
const path = require('path');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Minimal config used for status printing
const config = {
	env: process.env.NODE_ENV || 'development',
	server: {
		port: parseInt(process.env.PORT, 10) || 5000,
		baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
		apiVersion: process.env.API_VERSION || 'v1'
	},
	features: {
		enableBlockchain: process.env.ENABLE_BLOCKCHAIN === 'true',
		enableEmail: process.env.ENABLE_EMAIL === 'true',
		enableFileUpload: process.env.ENABLE_FILE_UPLOAD === 'true',
		enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true'
	}
};

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

async function checkMongoConnection(timeout = 3000) {
	const uri = process.env.MONGODB_URI;
	if (!uri) return { ok: false, reason: 'MONGODB_URI missing' };

	try {
		const { MongoClient } = require('mongodb');
		const client = new MongoClient(uri, { serverSelectionTimeoutMS: timeout });
		await client.connect();
		await client.db().admin().ping();
		await client.close();
		return { ok: true };
	} catch (err) {
		try {
			const net = require('net');
			const { hostname, port } = parseMongoHostPort(uri);
			return await new Promise(resolve => {
				const socket = net.connect({ host: hostname, port, timeout }, () => {
					socket.end();
					resolve({ ok: true });
				});
				socket.on('error', e => resolve({ ok: false, reason: e.message }));
				socket.on('timeout', () => { socket.destroy(); resolve({ ok: false, reason: 'timeout' }); });
			});
		} catch (e) {
			return { ok: false, reason: err && err.message ? err.message : String(err) };
		}
	}
}

async function checkSupabaseConnection(timeout = 3000) {
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_ANON_KEY;
	if (!url || !key) return { ok: false, reason: 'SUPABASE_URL or SUPABASE_ANON_KEY missing' };

	try {
		const { createClient } = require('@supabase/supabase-js');
		const supabase = createClient(url, key);
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), timeout);
		try {
			const { data, error } = await supabase.storage.listBuckets({ signal: controller.signal });
			clearTimeout(id);
			if (error) return { ok: false, reason: error.message || String(error) };
			return { ok: true };
		} catch (e) {
			clearTimeout(id);
			return { ok: false, reason: e && e.message ? e.message : String(e) };
		}
	} catch (e) {
		try {
			const nodeUrl = require('url');
			const https = require('https');
			const parsed = nodeUrl.parse(url);
			const options = {
				method: 'HEAD',
				hostname: parsed.hostname,
				port: parsed.port || 443,
				path: '/',
				timeout
			};
			return await new Promise(resolve => {
				const req = https.request(options, res => resolve({ ok: res.statusCode >= 200 && res.statusCode < 400 }));
				req.on('error', err => resolve({ ok: false, reason: err.message }));
				req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'timeout' }); });
				req.end();
			});
		} catch (err) {
			return { ok: false, reason: err && err.message ? err.message : String(err) };
		}
	}
}

function getConfig() {
	return {
		env: config.env,
		isDevelopment: config.env === 'development',
		isProduction: config.env === 'production',
		isTest: config.env === 'test',
		server: {
			port: config.server.port,
			host: process.env.HOST || 'localhost',
			apiVersion: config.server.apiVersion,
			baseUrl: config.server.baseUrl
		},
		database: {
			uri: process.env.MONGODB_URI,
			name: process.env.DB_NAME || 'codedript'
		},
		jwt: {
			secret: process.env.JWT_SECRET,
			expiresIn: process.env.JWT_EXPIRES_IN || '7d'
		},
		cors: {
			origin: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',').map(s => s.trim()),
			credentials: true,
			optionsSuccessStatus: 200
		},
		features: config.features,
		rateLimit: {
			windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
			max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
		},
		upload: {
			maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 50 * 1024 * 1024,
			allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'application/pdf,image/jpeg,image/png,image/gif').split(',').map(s => s.trim())
		},
		pinata: {
			jwt: process.env.PINATA_JWT,
			gateway: process.env.PINATA_GATEWAY
		}
	};
}

function printConfig() {
	const c = getConfig();
	const ok = v => (v ? '✅' : '❌');

	console.log('[Environment]');
	console.log(`  • Mode: ${c.env}`);
	console.log(`  • API Version: ${c.server.apiVersion}`);
	console.log();
	console.log('[Server]');
	console.log(`  • Port: ${c.server.port}`);
	console.log(`  • Base URL: ${c.server.baseUrl}`);
	console.log();
	console.log('all of the features');
	console.log('[Features]');
	console.log(`• Blockchain: ${c.features.enableBlockchain ? '✅' : '❌'}`);
	console.log(`• Email: ${c.features.enableEmail ? '✅' : '❌'}`);
	console.log(`• File Upload: ${c.features.enableFileUpload ? '✅' : '❌'}`);
	console.log(`• Rate Limiting: ${c.features.enableRateLimiting ? '✅' : '❌'}`);
	console.log('');
}

async function printStatus() {
	console.log('[Environment]');
	console.log(`  • Mode: ${config.env}`);
	console.log(`  • API Version: ${config.server.apiVersion}`);
	console.log();
	console.log('[Server]');
	console.log(`  • Port: ${config.server.port}`);
	console.log(`  • Base URL: ${config.server.baseUrl}`);
	console.log();
	console.log('all of the features');
	console.log('[Features]');
	console.log(`• Blockchain: ${config.features.enableBlockchain ? '✅' : '❌'}`);
	console.log(`• Email: ${config.features.enableEmail ? '✅' : '❌'}`);
	console.log(`• File Upload: ${config.features.enableFileUpload ? '✅' : '❌'}`);
	console.log(`• Rate Limiting: ${config.features.enableRateLimiting ? '✅' : '❌'}`);
	console.log();

	const mongo = await checkMongoConnection();
	const supa = await checkSupabaseConnection();

	console.log('[Connections]');
	console.log(`  • MongoDB: ${mongo.ok ? '✅ connected' : `❌ not connected${mongo.reason ? ' (' + mongo.reason + ')' : ''}`}`);
	console.log(`  • Supabase: ${supa.ok ? '✅ connected' : `❌ not connected${supa.reason ? ' (' + supa.reason + ')' : ''}`}`);
	console.log('');
}

const environmentConfig = {
	getConfig,
	printConfig,
	printStatus,
	checkMongoConnection,
	checkSupabaseConnection,
	config
};

// Do NOT auto-run status checks on require anymore. Call explicitly from server startup.

/**
 * Print only the minimal startup info the server needs:
 *
 * [Server]
 *   • Port: 5000
 *   • Base URL: http://localhost:5000
 *
 * [Connections]
 *   • MongoDB: ✅ connected
 *   • Supabase: ❌ not connected
 */
async function printStartupMinimal(opts = {}) {
	const c = getConfig();
	const base = opts.url || c.server.baseUrl || `http://localhost:${c.server.port}`;

	// Print only the requested blocks
	console.log('[Server]');
	console.log(`  • Port: ${c.server.port}`);
	console.log(`  • Base URL: ${base}`);
	console.log();

	const mongo = await checkMongoConnection();
	const supa = await checkSupabaseConnection();

	console.log('[Connections]');
	console.log(`  • MongoDB: ${mongo.ok ? '✅ connected' : `❌ not connected${mongo.reason ? ' (' + mongo.reason + ')' : ''}`}`);
	console.log(`  • Supabase: ${supa.ok ? '✅ connected' : `❌ not connected${supa.reason ? ' (' + supa.reason + ')' : ''}`}`);
	console.log('');
}

module.exports = {
	getConfig,
	printConfig,
	printStatus,
	printStartupMinimal,
	checkMongoConnection,
	checkSupabaseConnection,
	config
};

