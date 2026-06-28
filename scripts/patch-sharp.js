/**
 * patch-sharp.js — run as postinstall script
 * Patches @img/sharp-linux-x64 and @img/sharp-linuxmusl-x64 by creating
 * symlinks that esm 3.2.25 can resolve (it doesn't support package exports).
 * Also strips node: prefix from sharp lib files (esm 3.2.25 doesn't
 * recognise the node: URL scheme for built-in modules).
 *
 * Safe to run multiple times (idempotent).
 */

const fs   = require('fs');
const path = require('path');

const nmRoot = path.join(__dirname, '..', 'node_modules');

// 1. Create sharp.node symlinks in @img/sharp-*-x64 packages
['@img/sharp-linux-x64', '@img/sharp-linuxmusl-x64'].forEach(function(pkg) {
  var pkgDir   = path.join(nmRoot, pkg);
  var libFile  = path.join(pkgDir, 'lib', pkg.split('/')[1] + '.node');
  var linkPath = path.join(pkgDir, 'sharp.node');

  if (!fs.existsSync(pkgDir)) { return; }
  if (!fs.existsSync(libFile)) { return; }
  if (fs.existsSync(linkPath)) { return; }   // already patched

  try {
    fs.symlinkSync(path.join('lib', pkg.split('/')[1] + '.node'), linkPath);
    console.log('[patch-sharp] symlink created:', linkPath);
  } catch (e) {
    console.warn('[patch-sharp] symlink failed (may already exist):', e.message);
  }
});

// 2. Strip node: prefix from sharp lib files so esm 3.2.25 can require them
var sharpLibDir = path.join(nmRoot, 'sharp', 'lib');
if (fs.existsSync(sharpLibDir)) {
  var files = fs.readdirSync(sharpLibDir).filter(function(f) { return f.endsWith('.js'); });
  files.forEach(function(file) {
    var filePath = path.join(sharpLibDir, file);
    var content  = fs.readFileSync(filePath, 'utf8');
    if (content.indexOf("'node:") === -1 && content.indexOf('"node:') === -1) { return; }
    var patched = content.replace(/require\('node:([^']+)'\)/g, "require('$1')");
    patched = patched.replace(/require\("node:([^"]+)"\)/g, 'require("$1")');
    fs.writeFileSync(filePath, patched, 'utf8');
    console.log('[patch-sharp] stripped node: prefix from', file);
  });
}

console.log('[patch-sharp] done');
