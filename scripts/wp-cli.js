// Runs WP-CLI (`wp`), loading the PHP extensions it needs when the local PHP ships without a php.ini.
// Local by Flywheel's bundled php.exe has no php.ini, so `wp i18n` fails with "mbstring extension is required".
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REQUIRED = ['mbstring', 'openssl', 'curl'];

const sh = (cmd, args, options = {}) => spawnSync(cmd, args, { encoding: 'utf8', shell: true, ...options });

const phpLookup = sh('where', ['php']);
const phpExe = phpLookup.status === 0 ? phpLookup.stdout.split(/\r?\n/)[0].trim() : '';
const env = { ...process.env };

if (phpExe) {
	const loaded = (sh(`"${phpExe}"`, ['-m']).stdout || '').toLowerCase().split(/\r?\n/).map((line) => line.trim());
	const missing = REQUIRED.filter((ext) => !loaded.includes(ext));

	if (missing.length) {
		const extDir = path.join(path.dirname(phpExe), 'ext');
		const iniDir = path.join(os.tmpdir(), 'h5vp-wp-cli-php');
		fs.mkdirSync(iniDir, { recursive: true });
		const ini = [`extension_dir="${extDir}"`, ...REQUIRED.map((ext) => `extension=${ext}`), 'memory_limit=1G', ''].join('\n');
		fs.writeFileSync(path.join(iniDir, 'php.ini'), ini);
		env.PHPRC = iniDir;
	}
}

const result = spawnSync('wp', process.argv.slice(2), { stdio: 'inherit', shell: true, env });
process.exit(result.status === null ? 1 : result.status);
