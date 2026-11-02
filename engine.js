/* Three Squares — puzzle engine.
   Generators + logic solvers for Stars, Duo and Thread.
   Works in the browser (window.TS) and in Node (module.exports). */
(function (root) {
  'use strict';

  // ---------- RNG ----------
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function shuffle(a, r) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const LETTERS = 'abcdefghijklmnop';

  // =====================================================================
  // STARS — one star per row, column and region; stars never touch.
  // =====================================================================
  function starsPlace(n, r) {
    const cols = new Array(n), used = new Array(n).fill(false);
    (function bt(row) {
      if (row === n) return true;
      for (const c of shuffle(range(n), r)) {
        if (used[c] || (row > 0 && Math.abs(cols[row - 1] - c) <= 1)) continue;
        cols[row] = c; used[c] = true;
        if (bt(row + 1)) return true;
        used[c] = false;
      }
      return false;
    })(0);
    return cols;
  }

  function starsGrow(n, cols, r) {
    const N = n * n, reg = new Array(N).fill(-1);
    for (let i = 0; i < n; i++) reg[i * n + cols[i]] = i;
    // per-region growth weight -> varied region sizes
    const w = range(n).map(() => 0.3 + r() * 1.7);
    let left = N - n;
    while (left > 0) {
      const cand = [], cw = [];
      let tot = 0;
      for (let i = 0; i < N; i++) {
        if (reg[i] < 0) continue;
        const y = (i / n) | 0, x = i % n;
        const nb = [[y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]];
        for (const [yy, xx] of nb) {
          if (yy < 0 || xx < 0 || yy >= n || xx >= n) continue;
          const j = yy * n + xx;
          if (reg[j] < 0) { cand.push([j, reg[i]]); tot += w[reg[i]]; cw.push(tot); }
        }
      }
      let pick = r() * tot, k = 0;
      while (cw[k] < pick) k++;
      reg[cand[k][0]] = cand[k][1];
      left--;
    }
    return reg;
  }

  function starsCount(n, reg, limit) {
    limit = limit || 2;
    let count = 0;
    const colU = new Array(n).fill(false), regU = new Array(n).fill(false);
    (function bt(row, prev) {
      if (row === n) { count++; return count >= limit; }
      for (let c = 0; c < n; c++) {
        if (colU[c] || (prev >= 0 && Math.abs(prev - c) <= 1)) continue;
        const g = reg[row * n + c];
        if (regU[g]) continue;
        colU[c] = regU[g] = true;
        if (bt(row + 1, c)) return true;
        colU[c] = regU[g] = false;
      }
      return false;
    })(0, -1);
    return count;
  }

  // Logic solver. Returns {grid, look} or null if logic gets stuck.
  function starsLogic(n, reg) {
    const N = n * n, units = [];
    for (let y = 0; y < n; y++) units.push(range(n).map((x) => y * n + x));
    for (let x = 0; x < n; x++) units.push(range(n).map((y) => y * n + x));
    const regs = range(n).map(() => []);
    for (let i = 0; i < N; i++) regs[reg[i]].push(i);
    units.push(...regs);

    function place(s, i) {
      s[i] = 1;
      const y = (i / n) | 0, x = i % n, g = reg[i];
      for (let k = 0; k < N; k++) {
        if (k === i) continue;
        const yy = (k / n) | 0, xx = k % n;
        if (yy === y || xx === x || reg[k] === g || (Math.abs(yy - y) <= 1 && Math.abs(xx - x) <= 1)) {
          if (s[k] === 1) return false;
          s[k] = 2;
        }
      }
      return true;
    }
    function basic(s) {
      let changed = true;
      while (changed) {
        changed = false;
        for (const u of units) {
          let stars = 0; const cand = [];
          for (const i of u) { if (s[i] === 1) stars++; else if (s[i] === 0) cand.push(i); }
          if (stars > 1) return false;
          if (stars === 1) continue;
          if (cand.length === 0) return false;
          if (cand.length === 1) { if (!place(s, cand[0])) return false; changed = true; continue; }
          const y0 = (cand[0] / n) | 0, x0 = cand[0] % n, g0 = reg[cand[0]];
          if (cand.every((i) => ((i / n) | 0) === y0)) {
            for (let x = 0; x < n; x++) { const k = y0 * n + x; if (s[k] === 0 && u.indexOf(k) < 0) { s[k] = 2; changed = true; } }
          }
          if (cand.every((i) => i % n === x0)) {
            for (let y = 0; y < n; y++) { const k = y * n + x0; if (s[k] === 0 && u.indexOf(k) < 0) { s[k] = 2; changed = true; } }
          }
          if (cand.every((i) => reg[i] === g0)) {
            for (const k of regs[g0]) if (s[k] === 0 && u.indexOf(k) < 0) { s[k] = 2; changed = true; }
          }
          // a cell that would wipe out every candidate of this unit can't be a star
          for (let k = 0; k < N; k++) {
            if (s[k] !== 0 || u.indexOf(k) >= 0) continue;
            const ky = (k / n) | 0, kx = k % n, kg = reg[k];
            let kills = true;
            for (const c of cand) {
              const cy = (c / n) | 0, cx = c % n;
              if (!(cy === ky || cx === kx || reg[c] === kg || (Math.abs(cy - ky) <= 1 && Math.abs(cx - kx) <= 1))) { kills = false; break; }
            }
            if (kills) { s[k] = 2; changed = true; }
          }
        }
      }
      return true;
    }
    const s = new Uint8Array(N);
    let look = 0;
    if (!basic(s)) return null;
    for (;;) {
      let stars = 0;
      for (let i = 0; i < N; i++) if (s[i] === 1) stars++;
      if (stars === n) return { grid: s, look };
      let progress = false;
      for (let i = 0; i < N && !progress; i++) {
        if (s[i] !== 0) continue;
        const t = s.slice();
        if (!place(t, i) || !basic(t)) { s[i] = 2; look++; progress = true; if (!basic(s)) return null; }
      }
      if (!progress) return null;
    }
  }

  function genStars(n, r, opts) {
    opts = opts || {};
    const minLook = opts.minLook || 0, maxLook = opts.maxLook == null ? 99 : opts.maxLook;
    for (let tries = 0; tries < 4000; tries++) {
      const cols = starsPlace(n, r);
      const reg = starsGrow(n, cols, r);
      const sol = starsLogic(n, reg);
      if (!sol) continue;
      if (sol.look < minLook || sol.look > maxLook) continue;
      if (starsCount(n, reg, 2) !== 1) continue;
      return { n, r: reg.map((g) => LETTERS[g]).join(''), look: sol.look, tries };
    }
    return null;
  }

  // Validate a player's board. stars: Set/array of cell indices. Returns {ok, bad:Set}
  function checkStars(p, stars) {
    const n = p.n, reg = p.r, bad = new Set();
    const arr = Array.from(stars);
    for (let a = 0; a < arr.length; a++) for (let b = a + 1; b < arr.length; b++) {
      const i = arr[a], j = arr[b];
      const yi = (i / n) | 0, xi = i % n, yj = (j / n) | 0, xj = j % n;
      if (yi === yj || xi === xj || reg[i] === reg[j] || (Math.abs(yi - yj) <= 1 && Math.abs(xi - xj) <= 1)) { bad.add(i); bad.add(j); }
    }
    return { ok: arr.length === n && bad.size === 0, bad };
  }

  // =====================================================================
  // DUO — fill 6x6 with A/B: 3 of each per row & column, never three in a
  // row, '=' joins equal neighbours, 'x' joins opposite neighbours.
  // =====================================================================
  const DN = 6;
  function duoLines() {
    const lines = [];
    for (let y = 0; y < DN; y++) lines.push(range(DN).map((x) => y * DN + x));
    for (let x = 0; x < DN; x++) lines.push(range(DN).map((y) => y * DN + x));
    return lines;
  }
  const DLINES = duoLines();

  function duoSolution(r) {
    const g = new Array(DN * DN).fill(0);
    function okAt(i) {
      const y = (i / DN) | 0, x = i % DN;
      for (const line of [DLINES[y], DLINES[DN + x]]) {
        let a = 0, b = 0;
        for (const k of line) { if (g[k] === 1) a++; else if (g[k] === 2) b++; }
        if (a > DN / 2 || b > DN / 2) return false;
        for (let t = 0; t + 2 < DN; t++) {
          const v = g[line[t]];
          if (v && v === g[line[t + 1]] && v === g[line[t + 2]]) return false;
        }
      }
      return true;
    }
    (function bt(i) {
      if (i === DN * DN) return true;
      for (const v of shuffle([1, 2], r)) {
        g[i] = v;
        if (okAt(i) && bt(i + 1)) return true;
      }
      g[i] = 0;
      return false;
    })(0);
    return g;
  }

  // propagate; returns false on contradiction
  function duoPropagate(g, edges) {
    let changed = true;
    const set = (k, v) => { if (g[k] === 0) { g[k] = v; changed = true; return true; } return g[k] === v; };
    while (changed) {
      changed = false;
      for (const [a, b, t] of edges) {
        if (g[a] && g[b]) { if ((t === '=') !== (g[a] === g[b])) return false; }
        else if (g[a]) { if (!set(b, t === '=' ? g[a] : 3 - g[a])) return false; }
        else if (g[b]) { if (!set(a, t === '=' ? g[b] : 3 - g[b])) return false; }
      }
      for (const line of DLINES) {
        let a = 0, b = 0;
        for (const k of line) { if (g[k] === 1) a++; else if (g[k] === 2) b++; }
        if (a > 3 || b > 3) return false;
        if (a === 3 && b < 3) for (const k of line) if (!g[k]) { g[k] = 2; changed = true; }
        if (b === 3 && a < 3) for (const k of line) if (!g[k]) { g[k] = 1; changed = true; }
        for (let t = 0; t + 2 < DN; t++) {
          const p = g[line[t]], q = g[line[t + 1]], w = g[line[t + 2]];
          if (p && p === q && p === w) return false;
          if (p && p === q && !w) { g[line[t + 2]] = 3 - p; changed = true; }
          else if (q && q === w && !p) { g[line[t]] = 3 - q; changed = true; }
          else if (p && p === w && !q) { g[line[t + 1]] = 3 - p; changed = true; }
        }
      }
    }
    return true;
  }

  function duoLogic(givens, edges) {
    const g = givens.slice();
    let look = 0;
    if (!duoPropagate(g, edges)) return null;
    for (;;) {
      if (g.every((v) => v)) return { grid: g, look };
      let progress = false;
      for (let i = 0; i < g.length && !progress; i++) {
        if (g[i]) continue;
        for (const v of [1, 2]) {
          const t = g.slice(); t[i] = v;
          if (!duoPropagate(t, edges)) { g[i] = 3 - v; look++; progress = true; if (!duoPropagate(g, edges)) return null; break; }
        }
      }
      if (!progress) return null;
    }
  }

  function duoCount(givens, edges, limit) {
    let count = 0;
    (function bt(g) {
      if (count >= limit) return;
      if (!duoPropagate(g, edges)) return;
      const i = g.indexOf(0);
      if (i < 0) { count++; return; }
      for (const v of [1, 2]) { const t = g.slice(); t[i] = v; bt(t); if (count >= limit) return; }
    })(givens.slice());
    return count;
  }

  function genDuo(r, opts) {
    opts = opts || {};
    const targetGivens = opts.givens == null ? 6 : opts.givens;
    const targetEdges = opts.edges == null ? 6 : opts.edges;
    const minLook = opts.minLook || 0;
    for (let tries = 0; tries < 400; tries++) {
      const sol = duoSolution(r);
      const allEdges = [];
      for (let y = 0; y < DN; y++) for (let x = 0; x < DN; x++) {
        const i = y * DN + x;
        if (x + 1 < DN) allEdges.push([i, i + 1, sol[i] === sol[i + 1] ? '=' : 'x']);
        if (y + 1 < DN) allEdges.push([i, i + DN, sol[i] === sol[i + DN] ? '=' : 'x']);
      }
      let edges = shuffle(allEdges.slice(), r).slice(0, targetEdges + 6);
      let givens = sol.slice();
      // remove givens while still logically solvable
      for (const i of shuffle(range(DN * DN), r)) {
        if (givens.filter((v) => v).length <= targetGivens) break;
        const t = givens.slice(); t[i] = 0;
        if (duoLogic(t, edges)) givens = t;
      }
      // remove edges while still solvable
      for (const e of shuffle(edges.slice(), r)) {
        if (edges.length <= targetEdges) break;
        const t = edges.filter((x) => x !== e);
        if (duoLogic(givens, t)) edges = t;
      }
      const nG = givens.filter((v) => v).length;
      if (nG > targetGivens + 3 || edges.length > targetEdges + 3) continue;
      const res = duoLogic(givens, edges);
      const maxLook = opts.maxLook == null ? 99 : opts.maxLook;
      if (!res || res.look < minLook || res.look > maxLook) continue;
      if (duoCount(givens, edges, 2) !== 1) continue;
      return { g: givens.join(''), e: edges.map(([a, b, t]) => [a, b, t]), look: res.look, tries };
    }
    return null;
  }

  function checkDuo(p, grid) {
    // grid: array of 0/1/2. returns {ok, bad:Set, badEdges:Set(index)}
    const bad = new Set(), badEdges = new Set();
    DLINES.forEach((line) => {
      let a = 0, b = 0;
      for (const k of line) { if (grid[k] === 1) a++; else if (grid[k] === 2) b++; }
      if (a > 3) line.forEach((k) => grid[k] === 1 && bad.add(k));
      if (b > 3) line.forEach((k) => grid[k] === 2 && bad.add(k));
      for (let t = 0; t + 2 < DN; t++) {
        const v = grid[line[t]];
        if (v && v === grid[line[t + 1]] && v === grid[line[t + 2]]) { bad.add(line[t]); bad.add(line[t + 1]); bad.add(line[t + 2]); }
      }
    });
    p.e.forEach(([a, b, t], idx) => {
      if (grid[a] && grid[b] && ((t === '=') !== (grid[a] === grid[b]))) { badEdges.add(idx); bad.add(a); bad.add(b); }
    });
    const full = grid.every((v) => v);
    return { ok: full && bad.size === 0, bad, badEdges };
  }

  // =====================================================================
  // THREAD — one line through every cell, passing the numbers in order.
  // =====================================================================
  function nbrs(n) {
    const out = [];
    for (let i = 0; i < n * n; i++) {
      const y = (i / n) | 0, x = i % n, a = [];
      if (y > 0) a.push(i - n);
      if (y < n - 1) a.push(i + n);
      if (x > 0) a.push(i - 1);
      if (x < n - 1) a.push(i + 1);
      out.push(a);
    }
    return out;
  }

  function hamPath(n, r) {
    const NB = nbrs(n);
    let path = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) path.push(y * n + (y % 2 ? n - 1 - x : x));
    const iters = n * n * 60;
    for (let it = 0; it < iters; it++) {
      if (r() < 0.5) path.reverse();
      const L = path.length - 1, e = path[L], prev = path[L - 1];
      const opts = NB[e].filter((v) => v !== prev);
      const v = opts[Math.floor(r() * opts.length)];
      const j = path.indexOf(v);
      path = path.slice(0, j + 1).concat(path.slice(j + 1).reverse());
    }
    return path;
  }

  // count solutions (up to limit); returns {count, alt} where alt is a 2nd path
  function threadSolve(n, nums, limit, want) {
    const N = n * n, NB = nbrs(n);
    const order = new Int32Array(N).fill(-1);
    nums.forEach(([c, k]) => { order[c] = k; });
    const sorted = nums.slice().sort((a, b) => a[1] - b[1]);
    const start = sorted[0][0], end = sorted[sorted.length - 1][0], lastK = sorted[sorted.length - 1][1];
    const vis = new Uint8Array(N);
    const path = [start];
    vis[start] = 1;
    let count = 0, found = [];
    const seen = new Uint8Array(N), stack = new Int32Array(N);
    function ok(cur) {
      // connectivity of unvisited cells + dead-end check
      let unv = 0, first = -1;
      for (let i = 0; i < N; i++) if (!vis[i]) { unv++; if (first < 0) first = i; }
      if (unv === 0) return true;
      for (let i = 0; i < N; i++) {
        if (vis[i]) continue;
        let d = 0;
        for (const j of NB[i]) if (!vis[j] || j === cur) d++;
        if (d === 0) return false;
        if (d === 1 && i !== end) return false;
      }
      seen.fill(0);
      let sp = 0, reached = 0;
      // start flood from neighbours of cur
      for (const j of NB[cur]) if (!vis[j] && !seen[j]) { seen[j] = 1; stack[sp++] = j; }
      while (sp) {
        const c = stack[--sp]; reached++;
        for (const j of NB[c]) if (!vis[j] && !seen[j]) { seen[j] = 1; stack[sp++] = j; }
      }
      return reached === unv;
    }
    (function dfs(cur, nextK) {
      if (count >= limit) return;
      if (path.length === N) {
        if (cur === end) { count++; if (want) found.push(path.slice()); }
        return;
      }
      if (cur === end) return;
      for (const j of NB[cur]) {
        if (vis[j]) continue;
        const o = order[j];
        if (o >= 0 && o !== nextK) continue;
        if (o === lastK && path.length + 1 !== N) continue;
        vis[j] = 1; path.push(j);
        if (ok(j)) dfs(j, o >= 0 ? nextK + 1 : nextK);
        path.pop(); vis[j] = 0;
        if (count >= limit) return;
      }
    })(start, 2);
    return { count, paths: found };
  }

  function genThread(n, r, opts) {
    opts = opts || {};
    const startNums = opts.nums || 7;
    for (let tries = 0; tries < 60; tries++) {
      const path = hamPath(n, r);
      const L = path.length;
      // pick checkpoint indices
      const idx = new Set([0, L - 1]);
      const pool = shuffle(range(L - 2).map((i) => i + 1), r);
      for (const i of pool) { if (idx.size >= startNums) break; idx.add(i); }
      let sel = Array.from(idx).sort((a, b) => a - b);
      let guard = 0, okFlag = false;
      while (guard++ < 30) {
        const nums = sel.map((pi, k) => [path[pi], k + 1]);
        const res = threadSolve(n, nums, 2, true);
        if (res.count === 1) { okFlag = true; break; }
        if (res.count === 0) break; // shouldn't happen
        // find divergence between the true path and an alternative
        const alt = res.paths.find((p) => p.some((c, i) => c !== path[i]));
        if (!alt) { okFlag = true; break; }
        let d = 0; while (alt[d] === path[d]) d++;
        // pin path[d] and the true slot of alt[d]: the alternative visits them in the wrong order
        const tX = path.indexOf(alt[d]);
        const before = sel.length;
        if (sel.indexOf(d) < 0) sel.push(d);
        if (sel.indexOf(tX) < 0) sel.push(tX);
        if (sel.length === before) break;
        sel = sel.sort((a, b) => a - b);
      }
      if (!okFlag) continue;
      // prune redundant checkpoints (keep start and end) down to the target count
      const target = opts.target || 0;
      for (const q of shuffle(sel.slice(1, -1), r)) {
        if (sel.length <= target) break;
        const t = sel.filter((x) => x !== q);
        if (threadSolve(n, t.map((pi, k) => [path[pi], k + 1]), 2, false).count === 1) sel = t;
      }
      if (opts.maxNums && sel.length > opts.maxNums) continue;
      const nums = sel.map((pi, k) => [path[pi], k + 1]);
      return { n, k: nums, tries };
    }
    return null;
  }

  function checkThread(p, path) {
    // path: array of cells visited in order
    const n = p.n, N = n * n;
    const order = {};
    p.k.forEach(([c, k]) => { order[c] = k; });
    const last = p.k.length;
    let next = 1, okOrder = true;
    for (const c of path) {
      if (order[c] != null) { if (order[c] !== next) { okOrder = false; break; } next++; }
    }
    const done = path.length === N && okOrder && next === last + 1 && order[path[path.length - 1]] === last;
    return { ok: done, okOrder };
  }

  const api = {
    rng, hashSeed, shuffle,
    genStars, starsLogic, starsCount, checkStars,
    genDuo, duoLogic, duoCount, checkDuo,
    genThread, threadSolve, checkThread, hamPath,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TS = api;
})(typeof window !== 'undefined' ? window : this);
