'use strict';
const path = require('path');
const { spawn } = require('child_process');

function buildArgs({ serial, pkg, title, landscape = false, width = 720, height = 1280, dpi = 320 }) {
  const w = landscape ? Math.max(width, height) : Math.min(width, height);
  const h = landscape ? Math.min(width, height) : Math.max(width, height);
  const args = [];
  if (serial) args.push('-s', serial);
  args.push(
    `--new-display=${w}x${h}/${dpi}`,
    `--start-app=${pkg}`,
    `--window-title=${title || pkg}`,
    '--no-vd-system-decorations',
    '--no-audio',
    '--video-codec=h264',
    '--max-fps=60',
  );
  return args;
}

class ScrcpyWindows {
  constructor({ log = () => {} } = {}) {
    this.log = log;
    this.procs = new Map();
  }

  isOpen(pkg) {
    return this.procs.has(pkg);
  }

  get count() {
    return this.procs.size;
  }

  open({ exe, adbPath, adbPort, onExit = () => {}, ...opts }) {
    if (this.procs.has(opts.pkg)) return this.procs.get(opts.pkg);
    const args = buildArgs(opts);
    const env = { ...process.env, ADB: adbPath, ANDROID_ADB_SERVER_PORT: String(adbPort) };
    const proc = spawn(exe, args, { cwd: path.dirname(exe), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const tail = [];
    const keep = (d) => {
      for (const line of String(d).split(/\r?\n/)) {
        if (!line.trim()) continue;
        tail.push(line);
        if (tail.length > 40) tail.shift();
        this.log(`scrcpy ${opts.pkg}: ${line}`);
      }
    };
    proc.stdout.on('data', keep);
    proc.stderr.on('data', keep);
    proc.tail = tail;
    this.procs.set(opts.pkg, proc);
    proc.on('exit', (code) => {
      if (this.procs.get(opts.pkg) === proc) this.procs.delete(opts.pkg);
      onExit(code, tail);
    });
    return proc;
  }

  waitReady(pkg, timeoutMs = 20000) {
    const proc = this.procs.get(pkg);
    if (!proc) return Promise.resolve(false);
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
      const timer = setTimeout(() => finish(!proc.killed && proc.exitCode === null), timeoutMs);
      const check = (d) => { if (/Texture|Starting app/i.test(String(d))) finish(true); };
      proc.stdout.on('data', check);
      proc.stderr.on('data', check);
      proc.on('exit', () => finish(false));
    });
  }

  close(pkg) {
    const proc = this.procs.get(pkg);
    if (!proc) return false;
    try { proc.kill(); } catch (_) { /* 已退出 */ }
    this.procs.delete(pkg);
    return true;
  }

  closeAll() {
    for (const pkg of [...this.procs.keys()]) this.close(pkg);
  }
}

module.exports = { ScrcpyWindows, buildArgs };
