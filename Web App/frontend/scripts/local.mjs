import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { loadEnv } from 'vite';

const frontendDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = resolve(frontendDir, '../VPS');
const backendEnv = loadEnv('development', backendDir, '');
const frontendEnv = loadEnv('development', frontendDir, '');
const apiKey = frontendEnv.BACKEND_API_KEY?.trim()
    || backendEnv.API_KEYS?.split(',').map(key => key.trim()).find(Boolean);
const development = process.argv.includes('--dev');
const port = process.env.FRONTEND_PORT || '5174';
const children = new Set();

function stop() {
    for (const child of children) child.kill();
}
process.on('exit', stop);
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

function start(command, args, cwd, env) {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit', windowsHide: true });
    children.add(child);
    child.on('error', () => {
        console.error('Unable to start a local service. Check the Python environment and installed dependencies.');
        process.exit(1);
    });
    child.on('exit', () => children.delete(child));
    return child;
}

async function backendReady() {
    try {
        const response = await fetch('http://127.0.0.1:8080/health', { signal: AbortSignal.timeout(1000) });
        return response.ok && (await response.json()).status === 'ok';
    } catch {
        return false;
    }
}

async function main() {
    if (!apiKey) throw new Error('Set API_KEYS in VPS/.env or BACKEND_API_KEY in frontend/.env.local before starting local services.');
    if (!development && !existsSync(resolve(frontendDir, 'dist/index.html'))) {
        throw new Error('Run npm run build before npm run local.');
    }

    if (!await backendReady()) {
        const python = resolve(backendDir, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
        if (!existsSync(python)) throw new Error('Create VPS/.venv and install VPS/requirements.txt first.');
        const csvPath = resolve(backendDir, 'data/Simulation_Data.csv');
        const cacheDir = resolve(backendDir, 'model_cache');
        if (!existsSync(csvPath) || !existsSync(cacheDir)) {
            throw new Error('The local simulation dataset and trained model_cache are required.');
        }
        console.log('Starting the local backend with the existing trained model...');
        const backend = start(python, ['-m', 'uvicorn', 'app.api.server:app', '--host', '127.0.0.1', '--port', '8080'], backendDir, {
            ...process.env, ...backendEnv,
            DEFAULT_CSV_PATH: csvPath,
            MODEL_CACHE_DIR: cacheDir,
        });
        const deadline = Date.now() + 45000;
        while (!await backendReady()) {
            if (backend.exitCode !== null || Date.now() >= deadline) {
                throw new Error('The backend did not become ready. Check the startup log and the existing model artifact.');
            }
            await delay(350);
        }
    }

    // Keep the key in the server process; it is never written into client assets.
    const vite = start(process.execPath, [resolve(frontendDir, 'node_modules/vite/bin/vite.js'),
        ...(development ? [] : ['preview']), '--host', '127.0.0.1', '--port', port, '--strictPort'], frontendDir, {
        ...process.env,
        BACKEND_API_KEY: apiKey,
    });
    vite.on('exit', code => process.exit(code ?? 1));
}

main().catch(error => {
    console.error(error.message);
    process.exit(1);
});
