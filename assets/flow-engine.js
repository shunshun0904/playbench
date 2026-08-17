/* ==========================================================================
   セクター間資金フロー ── 推定エンジン
   ==========================================================================

   sector_flow_network.py の移植。DOM には触らない。ブラウザでも node でも動く。
   正本はこのファイル（shunshun0904/sectorflow の web/flow-engine.js）。
   playbench 側の assets/flow-engine.js は、その写しである。

   引き継ぎ仕様 v3 の §2.5・§6.4 を反映してある。移植にあたって
   Python 側（v1 相当のファイルを受領）から変えた点は3つ:

     1. gfevd の normalize が真偽値ではなく 'row' | 'scalar' | 'none'。
        方向判定には 'scalar' を使う。§2.5 の反例のとおり、行正規化は
        リードラグが皆無でも向きを作る（3変数ホワイトノイズで net = 1/30）。
        この反例は test/engine-check.js で恒等式として押さえてある。

     2. bootstrapNet の帰無仮説を業種ごとの単変量 AR(p) から作る（§6.4-2）。
        diag(Φ̂) ではない。Φ̂ の対角は他業種を条件づけた偏係数なので、
        「交差ラグが無い」世界の係数ではない。

     3. net に付ける単位。行正規化のときだけ「%」であり、
        スカラー正規化では割合ではない（§6.4-3）。単位は unitOf() が返す。

   ── 数値の出どころについて ──
   このエンジンは合成データを持たない。読み込んだ CSV だけを計算する。
   仕様書 §0 の「実データ取得前に架空のデータを合成して検証することは、
   ユーザーの明示的な許可がない限り禁止」に従う。test/engine-check.js が
   使うのは固定行列に対する代数的な恒等式だけで、乱数を引かない。

   参考文献（いずれも仕様書 §2.2 に記載のもの）
     Diebold & Yilmaz (2012), Int. J. Forecasting 28(1), 57-66.
     Diebold & Yilmaz (2014), Journal of Econometrics 182(1), 119-134.
     Pesaran & Shin (1998), Economics Letters 58(1), 17-29.
     Caloia, Cipollini & Muzzioli (2019), Energy Economics 84, 104536.
   ========================================================================== */
(function (global, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else global.PBFLOW = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ═════════════════════════════════════════════════════════ 行列の小物 */

  function zeros(n, m) {
    var A = new Array(n);
    for (var i = 0; i < n; i++) A[i] = new Float64Array(m);
    return A;
  }
  function eye(n) {
    var A = zeros(n, n);
    for (var i = 0; i < n; i++) A[i][i] = 1;
    return A;
  }
  /* A(n×k) B(k×m) */
  function matmul(A, B) {
    var n = A.length, k = B.length, m = B[0].length;
    var C = zeros(n, m);
    for (var i = 0; i < n; i++) {
      var Ai = A[i], Ci = C[i];
      for (var t = 0; t < k; t++) {
        var a = Ai[t];
        if (a === 0) continue;
        var Bt = B[t];
        for (var j = 0; j < m; j++) Ci[j] += a * Bt[j];
      }
    }
    return C;
  }
  function transpose(A) {
    var n = A.length, m = A[0].length, B = zeros(m, n);
    for (var i = 0; i < n; i++) for (var j = 0; j < m; j++) B[j][i] = A[i][j];
    return B;
  }
  function diagOf(A) {
    var d = new Float64Array(A.length);
    for (var i = 0; i < A.length; i++) d[i] = A[i][i];
    return d;
  }

  /* 対称正定値の Cholesky 分解。正定値でなければ null を返す。 */
  function cholesky(G) {
    var n = G.length, L = zeros(n, n);
    for (var i = 0; i < n; i++) {
      for (var j = 0; j <= i; j++) {
        var s = G[i][j];
        for (var k = 0; k < j; k++) s -= L[i][k] * L[j][k];
        if (i === j) {
          if (!(s > 0)) return null;
          L[i][i] = Math.sqrt(s);
        } else {
          L[i][j] = s / L[j][j];
        }
      }
    }
    return L;
  }

  /* L L' X = B を解く。B は n×m。 */
  function cholSolve(L, B) {
    var n = L.length, m = B[0].length, Y = zeros(n, m), X = zeros(n, m);
    var i, j, k, s;
    for (i = 0; i < n; i++) {
      for (j = 0; j < m; j++) {
        s = B[i][j];
        for (k = 0; k < i; k++) s -= L[i][k] * Y[k][j];
        Y[i][j] = s / L[i][i];
      }
    }
    for (i = n - 1; i >= 0; i--) {
      for (j = 0; j < m; j++) {
        s = Y[i][j];
        for (k = i + 1; k < n; k++) s -= L[k][i] * X[k][j];
        X[i][j] = s / L[i][i];
      }
    }
    return X;
  }

  /* G X = B。G が数値的に特異なら、対角に微小量を足して解き直す。
     lstsq の完全な代替ではないが、この規模（35×35 程度）では実用上足りる。 */
  function solveSym(G, B) {
    var n = G.length, L = cholesky(G);
    if (L) return cholSolve(L, B);

    var scale = 0;
    for (var i = 0; i < n; i++) scale += Math.abs(G[i][i]);
    scale = (scale / n) || 1;

    for (var e = -12; e <= -2; e++) {
      var jit = scale * Math.pow(10, e), Gj = zeros(n, n);
      for (var a = 0; a < n; a++) {
        for (var b = 0; b < n; b++) Gj[a][b] = G[a][b];
        Gj[a][a] += jit;
      }
      L = cholesky(Gj);
      if (L) return cholSolve(L, B);
    }
    throw new Error('連立方程式が解けません。窓が短すぎるか、系列が一次従属です。');
  }

  /* 決定論的な擬似乱数（mulberry32）。ブートストラップの再現性のため、
     Math.random は使わない。同じ seed なら同じ結果が出る。 */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function quantile(sorted, q) {
    var n = sorted.length;
    if (!n) return NaN;
    var pos = (n - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  /* ═══════════════════════════════════════════════════════ 1. 変数構築 */

  /* 業種別売買代金 → VAR に投入するフロー変数。
     Python の build_flow_series と同じ手順。

       turnover : { dates: [...], names: [...], values: [[...]] }  値は円
       residualize : 市場共通成分を β 調整で除く（既定 true）
       betaWindow  : null なら全期間 β。整数ならローリング β

     仕様書 §4 の注記のとおり、ローリング連結度を出すときに全期間 β を使うと
     将来情報が混入する。既定は 250 日のローリングにしてある。
     戻り値の rows は「全業種が揃った日」だけ。 */
  function buildFlowSeries(turnover, opt) {
    opt = opt || {};
    var residualize = opt.residualize !== false;
    var betaWindow = opt.betaWindow == null ? null : opt.betaWindow;

    var dates = turnover.dates, names = turnover.names, V = turnover.values;
    var T = V.length, N = names.length;
    if (T < 3) throw new Error('行数が足りません。');

    /* 対数階差。非正値は欠測にする（log が定義できない） */
    var x = zeros(T - 1, N), xd = dates.slice(1);
    var t, i;
    for (t = 1; t < T; t++) {
      for (i = 0; i < N; i++) {
        var a = V[t - 1][i], b = V[t][i];
        x[t - 1][i] = (a > 0 && b > 0) ? Math.log(b) - Math.log(a) : NaN;
      }
    }

    /* 市場系列。全業種が揃う日だけ定義する（Python の min_count に相当）。
       1業種でも欠けている日に総和を取ると、その日だけ市場が小さく出る。 */
    var mkt = new Float64Array(T - 1);
    for (t = 1; t < T; t++) {
      var s0 = 0, s1 = 0, ok = true;
      for (i = 0; i < N; i++) {
        if (!(V[t - 1][i] > 0) || !(V[t][i] > 0)) { ok = false; break; }
        s0 += V[t - 1][i]; s1 += V[t][i];
      }
      mkt[t - 1] = ok ? Math.log(s1) - Math.log(s0) : NaN;
    }

    var out = x;
    if (residualize) {
      out = zeros(T - 1, N);
      for (i = 0; i < N; i++) {
        if (betaWindow == null) {
          /* 全期間の単回帰の傾き */
          var n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
          for (t = 0; t < T - 1; t++) {
            var yv = x[t][i], mv = mkt[t];
            if (!isFinite(yv) || !isFinite(mv)) continue;
            n++; sx += mv; sy += yv; sxx += mv * mv; sxy += mv * yv;
          }
          var den = n * sxx - sx * sx;
          var beta = den !== 0 ? (n * sxy - sx * sy) / den : 0;
          for (t = 0; t < T - 1; t++) out[t][i] = x[t][i] - beta * mkt[t];
        } else {
          /* ローリング β。窓が埋まるまでは欠測（先頭が切り落とされる） */
          for (t = 0; t < T - 1; t++) {
            var lo = t - betaWindow + 1;
            if (lo < 0) { out[t][i] = NaN; continue; }
            var m = 0, mx = 0, my = 0, mxx = 0, mxy = 0;
            for (var u = lo; u <= t; u++) {
              var yy = x[u][i], mm = mkt[u];
              if (!isFinite(yy) || !isFinite(mm)) continue;
              m++; mx += mm; my += yy; mxx += mm * mm; mxy += mm * yy;
            }
            var d2 = m * mxx - mx * mx;
            var bb = (m > 2 && d2 !== 0) ? (m * mxy - mx * my) / d2 : NaN;
            out[t][i] = x[t][i] - bb * mkt[t];
          }
        }
      }
    }

    /* 全業種が有限な行だけ残す */
    var rows = [], keep = [];
    for (t = 0; t < T - 1; t++) {
      var fine = true;
      for (i = 0; i < N; i++) if (!isFinite(out[t][i])) { fine = false; break; }
      if (fine) { rows.push(out[t]); keep.push(xd[t]); }
    }
    return { dates: keep, names: names.slice(), values: rows };
  }

  /* ═════════════════════════════════════════════════════════ 2. VAR 推定 */

  /* VAR(p) を推定する。X は行が時点、列が業種。
     戻り値 Phi[k][i][j] = ラグ k+1 の業種 j が業種 i の式に入る係数。 */
  function fitVar(X, p, ridgeAlpha) {
    var T = X.length, N = X[0].length;
    var rows = T - p, k = 1 + N * p;
    if (rows <= k) {
      throw new Error('標本 ' + rows + ' 行に対して説明変数 ' + k
        + ' 本。窓を伸ばすか、p を下げるか、ridge を入れてください。');
    }

    var Z = zeros(rows, k), Y = zeros(rows, N);
    var r, lag, i, j;
    for (r = 0; r < rows; r++) {
      var t = p + r;
      Z[r][0] = 1;
      for (lag = 0; lag < p; lag++) {
        var src = X[t - lag - 1], base = 1 + lag * N;
        for (j = 0; j < N; j++) Z[r][base + j] = src[j];
      }
      for (j = 0; j < N; j++) Y[r][j] = X[t][j];
    }

    /* 正規方程式。定数項には罰則を掛けない（Python 側と同じ扱い） */
    var Zt = transpose(Z);
    var G = matmul(Zt, Z), C = matmul(Zt, Y);
    if (ridgeAlpha) for (i = 1; i < k; i++) G[i][i] += ridgeAlpha;

    var B = solveSym(G, C);                       /* k × N */
    var fit = matmul(Z, B);

    var U = zeros(rows, N);
    for (r = 0; r < rows; r++) for (j = 0; j < N; j++) U[r][j] = Y[r][j] - fit[r][j];

    var dof = Math.max(rows - k, 1);
    var Ut = transpose(U), Sigma = matmul(Ut, U);
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) Sigma[i][j] /= dof;

    var Phi = [];
    for (lag = 0; lag < p; lag++) {
      var Pk = zeros(N, N);
      for (i = 0; i < N; i++) for (j = 0; j < N; j++) Pk[i][j] = B[1 + lag * N + j][i];
      Phi.push(Pk);
    }
    return { Phi: Phi, Sigma: Sigma, U: U, resid: U, N: N, p: p };
  }

  /* VAR 係数から MA(∞) 係数 A_0..A_{H-1} */
  function maRepresentation(Phi, H) {
    var p = Phi.length, N = Phi[0].length;
    var A = [eye(N)];
    for (var h = 1; h < H; h++) {
      var Ah = zeros(N, N);
      for (var k = 1; k <= Math.min(h, p); k++) {
        var M = matmul(Phi[k - 1], A[h - k]);
        for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) Ah[i][j] += M[i][j];
      }
      A.push(Ah);
    }
    return A;
  }

  /* ═════════════════════════════════════════════════════ 3. GFEVD と GIRF */

  /* 一般化予測誤差分散分解。
       theta[i][j] = 業種 j のショックが業種 i の H 期先予測誤差分散に占める量。

     normalize:
       'row'    行和を 1 に。connectedness table の「%」解釈はこれ。
       'scalar' 全体を1つのスカラーで割る。方向判定にはこちらを使う（§2.5）。
                行ごとに違う数で割らないので、θ が対称なら正規化後も対称。
                割る数は総和/N。行正規化と総和が一致するので目盛りが揃う。
       'none'   割らない。 */
  function gfevd(A, Sigma, H, normalize) {
    var N = Sigma.length;
    var num = zeros(N, N), den = new Float64Array(N);
    var h, i, j;

    for (h = 0; h < H; h++) {
      var AS = matmul(A[h], Sigma);
      for (i = 0; i < N; i++) {
        var s = 0;
        for (j = 0; j < N; j++) {
          var v = AS[i][j];
          num[i][j] += v * v;
          s += v * A[h][i][j];          /* (A Σ A')_ii */
        }
        den[i] += s;
      }
    }

    var theta = zeros(N, N);
    for (i = 0; i < N; i++) {
      for (j = 0; j < N; j++) theta[i][j] = num[i][j] / (Sigma[j][j] * den[i]);
    }

    if (normalize === 'row') {
      for (i = 0; i < N; i++) {
        var rs = 0;
        for (j = 0; j < N; j++) rs += theta[i][j];
        for (j = 0; j < N; j++) theta[i][j] /= rs;
      }
    } else if (normalize === 'scalar') {
      var tot = 0;
      for (i = 0; i < N; i++) for (j = 0; j < N; j++) tot += theta[i][j];
      var c = tot / N;
      for (i = 0; i < N; i++) for (j = 0; j < N; j++) theta[i][j] /= c;
    }
    return theta;
  }

  /* 累積一般化インパルス応答。符号はここにしか無い。
     psi[i][j] = 業種 j への1標準偏差ショックに対する業種 i の H 期累積応答。
     負 = 代替（ローテーション）、正 = 共変動。 */
  function girfCumulative(A, Sigma, H) {
    var N = Sigma.length, psi = zeros(N, N), sd = new Float64Array(N);
    var i, j, h;
    for (j = 0; j < N; j++) sd[j] = Math.sqrt(Sigma[j][j]);
    for (h = 0; h < H; h++) {
      var AS = matmul(A[h], Sigma);
      for (i = 0; i < N; i++) for (j = 0; j < N; j++) psi[i][j] += AS[i][j] / sd[j];
    }
    return psi;
  }

  /* Diebold-Yilmaz の connectedness table。
     行正規化した theta を渡すこと。渡された数字をそのまま100倍する。 */
  function connectednessTable(theta, names) {
    var N = names.length, from = new Float64Array(N), to = new Float64Array(N);
    var i, j, total = 0;
    for (i = 0; i < N; i++) {
      for (j = 0; j < N; j++) {
        if (i === j) continue;
        from[i] += theta[i][j];
        to[j] += theta[i][j];
        total += theta[i][j];
      }
    }
    var fromPc = [], toPc = [], netPc = [];
    for (i = 0; i < N; i++) {
      fromPc.push(from[i] * 100);
      toPc.push(to[i] * 100);
      netPc.push((to[i] - from[i]) * 100);
    }
    return {
      names: names.slice(),
      cells: theta,
      from: fromPc, to: toPc, net: netPc,
      tci: total / N * 100          /* 総連結度。§9 のゲート4で見るのはこれ */
    };
  }

  /* net の単位。行正規化のときだけ「%」。§6.4-3 */
  function unitOf(normalize) { return normalize === 'row' ? '%' : '指数'; }

  /* ═══════════════════════════════════════════════════ 4. 有向エッジ */

  /* ペアワイズ純連結度から有向エッジを作る。

     net = theta[b][a] - theta[a][b] が正なら a が b を先導している。
     ただし「先導方向」と「資金の流れの方向」は別物（§2.4）。
     累積 GIRF が負（代替）なら、資金は追随側から先導側へ向かうと解釈する。
     つまり矢印は先導の矢印と逆を向く。両方を属性として持つ。

     girfTol の内側は 'ambiguous'。符号が0と区別できていないので矢印は引かない。 */
  function directedEdges(theta, psi, names, opt) {
    opt = opt || {};
    var girfTol = opt.girfTol || 0;
    var minNet = opt.minNet || 0;
    var N = names.length, rows = [];

    for (var a = 0; a < N; a++) {
      for (var b = a + 1; b < N; b++) {
        var net = theta[b][a] - theta[a][b];
        if (Math.abs(net) <= minNet) continue;

        var driver, follower, resp;
        if (net > 0) { driver = a; follower = b; resp = psi[b][a]; }
        else { driver = b; follower = a; resp = psi[a][b]; net = -net; }

        var relation = resp < -girfTol ? 'rotation'
          : (resp > girfTol ? 'comovement' : 'ambiguous');

        rows.push({
          i: a, j: b,
          driver: names[driver],
          follower: names[follower],
          driverIdx: driver, followerIdx: follower,
          net: net * 100,
          girf: resp,
          sign: Math.sign(resp),
          relation: relation,
          flowFrom: relation === 'rotation' ? names[follower] : null,
          flowTo: relation === 'rotation' ? names[driver] : null,
          flowFromIdx: relation === 'rotation' ? follower : -1,
          flowToIdx: relation === 'rotation' ? driver : -1
        });
      }
    }
    rows.sort(function (x, y) { return y.net - x.net; });
    if (opt.topK != null) rows = rows.slice(0, opt.topK);
    return rows;
  }

  /* ═════════════════════════════════════════ 5. 帰無分布とブートストラップ */

  /* 業種ごとの単変量 AR(p)。§6.4-2 の指摘に対応する。
     「交差ラグが無い」帰無仮説の下での正しい推定はこれであって、
     多変量 VAR の Φ̂ の対角ではない（あれは他業種を条件づけた偏係数）。
     同時点の相関は残差ベクトルとして持ち出すので、Σ は壊さない。 */
  function fitDiagonalAR(X, p) {
    var T = X.length, N = X[0].length, rows = T - p;
    var Phi = [], r, i, lag;
    for (lag = 0; lag < p; lag++) Phi.push(zeros(N, N));
    var U = zeros(rows, N);

    for (i = 0; i < N; i++) {
      var Z = zeros(rows, 1 + p), y = zeros(rows, 1);
      for (r = 0; r < rows; r++) {
        Z[r][0] = 1;
        for (lag = 0; lag < p; lag++) Z[r][1 + lag] = X[p + r - lag - 1][i];
        y[r][0] = X[p + r][i];
      }
      var Zt = transpose(Z);
      var coef = solveSym(matmul(Zt, Z), matmul(Zt, y));    /* (1+p) × 1 */
      for (lag = 0; lag < p; lag++) Phi[lag][i][i] = coef[1 + lag][0];
      var fit = matmul(Z, coef);
      for (r = 0; r < rows; r++) U[r][i] = y[r][0] - fit[r][0];
    }
    return { Phi: Phi, U: U };
  }

  /* ムービングブロックブートストラップ。

     nullModel:
       'no_crosslag' 交差ラグゼロの帰無分布。矢印のゲートに使うのはこちら。
                     §2.5 の訂正のとおり、スカラー正規化のもとでは母集団の
                     net は帰無仮説下で厳密に 0 になる。したがってこの分布が
                     測っているのは母集団バイアスではなく有限標本の推定誤差で、
                     幅はおおむね窓長の平方根に反比例する。
       'sample'      推定した VAR をそのまま回す標本分布。区間推定用。

     onProgress(done, total) を渡すと途中経過が取れる。 */
  /* 少しずつ進められる形で返す。ブラウザで200回まわすと1秒以上かかり、
     一息に回すと画面が固まる。step(n) を分けて呼べば、その間に描き直せる。
     乱数の流れは1本のままなので、分け方を変えても答えは変わらない。 */
  function bootstrapRunner(X, opt) {
    opt = opt || {};
    var p = opt.p || 2, H = opt.H || 10;
    var nBoot = opt.nBoot || 200, block = opt.block || 20;
    var ridge = opt.ridgeAlpha || null;
    var normalize = opt.normalize || 'scalar';
    var nullModel = opt.nullModel || 'no_crosslag';
    var wantGirf = !!opt.returnGirf;
    var rand = rng(opt.seed == null ? 0 : opt.seed);

    var T = X.length, N = X[0].length;
    var base = nullModel === 'no_crosslag' ? fitDiagonalAR(X, p) : fitVar(X, p, ridge);
    var Phi = base.Phi, U = base.U;
    var nRes = U.length;
    if (nRes <= block) throw new Error('ブロック長が標本より長すぎます。');
    var nBlocks = Math.ceil(nRes / block);

    var nets = [], girfs = wantGirf ? [] : null, done = 0, failed = 0;

    function one() {
      var i, j, k, t;

      /* 残差をブロックごと引き直す。ベクトルのまま引くので、
         業種間の同時点相関（＝Σ）は保たれる。 */
      var Ub = zeros(nRes, N), w = 0;
      for (k = 0; k < nBlocks && w < nRes; k++) {
        var s = Math.floor(rand() * (nRes - block + 1));
        for (var q = 0; q < block && w < nRes; q++, w++) {
          for (j = 0; j < N; j++) Ub[w][j] = U[s + q][j];
        }
      }

      /* 帰無モデルで系列を作り直す */
      var Xb = zeros(T, N);
      for (t = 0; t < p; t++) for (j = 0; j < N; j++) Xb[t][j] = X[t][j];
      for (t = p; t < T; t++) {
        for (i = 0; i < N; i++) {
          var v = 0;
          for (k = 1; k <= p; k++) {
            var Pk = Phi[k - 1], prev = Xb[t - k];
            for (j = 0; j < N; j++) v += Pk[i][j] * prev[j];
          }
          Xb[t][i] = v + Ub[t - p][i];
        }
      }

      /* 作り直した系列に、本番と同じ推定を当てる。
         測りたいのは推定誤差そのものなので、ここは必ず多変量 VAR で当てる。 */
      var fb = fitVar(Xb, p, ridge);
      var Ab = maRepresentation(fb.Phi, H);
      var th = gfevd(Ab, fb.Sigma, H, normalize);

      var net = zeros(N, N);
      for (i = 0; i < N; i++) for (j = 0; j < N; j++) net[i][j] = th[j][i] - th[i][j];
      nets.push(net);
      if (wantGirf) girfs.push(girfCumulative(Ab, fb.Sigma, H));
    }

    return {
      total: nBoot,
      get done() { return done; },
      get finished() { return done >= nBoot; },
      /* n 回だけ進める。実際に進んだ回数を返す。 */
      step: function (n) {
        var did = 0;
        while (did < n && done < nBoot) {
          try { one(); } catch (err) { failed++; }
          done++; did++;
        }
        return did;
      },
      result: function () {
        return {
          nets: nets, girfs: girfs, nullModel: nullModel,
          normalize: normalize, failed: failed
        };
      }
    };
  }

  /* 一息に回す版。node からの呼び出しと、短い試行はこちらで足りる。 */
  function bootstrapNet(X, opt) {
    var r = bootstrapRunner(X, opt);
    while (!r.finished) {
      r.step(1);
      if (opt && opt.onProgress) opt.onProgress(r.done, r.total);
    }
    return r.result();
  }

  /* Benjamini-Hochberg。棄却する添字の集合を返す。 */
  function bhReject(pvals, alpha) {
    var m = pvals.length;
    var order = pvals.map(function (p, i) { return { p: p, i: i }; })
      .sort(function (a, b) { return a.p - b.p; });
    var kMax = -1;
    for (var k = 0; k < m; k++) {
      if (order[k].p <= (k + 1) / m * alpha) kMax = k;
    }
    var keep = {};
    for (var q = 0; q <= kMax; q++) keep[order[q].i] = true;
    return keep;
  }

  /* エッジに帰無分布のゲートを掛ける。

     ブートストラップ p 値は (1 + #{|net*| ≧ |net|}) / (nBoot + 1)。
     +1 は 0 を返さないための補正で、これが無いと FDR が甘くなる。
     そのうえで BH 補正を N(N-1)/2 本に掛ける。 */
  function gateEdges(edges, boot, opt) {
    opt = opt || {};
    var alpha = opt.alpha == null ? 0.10 : opt.alpha;
    var nets = boot.nets, nBoot = nets.length;

    var pvals = edges.map(function (e) {
      var obs = Math.abs(e.net / 100), hit = 0;
      for (var b = 0; b < nBoot; b++) if (Math.abs(nets[b][e.i][e.j]) >= obs) hit++;
      return (1 + hit) / (nBoot + 1);
    });
    var keep = bhReject(pvals, alpha);

    /* girfTol は帰無分布の GIRF の裾から決める（§5 の「符号ゲート」）。
       非対角の |psi| を全部集めて、その分位点を1つの閾値にする。 */
    var girfTol = 0;
    if (boot.girfs && boot.girfs.length) {
      var pool = [];
      for (var g = 0; g < boot.girfs.length; g++) {
        var P = boot.girfs[g];
        for (var i = 0; i < P.length; i++) {
          for (var j = 0; j < P.length; j++) if (i !== j) pool.push(Math.abs(P[i][j]));
        }
      }
      pool.sort(function (a, b) { return a - b; });
      girfTol = quantile(pool, opt.girfQ == null ? 0.90 : opt.girfQ);
    }

    edges.forEach(function (e, k) {
      e.p = pvals[k];
      e.passNet = !!keep[k];
      if (girfTol > 0) {
        e.relation = e.girf < -girfTol ? 'rotation'
          : (e.girf > girfTol ? 'comovement' : 'ambiguous');
        e.flowFrom = e.relation === 'rotation' ? e.follower : null;
        e.flowTo = e.relation === 'rotation' ? e.driver : null;
        e.flowFromIdx = e.relation === 'rotation' ? e.followerIdx : -1;
        e.flowToIdx = e.relation === 'rotation' ? e.driverIdx : -1;
      }
      e.drawn = e.passNet && e.relation === 'rotation';
    });
    return { edges: edges, girfTol: girfTol, alpha: alpha, nBoot: nBoot };
  }

  /* ═════════════════════════════════════════════════════ 6. ローリング推定 */

  /* ローリング窓で総連結度と業種別 NET を追う。
     §6.4-1 の指摘に対応して normalize を引数に出してある。
     総連結度（＝ゲート4で 2020年3月 のスパイクを見る系列）は
     %解釈をするので 'row' で計算すること。 */
  function rollingRunner(flow, opt) {
    opt = opt || {};
    var win = opt.window || 250, p = opt.p || 2, H = opt.H || 10;
    var stepBy = opt.step || 1, ridge = opt.ridgeAlpha || null;
    var normalize = opt.normalize || 'row';

    var V = flow.values, N = flow.names.length;
    var dates = [], tci = [], net = [];
    var total = Math.max(0, Math.floor((V.length - win) / stepBy) + 1);
    var end = win, done = 0, failed = 0;

    function one() {
      var sub = V.slice(end - win, end), res = null;
      try {
        var f = fitVar(sub, p, ridge);
        var A = maRepresentation(f.Phi, H);
        res = connectednessTable(gfevd(A, f.Sigma, H, normalize), flow.names);
      } catch (err) { failed++; }
      dates.push(flow.dates[end - 1]);
      tci.push(res ? res.tci : NaN);
      net.push(res ? res.net : new Array(N).fill(NaN));
      end += stepBy;
      done++;
    }

    return {
      total: total,
      get done() { return done; },
      get finished() { return end > V.length; },
      step: function (n) {
        var did = 0;
        while (did < n && end <= V.length) { one(); did++; }
        return did;
      },
      result: function () {
        return {
          dates: dates, names: flow.names.slice(), tci: tci, net: net,
          normalize: normalize, window: win, failed: failed
        };
      }
    };
  }

  function rollingConnectedness(flow, opt) {
    var r = rollingRunner(flow, opt);
    while (!r.finished) {
      r.step(1);
      if (opt && opt.onProgress) opt.onProgress(r.done, r.total);
    }
    return r.result();
  }

  /* ═════════════════════════════════════════════════ 7. まとめて1回分 */

  /* 窓1つぶんの推定。画面から呼ぶのは基本これ。 */
  function estimate(flow, opt) {
    opt = opt || {};
    var p = opt.p || 2, H = opt.H || 10, ridge = opt.ridgeAlpha || null;
    var V = opt.window ? flow.values.slice(-opt.window) : flow.values;
    var dates = opt.window ? flow.dates.slice(-opt.window) : flow.dates;

    var f = fitVar(V, p, ridge);
    var A = maRepresentation(f.Phi, H);

    /* 表は行正規化（%解釈）、方向判定はスカラー正規化。§2.5 の対策1 */
    var thetaRow = gfevd(A, f.Sigma, H, 'row');
    var thetaDir = gfevd(A, f.Sigma, H, opt.normalize || 'scalar');
    var psi = girfCumulative(A, f.Sigma, H);

    return {
      from: dates[0], to: dates[dates.length - 1], obs: V.length,
      names: flow.names.slice(),
      p: p, H: H, ridgeAlpha: ridge,
      normalize: opt.normalize || 'scalar',
      Phi: f.Phi, Sigma: f.Sigma,
      thetaRow: thetaRow, thetaDir: thetaDir, psi: psi,
      table: connectednessTable(thetaRow, flow.names),
      edges: directedEdges(thetaDir, psi, flow.names, { girfTol: opt.girfTol || 0 }),
      values: V
    };
  }

  /* ═══════════════════════════════════════════════════════ 8. CSV 読み */

  /* 業種別売買代金パネルの CSV を読む。
       1列目 = 日付、2列目以降 = 業種、値 = 売買代金（円）
     カンマ区切り、ヘッダ1行。空欄と "NA"/"NaN"/"-" は欠測にする。
     ブラウザの中だけで読む。どこにも送らない。 */
  function parseCsv(text) {
    var lines = text.replace(/\r\n?/g, '\n').split('\n')
      .filter(function (l) { return l.trim() !== ''; });
    if (lines.length < 3) throw new Error('行が足りません。ヘッダ1行＋データ2行以上が要ります。');

    var head = splitLine(lines[0]);
    if (head.length < 3) throw new Error('列が足りません。日付列＋業種2列以上が要ります。');
    var names = head.slice(1).map(function (s) { return s.trim(); });

    var dates = [], values = [], bad = 0;
    for (var r = 1; r < lines.length; r++) {
      var cells = splitLine(lines[r]);
      if (cells.length !== head.length) { bad++; continue; }
      var row = new Float64Array(names.length);
      for (var c = 0; c < names.length; c++) {
        var raw = cells[c + 1].trim().replace(/,/g, '');
        row[c] = (raw === '' || /^(na|nan|-|null)$/i.test(raw)) ? NaN : Number(raw);
      }
      dates.push(cells[0].trim());
      values.push(row);
    }
    if (!values.length) throw new Error('読める行がありませんでした。');

    /* 日付順に並べ直す。並んでいない CSV を黙って受けると階差が壊れる */
    var idx = dates.map(function (d, i) { return i; })
      .sort(function (a, b) { return dates[a] < dates[b] ? -1 : (dates[a] > dates[b] ? 1 : 0); });
    return {
      dates: idx.map(function (i) { return dates[i]; }),
      names: names,
      values: idx.map(function (i) { return values[i]; }),
      skipped: bad
    };
  }

  function splitLine(line) {
    /* 引用符に対応した最小限の分割。業種名に読点が入っていても壊れない */
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (q) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }

  /* TOPIX-17 の業種コードに名前を当てる。表示だけの都合で、
     読み込んだ列名がコードでなければ何もしない。 */
  var SECTOR17 = {
    1: '食品', 2: 'エネルギー資源', 3: '建設・資材', 4: '素材・化学',
    5: '医薬品', 6: '自動車・輸送機', 7: '鉄鋼・非鉄', 8: '機械',
    9: '電機・精密', 10: '情報通信・サービスその他', 11: '電気・ガス',
    12: '運輸・物流', 13: '商社・卸売', 14: '小売', 15: '銀行',
    16: '金融（除く銀行）', 17: '不動産'
  };
  function labelSectors(names) {
    return names.map(function (n) {
      var m = /^0*(\d{1,2})$/.exec(String(n).trim());
      if (m && SECTOR17[+m[1]]) return SECTOR17[+m[1]];
      return n;
    });
  }

  return {
    zeros: zeros, eye: eye, matmul: matmul, transpose: transpose, diagOf: diagOf,
    cholesky: cholesky, solveSym: solveSym, rng: rng, quantile: quantile,
    buildFlowSeries: buildFlowSeries,
    fitVar: fitVar, fitDiagonalAR: fitDiagonalAR, maRepresentation: maRepresentation,
    gfevd: gfevd, girfCumulative: girfCumulative, connectednessTable: connectednessTable,
    unitOf: unitOf,
    directedEdges: directedEdges, bootstrapNet: bootstrapNet, bhReject: bhReject,
    bootstrapRunner: bootstrapRunner, rollingRunner: rollingRunner,
    gateEdges: gateEdges, rollingConnectedness: rollingConnectedness,
    estimate: estimate, parseCsv: parseCsv, labelSectors: labelSectors,
    SECTOR17: SECTOR17
  };
});
