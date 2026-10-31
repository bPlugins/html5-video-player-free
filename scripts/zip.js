// Builds zip/html5-video-player.zip with the plugin inside an `html5-video-player/` root folder, so an upload
// always installs into wp-content/plugins/html5-video-player (Plugin Check matches the text domain to that
// folder name). Uses the tar.exe that ships with Windows 10+.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SLUG = 'html5-video-player';
const ZIP = path.resolve(__dirname, '..', 'zip', 'html5-video-player.zip');
const INCLUDE = ['admin', 'build', 'img', 'inc', 'public', 'languages', 'tinymce', 'vendor', 'blocks.php', 'elementor-widget.php', 'html5-video-player.php', 'readme.txt', 'includes.php', 'uninstall.php', 'composer.json'];
const EXCLUDE = ['*.log', '__MACOSX', '.DS_Store', '.git', '.github'];

const root = path.resolve(__dirname, '..');
if (path.basename(root) !== SLUG) {
	console.error(`The plugin folder must be named "${SLUG}" (found "${path.basename(root)}"): it becomes the root folder inside the zip.`);
	process.exit(1);
}

const missing = INCLUDE.filter((item) => !fs.existsSync(path.join(root, item)));
if (missing.length) {
	console.error(`Cannot build the zip, missing: ${missing.join(', ')}. Run the build first.`);
	process.exit(1);
}

fs.mkdirSync(path.dirname(ZIP), { recursive: true });
fs.rmSync(ZIP, { force: true });

const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
const args = ['-a', '-c', '-f', ZIP, ...EXCLUDE.map((pattern) => `--exclude=${pattern}`), '-C', path.dirname(root), ...INCLUDE.map((item) => `${SLUG}/${item}`)];
const result = spawnSync(tar, args, { stdio: 'inherit' });

if (result.status !== 0) {
	console.error('Creating the zip failed.');
	process.exit(result.status || 1);
}

console.log(`Created ${path.relative(root, ZIP)} (${(fs.statSync(ZIP).size / 1048576).toFixed(1)} MB)`);
