#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const binDir = path.join(root, 'bin');

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) { }
}

ensureDir(binDir);

const targets = [
  { os: 'windows', arch: 'amd64', out: 'dot-windows.exe' },
  { os: 'linux', arch: 'amd64', out: 'dot-linux-amd64.bin' },
  { os: 'linux', arch: 'arm64', out: 'dot-linux-arm64.bin' },
  { os: 'darwin', arch: 'amd64', out: 'dot-macOS-amd64.bin' },
  { os: 'darwin', arch: 'arm64', out: 'dot-macOS-arm64.bin' },
];

function checkGo() {
  const r = spawnSync('go', ['version'], { stdio: 'pipe' });
  if (r.status !== 0) {
    console.error('Go 未安装或不可用。请安装 Go 并确保在 PATH 中。');
    process.exit(1);
  }
  console.log((r.stdout || '').toString().trim());
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(2)} ${units[i]}`;
}

function hasUpx() {
  const r = spawnSync('upx', ['--version'], { stdio: 'pipe' });
  return r.status === 0;
}

function compressWithUpx(filePath) {
  const res = spawnSync('upx', ['--best', '--lzma', filePath], { stdio: 'inherit' });
  return res.status === 0;
}

function buildTarget(target) {
  const env = { ...process.env, GOOS: target.os, GOARCH: target.arch, CGO_ENABLED: '0' };
  const outPath = path.join(binDir, target.out);
  const args = ['build', '-trimpath', '-buildvcs=false', '-ldflags=-s -w', '-o', outPath, './cmd/server'];

  console.log(`\n==> 构建 ${target.os}/${target.arch}`);
  const res = spawnSync('go', args, { cwd: root, env, stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`构建失败: ${target.os}/${target.arch}`);
    process.exit(res.status || 1);
  }
  const size = fs.statSync(outPath).size;
  console.log(`产物: ${path.relative(root, outPath)} (${formatBytes(size)})`);
  return outPath;
}

function main() {
  checkGo();
  const upxAvailable = hasUpx();
  if (upxAvailable) {
    console.log('检测到 UPX，构建后将进行压缩。');
  } else {
    console.log('未检测到 UPX，跳过压缩。');
  }
  const artifacts = [];
  for (const t of targets) {
    const out = buildTarget(t);
    if (upxAvailable) {
      const before = fs.statSync(out).size;
      const ok = compressWithUpx(out);
      if (ok) {
        const after = fs.statSync(out).size;
        console.log(`UPX 压缩完成: ${path.basename(out)} ${formatBytes(before)} → ${formatBytes(after)}`);
      } else {
        console.warn(`UPX 压缩失败，保留原文件: ${path.basename(out)}`);
      }
    }
    artifacts.push(out);
  }
  console.log('\n全部构建完成:');
  for (const a of artifacts) {
    console.log(`- ${path.relative(root, a)}`);
  }
}

main();
