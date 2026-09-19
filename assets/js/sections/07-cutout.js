/* ==========================================================================
   07 wycięcia i dym (delikatnie, sterowane przewijaniem)
   [data-cutout="pole.png"]  postać zawsze ostra (.cut-fg, WebP z alfą), tło (.cut-bg)
       wyłania się wokół niej miękko, jak chmury, w miarę przewijania.
       pole.png = odległość od postaci + szum (0 = przy postaci, 255 = najdalej).
   [data-smoke="x,y"]        żar papierosa (ułamki zdjęcia): smuga dymu gęstnieje, a potem zdjęcie
       dosłownie zamienia się w dym (WebGL). Postęp: z kontenera .smoke-scroll (sticky),
       z położenia na ekranie albo z zewnątrz: el.__smoke.set(p) / .active(bool).
   [data-depth]              głębia 2,5D: postać i tło przesuwają się z różną prędkością.
   Bez JS: zwykłe zdjęcie. SP.reduced: stan końcowy / bez ruchu.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.SP) return;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  function ss(a, b, v) { var t = (v - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function hash(x, y) { var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function viewP(el) {   // 0: element wchodzi od dołu, 1: znika u góry
    var r = el.getBoundingClientRect(), vh = window.innerHeight;
    return (vh - r.top) / (vh + r.height);
  }
  function watch(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { cb(es[0].isIntersecting); }, { rootMargin: '120px 0px' }).observe(el);
  }

  /* ---------------- wycięcie: tło wyłania się jak chmury ---------------- */
  function Cutout(el) {
    var bg = el.querySelector('.cut-bg'), fg = el.querySelector('.cut-fg'), src = el.getAttribute('data-cutout');
    if (!bg || !fg || !src) return;
    var cv = document.createElement('canvas'), ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) return;
    cv.className = 'cut-cv'; cv.setAttribute('aria-hidden', 'true');
    el.insertBefore(cv, fg);
    var mcv = document.createElement('canvas'), mctx = mcv.getContext('2d');
    var field = null, edge = null, mdata = null, fw = 0, fh = 0;
    var SOFT = .24, END = 1.3, cur = 0, tgt = 0, raf = 0, vis = false, W = 0, H = 0;

    function prepField(img) {
      fw = img.naturalWidth; fh = img.naturalHeight;
      mcv.width = fw; mcv.height = fh;
      mctx.drawImage(img, 0, 0);
      var d = mctx.getImageData(0, 0, fw, fh).data;
      field = new Float32Array(fw * fh); edge = new Float32Array(fw * fh);
      for (var y = 0, i = 0; y < fh; y++) for (var x = 0; x < fw; x++, i++) {
        field[i] = d[i * 4] / 255;
        var nx = x / (fw - 1), ny = y / (fh - 1), m = Math.min(nx, 1 - nx, ny, 1 - ny);
        var n = vnoise(x * .09, y * .09) * .65 + vnoise(x * .21 + 9, y * .21 + 3) * .35;
        edge[i] = ss(0, .15, m + (n - .5) * .08);       // krawędzie rozmyte „w chmurę”, bez twardej ramki
      }
      mdata = mctx.createImageData(fw, fh);
      for (var k = 0; k < fw * fh; k++) { mdata.data[k * 4] = mdata.data[k * 4 + 1] = mdata.data[k * 4 + 2] = 255; }
      el.classList.add('live');
      size(); paint();
    }
    function size() {
      var r = el.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width * DPR)); H = Math.max(1, Math.round(r.height * DPR));
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    }
    function paint() {
      if (!field || !bg.complete || !bg.naturalWidth) return;
      var md = mdata.data, lo = cur - SOFT;
      for (var i = 0, n = field.length; i < n; i++) md[i * 4 + 3] = (1 - ss(lo, cur, field[i])) * edge[i] * 255;
      mctx.putImageData(mdata, 0, 0);
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(bg, 0, 0, W, H);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(mcv, 0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    function loop() {
      raf = 0;
      var d = tgt - cur;
      cur = Math.abs(d) < .002 ? tgt : cur + d * .12;
      paint();
      if (cur !== tgt) raf = requestAnimationFrame(loop);
    }
    function onScroll() {
      if (!vis || !field) return;
      tgt = SP.reduced ? END : ss(.06, .62, viewP(el)) * END;
      if (!raf && tgt !== cur) raf = requestAnimationFrame(loop);
    }
    var fi = new Image();
    fi.decoding = 'async';
    fi.onload = function () {
      if (SP.reduced) { cur = tgt = END; }
      else { cur = tgt = ss(.06, .62, viewP(el)) * END; }
      prepField(fi);
    };
    fi.src = src;
    if (!bg.complete) bg.addEventListener('load', function () { size(); paint(); }, { once: true });
    watch(el, function (on) { vis = on; if (on) onScroll(); });
    SP.onScroll(onScroll);
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); paint(); }, 120); });
  }

  /* ---------------- „przeszłość poszła z dymem” (WebGL, sterowane przewijaniem, odwracalne) ----------------
     Faza 1 (P 0–.3): smuga z żaru papierosa gęstnieje.
     Faza 2 (P .3–.9): front erozji (szum + odległość od papierosa) zjada zdjęcia; każdy odsłonięty fragment
                       odrywa się jako drobne ziarna w odcieniach zdjęcia, które zamieniają się w miękki dym.
     Faza 3 (P .85–1): zostaje cienki dym, który się rozwiewa.
     Wszystko jest funkcją P (bez symulacji krokowej), więc przewijanie w górę cofa efekt. */
  var VS_Q = 'attribute vec2 aP;uniform vec4 uRect;uniform vec2 uCv;varying vec2 vUv;' +
    'void main(){vUv=aP;vec2 p=uRect.xy+aP*uRect.zw;vec2 c=p/uCv*2.0-1.0;gl_Position=vec4(c.x,-c.y,0.,1.);}';
  var FS_Q = 'precision mediump float;uniform sampler2D uTex;uniform sampler2D uEro;uniform float uT;uniform float uR;uniform float uF;uniform float uTime;uniform float uClr;uniform vec2 uSz;uniform vec2 uBC;varying vec2 vUv;' +
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}' +
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}' +
    'float rr(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}' +
    'void main(){vec3 c=texture2D(uTex,vUv).rgb;float l=dot(c,vec3(.299,.587,.114));l=clamp(((l-.5)*uBC.y+.5)*uBC.x,0.,1.);' +
      /* miękki, dymny front: pole erozji zaburzone szumem średnim (kłęby) i drobnym (ziarno ~1,5 px) */
      'vec2 px=vUv*uSz;float mid=n(px*.035+uTime*.05)*.6+n(px*.09-uTime*.04)*.4;float fine=h(floor(px/1.6));' +
      'float e=texture2D(uEro,vUv).r;float ee=e+(mid-.5)*uF*1.1+(fine-.5)*uF*.7;' +
      'float a=smoothstep(uT,uT+uF,ee);' +
      'float rim=clamp(1.-abs(ee-(uT+uF*.55))/(uF*.8),0.,1.);l=mix(l,.8,rim*.4);' +
      'a*=clamp(.5-rr((vUv-.5)*uSz,uSz*.5,uR),0.,1.);' +
      /* zamiast czerni: delikatna szara poświata dymu w wyżartym miejscu, rzednie z czasem */
      'float depth=max(0.,uT+uF*.5-e);float edgeF=smoothstep(0.,.1,min(vUv.x,1.-vUv.x))*smoothstep(0.,.16,min(vUv.y,1.-vUv.y));' +
      'float sm=.09*exp(-depth/.2)*(.35+.65*mid)*step(-.001,uT+uF-e)*edgeF*uClr;' +
      'float A=a+sm*(1.-a);gl_FragColor=vec4(vec3(l)*a+vec3(.78)*sm*(1.-a),A);}';
  var VS_P = 'attribute vec2 aO;attribute vec2 aLE;attribute vec4 aS;' +
    'uniform vec4 uRect;uniform vec2 uCv;uniform vec2 uTip;uniform float uT;uniform float uF;uniform float uLife;uniform float uTime;uniform float uS;uniform float uZ;uniform float uPl;uniform float uClr;' +
    'varying float vA;varying float vC;varying float vSoft;' +
    'void main(){vec2 p;float sz;float al;float col;float soft;' +
    'if(aLE.y<0.){' +
      'float c=fract(uTime*(.07+.05*aS.x)+aS.w);' +
      'p=uRect.xy+uTip*uRect.zw;' +
      'p.y-=pow(c,.8)*(110.+80.*aS.z)*uS;' +
      'p.x+=(sin(c*3.6+aS.z*6.283+uTime*.3)*(9.+13.*aS.y)*c+sin(c*9.+aS.w*6.283+uTime*.55)*4.*c+(aS.x-.5)*34.*c*c+c*c*30.)*uS;' +
      'sz=mix(3.,16.+18.*aS.z,pow(c,.7))*uZ;' +
      'al=(.012+.014*aS.x)*smoothstep(0.,.22,c)*(1.-smoothstep(.28,1.,c))*step(aS.y,uPl)*min(1.,uPl*1.6);' +
      'col=.82;soft=1.;' +
    '}else{' +
      'float a=clamp((uT+uF*.5-aLE.y)/uLife,0.,1.);' +
      'if(a<=0.||a>=1.){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;vA=0.;vC=0.;vSoft=0.;return;}' +
      'p=uRect.xy+aO*uRect.zw;' +
      'p.y-=pow(a,1.25)*(90.+150.*aS.x)*uS;' +
      'p.x+=((aS.y-.5)*70.*a+28.*a*a+sin(a*(3.2+4.5*aS.z)+aS.w*6.283)*(10.+30.*aS.z)*a+cos(a*8.+aS.x*6.283+uTime*.4)*6.*a)*uS;' +
      'sz=mix(1.4,10.+20.*aS.z,smoothstep(.02,.6,a))*uZ;' +
      'al=mix(.6,.022+.024*aS.x,smoothstep(0.,.1,a))*(1.-smoothstep(.3,.85,a));' +
      'col=mix(aLE.x,.8,smoothstep(0.,.18,a));soft=smoothstep(0.,.08,a);' +
    '}' +
    'vec2 cl=p/uCv*2.-1.;gl_Position=vec4(cl.x,-cl.y,0.,1.);gl_PointSize=sz;vA=al*uClr;vC=col;vSoft=soft;}';
  var FS_P = 'precision mediump float;varying float vA;varying float vC;varying float vSoft;' +
    'void main(){vec2 q=gl_PointCoord*2.-1.;float d=dot(q,q);float hard=1.-smoothstep(.5,1.,d);' +
    'float gs=exp(-d*3.)*(1.-smoothstep(.75,1.,d));float f=mix(hard,gs,vSoft);float a=vA*f;gl_FragColor=vec4(vec3(vC)*a,a);}';

  function glProgram(gl, vs, fs) {
    function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  function Smoke(el) {
    var img = el.querySelector('img'), at = (el.getAttribute('data-smoke') || '.5,.5').split(',').map(Number);
    if (!img) return;
    var ext = el.hasAttribute('data-smoke-ext');            // postęp podawany z zewnątrz (krok sticky na stronie głównej)
    var scroller = el.closest('.smoke-scroll');              // własny, wysoki kontener sticky (historia.html)
    var cap = el.querySelector('figcaption');
    var DP = Math.min(window.devicePixelRatio || 1, 1.5);
    var P = 0, vis = false, active = !ext, raf = 0, ready = false, gl = null, cv = null;
    var FE = .075, LIFE = .38, rect = [0, 0, 1, 1], cvW = 1, cvH = 1, K = 1, rad = 0, bc = [1, 1], nGrain = 0, nPlume = 0;
    var qProg, pProg, qBuf, pBuf, tex, ero, U = {};

    var capDy = null, stickyEl;
    function stage() {                                        // najbliższy przodek z position: sticky (scena, w której podpis ma być na środku)
      if (stickyEl !== undefined) return stickyEl;
      for (var n = el.parentElement; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).position === 'sticky') return (stickyEl = n);
      return (stickyEl = null);
    }
    window.addEventListener('resize', function () { capDy = null; }, { passive: true });
    function capMove() {
      if (!cap) return;
      cap.style.opacity = '1';
      if (SP.reduced) return;
      var k = ss(.62, .95, P);
      if (k <= 0) { cap.style.transform = ''; cap.classList.remove('cap-solo'); capDy = null; return; }
      if (capDy === null) {                                   // odległość środka podpisu od środka przyklejonej sceny (niezależna od przewinięcia)
        cap.style.transform = '';
        var r = cap.getBoundingClientRect(), st = stage(), b = st ? st.getBoundingClientRect() : null;
        var mid = b && b.height > 0 ? b.top + Math.min(b.height, window.innerHeight) / 2 : window.innerHeight / 2;
        capDy = mid - (r.top + r.height / 2);
      }
      cap.style.transform = 'translate3d(0,' + (capDy * k).toFixed(1) + 'px,0) scale(' + (1 + .08 * k).toFixed(3) + ')';
      cap.classList.toggle('cap-solo', k > .5);
    }
    function fade() {                                        // ograniczony ruch / brak WebGL: zwykłe przenikanie
      var o = 1 - ss(.35, .8, P);
      img.style.opacity = o.toFixed(3);
      capMove();   // podpis zostaje w pełni czytelny — zdjęcia idą z dymem, słowa zostają i płyną na środek
    }
    function uniforms() {
      /* T: próg erozji. P .3–.72: zdjęcie odrywa się od żaru na zewnątrz; P .72–1: dym dojrzewa i rzednie */
      var t0 = -.05 - FE * 1.6;                              // przed fazą 2 front (z miękką krawędzią) nie dotyka zdjęcia
      var t = P < .28 ? t0 : P < .78 ? t0 + (1 - t0) * ss(.28, .78, P) : 1 + LIFE * 1.02 * (P - .78) / .22;
      return {
        T: t,
        pl: (.22 + .78 * ss(0, .3, P)) * (1 - ss(.4, .62, P)),   // żar znika razem ze zdjęciem
        clr: 1 - ss(.82, .97, P)
      };
    }
    /* pole erozji: szum fbm + odległość od papierosa (zdjęcia „spalają się” od żaru na zewnątrz) */
    function erosionField(w, h) {
      var f = new Float32Array(w * h), mn = 1e9, mx = -1e9, ar = (rect[2] / rect[3]) || 2.7;
      for (var y = 0, i = 0; y < h; y++) for (var x = 0; x < w; x++, i++) {
        var u = x / (w - 1), v = y / (h - 1);
        var n = vnoise(u * 6 * ar, v * 6) * .5 + vnoise(u * 13 * ar + 7, v * 13 + 3) * .3 + vnoise(u * 29 * ar + 1, v * 29 + 9) * .2;
        var dx = (u - at[0]) * ar, dy = v - at[1], d = Math.sqrt(dx * dx + dy * dy) / (ar * .62);
        var e = n * .55 + d * .45;
        f[i] = e; if (e < mn) mn = e; if (e > mx) mx = e;
      }
      for (var k = 0; k < f.length; k++) f[k] = (f[k] - mn) / (mx - mn);
      return f;
    }
    function sampleField(f, w, h, u, v) {
      var x = u * (w - 1), y = v * (h - 1), x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = x - x0, fy = y - y0;
      var a = f[y0 * w + x0], b = f[y0 * w + x1], c = f[y1 * w + x0], d = f[y1 * w + x1];
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }

    function layout() {
      var r = img.getBoundingClientRect(), fr = el.getBoundingClientRect();
      var iw = r.width, ih = r.height;
      K = Math.max(.42, Math.min(1.1, iw / 760));
      var eL = iw * .22, eR = iw * .22, eT = Math.max(ih * 1.05, 330 * K), eB = ih * .16;
      var cw = iw + eL + eR, ch = ih + eT + eB;
      cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
      cv.style.left = (r.left - fr.left - eL) + 'px'; cv.style.top = (r.top - fr.top - eT) + 'px';
      cvW = Math.max(1, Math.round(cw * DP)); cvH = Math.max(1, Math.round(ch * DP));
      if (cv.width !== cvW || cv.height !== cvH) { cv.width = cvW; cv.height = cvH; }
      rect = [eL * DP, eT * DP, iw * DP, ih * DP];
      rad = (parseFloat(getComputedStyle(img).borderTopLeftRadius) || 0) * DP;
    }

    function build() {
      var fw = 200, fh = Math.max(40, Math.round(fw / ((rect[2] / rect[3]) || 2.7)));
      var field = erosionField(fw, fh);
      /* tekstura erozji */
      var eb = new Uint8Array(fw * fh);
      for (var i = 0; i < eb.length; i++) eb[i] = Math.round(field[i] * 255);
      ero = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, ero);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, fw, fh, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, eb);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(function (p) { gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR); });
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (p) { gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE); });
      /* tekstura zdjęcia */
      tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(function (p) { gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR); });
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(function (p) { gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE); });
      /* ziarna: próbkowanie zdjęcia (jasność jak na stronie) */
      var cssW = rect[2] / DP, cssH = rect[3] / DP, area = cssW * cssH;
      var N = Math.round(Math.min(17000, Math.max(5000, area / (cssW > 600 ? 14 : 6.8))));
      var ar = cssW / cssH, gw = Math.max(8, Math.round(Math.sqrt(N * ar))), gh = Math.max(4, Math.round(N / gw));
      var sc = document.createElement('canvas'); sc.width = gw; sc.height = gh;
      var sx = sc.getContext('2d'); sx.drawImage(img, 0, 0, gw, gh);
      var px = sx.getImageData(0, 0, gw, gh).data;
      var PL = cssW > 600 ? 900 : 550;
      var data = new Float32Array((gw * gh + PL) * 8), o = 0, seed = 1;
      function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
      var rr = rad / DP, hw = cssW / 2, hh = cssH / 2;
      for (var y = 0; y < gh; y++) for (var x = 0; x < gw; x++) {
        var u = (x + .15 + rnd() * .7) / gw, v = (y + .15 + rnd() * .7) / gh;
        /* pomiń ziarna poza zaokrąglonymi rogami */
        var qx = Math.abs((u - .5) * cssW) - hw + rr, qy = Math.abs((v - .5) * cssH) - hh + rr;
        if (qx > 0 && qy > 0 && Math.sqrt(qx * qx + qy * qy) > rr) continue;
        var k = (y * gw + x) * 4, l = (px[k] * .299 + px[k + 1] * .587 + px[k + 2] * .114) / 255;
        l = Math.max(0, Math.min(1, ((l - .5) * bc[1] + .5) * bc[0]));
        data[o++] = u; data[o++] = v; data[o++] = l; data[o++] = sampleField(field, fw, fh, u, v);
        data[o++] = rnd(); data[o++] = rnd(); data[o++] = rnd(); data[o++] = rnd();
        nGrain++;
      }
      for (var j = 0; j < PL; j++) {                        // smuga z papierosa
        data[o++] = 0; data[o++] = 0; data[o++] = .9; data[o++] = -1;
        data[o++] = rnd(); data[o++] = rnd(); data[o++] = rnd(); data[o++] = rnd();
        nPlume++;
      }
      pBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pBuf); gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, o), gl.STATIC_DRAW);
      qBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    }

    function loc(p, names, fn) { names.forEach(function (n) { U[p === qProg ? 'q' + n : 'p' + n] = fn(p, n); }); }
    function draw(time) {
      var u = uniforms();
      gl.viewport(0, 0, cvW, cvH);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      /* zdjęcie z frontem erozji */
      gl.useProgram(qProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, qBuf);
      gl.enableVertexAttribArray(U.qaP); gl.vertexAttribPointer(U.qaP, 2, gl.FLOAT, false, 0, 0);
      gl.uniform4f(U.quRect, rect[0], rect[1], rect[2], rect[3]); gl.uniform2f(U.quCv, cvW, cvH);
      gl.uniform1f(U.quT, u.T); gl.uniform1f(U.quR, rad); gl.uniform1f(U.quF, FE); gl.uniform1f(U.quTime, time); gl.uniform1f(U.quClr, u.clr); gl.uniform2f(U.quSz, rect[2], rect[3]); gl.uniform2f(U.quBC, bc[0], bc[1]);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U.quTex, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ero); gl.uniform1i(U.quEro, 1);
      if (u.clr > .001) gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disableVertexAttribArray(U.qaP);
      /* ziarna i dym */
      gl.useProgram(pProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, pBuf);
      gl.enableVertexAttribArray(U.paO); gl.vertexAttribPointer(U.paO, 2, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(U.paLE); gl.vertexAttribPointer(U.paLE, 2, gl.FLOAT, false, 32, 8);
      gl.enableVertexAttribArray(U.paS); gl.vertexAttribPointer(U.paS, 4, gl.FLOAT, false, 32, 16);
      gl.uniform4f(U.puRect, rect[0], rect[1], rect[2], rect[3]); gl.uniform2f(U.puCv, cvW, cvH);
      gl.uniform2f(U.puTip, at[0], at[1]); gl.uniform1f(U.puT, u.T); gl.uniform1f(U.puF, FE); gl.uniform1f(U.puLife, LIFE);
      gl.uniform1f(U.puTime, time); gl.uniform1f(U.puS, K * DP); gl.uniform1f(U.puZ, Math.sqrt(K) * DP);
      gl.uniform1f(U.puPl, u.pl); gl.uniform1f(U.puClr, u.clr);
      var from = u.T + FE * .5 > 0 ? 0 : nGrain, count = nGrain + nPlume - from;
      if (u.pl <= .001) count -= nPlume;
      if (count > 0) gl.drawArrays(gl.POINTS, from, count);
      capMove();   // podpis zostaje w pełni czytelny — zdjęcia idą z dymem, słowa zostają i płyną na środek
    }
    function frame(now) {
      raf = 0;
      if (!ready) return;
      draw(now / 1000);
      if (vis && active && P > 0 && P < 1) raf = requestAnimationFrame(frame);
    }
    function kick() { if (ready && !raf && vis && active) raf = requestAnimationFrame(frame); }

    function initGL() {
      cv = document.createElement('canvas');
      cv.className = 'smoke-cv'; cv.setAttribute('aria-hidden', 'true');
      var opts = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' };
      gl = cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts);
      if (!gl) return false;
      try {
        qProg = glProgram(gl, VS_Q, FS_Q); pProg = glProgram(gl, VS_P, FS_P);
      } catch (e) { return false; }
      loc(qProg, ['aP'], function (p, n) { return gl.getAttribLocation(p, n); });
      loc(qProg, ['uRect', 'uCv', 'uTex', 'uEro', 'uT', 'uR', 'uF', 'uTime', 'uClr', 'uSz', 'uBC'], function (p, n) { return gl.getUniformLocation(p, n); });
      loc(pProg, ['aO', 'aLE', 'aS'], function (p, n) { return gl.getAttribLocation(p, n); });
      loc(pProg, ['uRect', 'uCv', 'uTip', 'uT', 'uF', 'uLife', 'uTime', 'uS', 'uZ', 'uPl', 'uClr'], function (p, n) { return gl.getUniformLocation(p, n); });
      el.appendChild(cv);
      /* jasność i kontrast jak w CSS zdjęcia (grayscale + contrast + brightness) */
      var f = getComputedStyle(img).filter || '', mc = /contrast\(([\d.]+)\)/.exec(f), mb = /brightness\(([\d.]+)\)/.exec(f);
      bc = [mb ? +mb[1] : 1, mc ? +mc[1] : 1];
      layout(); build();
      img.style.visibility = 'hidden';
      el.classList.add('smoke-live');
      ready = true;
      return true;
    }

    function progressFromPage() {
      if (ext) return;
      P = scroller ? SP.progress(scroller) : ss(.18, .82, viewP(el));
      if (!ready) { fade(); return; }
      kick(); if (!raf) draw(performance.now() / 1000);
    }
    el.__smoke = {
      set: function (p) { P = p < 0 ? 0 : p > 1 ? 1 : p; if (!ready) fade(); else { if (!raf) draw(performance.now() / 1000); kick(); } },
      active: function (on) { active = !!on; if (on) { vis = true; kick(); } }
    };
    function init() {
      if (SP.reduced || !initGL()) { ready = false; fade(); }
      watch(el, function (on) { if (!ext) vis = on; if (on) { progressFromPage(); kick(); } });
      SP.onScroll(progressFromPage);
      var rt; window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () {
          if (!ready) return;
          var oldW = rect[2]; layout();
          if (Math.abs(rect[2] - oldW) > 2) { nGrain = 0; nPlume = 0; build(); }
          draw(performance.now() / 1000);
        }, 160);
      });
    }
    function whenLoaded() {
      if (img.complete && img.naturalWidth) init();
      else img.addEventListener('load', init, { once: true });
    }
    /* obrazek leniwy: wczytaj z wyprzedzeniem, zanim scena się pokaże */
    if (img.loading === 'lazy') img.loading = 'eager';
    whenLoaded();
  }

  /* ---------------- głębia 2,5D: postać przesuwa się nieco szybciej niż tło ----------------
     [data-depth] > img.depth-bg (tło z uzupełnionym miejscem po postaci) + img.depth-fg (wycięta postać).
     Bez JS i przy ograniczonym ruchu obie warstwy leżą idealnie na sobie (= oryginalne zdjęcie). */
  function Depth(el) {
    var bg = el.querySelector('.depth-bg'), fg = el.querySelector('.depth-fg');
    if (!bg || !fg || SP.reduced) return;
    var vis = true, last = -1;
    function onScroll() {
      if (!vis) return;
      var r = el.getBoundingClientRect(), h = r.height || 1;
      /* 0 gdy zdjęcie w spoczynku (u góry strony lub pośrodku ekranu), 1 gdy odjeżdża w górę */
      var p = SP.clamp(-r.top / h, -.5, 1);
      if (Math.abs(p - last) < .0005) return; last = p;
      var yb = p * h * .05, yf = p * h * .028;
      bg.style.transform = 'translate3d(0,' + yb.toFixed(2) + 'px,0) scale(1.05)';
      fg.style.transform = 'translate3d(0,' + yf.toFixed(2) + 'px,0) scale(' + (1.05 + Math.max(0, p) * .018).toFixed(4) + ')';
    }
    watch(el, function (on) { vis = on; if (on) onScroll(); });
    SP.onScroll(onScroll);
  }

  function start() {
    document.querySelectorAll('[data-cutout]').forEach(Cutout);
    document.querySelectorAll('[data-smoke]').forEach(Smoke);
    document.querySelectorAll('[data-depth]').forEach(Depth);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
