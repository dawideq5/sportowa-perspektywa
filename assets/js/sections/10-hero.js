/* 10 hero: światło wychodzi z czołówki Andrzeja.
   Stożek z diody na zdjęciu obraca się w stronę wskaźnika (bez wskaźnika spoczywa na twarzy, bez pętli bezczynności),
   odsłania zdjęcie w kolorze tam, gdzie pada; twarz zawsze lekko oświetla rozproszone światło lampy. */
(function () {
  'use strict';
  var hero = document.getElementById('start'), media = document.getElementById('heroMedia');
  if (!hero || !media || !window.SP) return;
  var img = media.querySelector('.hero-lit');
  if (!img) return;

  /* punkty na zdjęciu (ułamki wymiarów 1600×1066): główna dioda czołówki i środek twarzy */
  var LAMP = [945 / 1600, 361 / 1066], FACE = [930 / 1600, 515 / 1066], POS = [.55, .35]; // object-position z CSS

  var canvas = document.createElement('canvas');
  canvas.className = 'hero-gl';
  canvas.setAttribute('aria-hidden', 'true');
  var gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false }) ||
           canvas.getContext('experimental-webgl');
  if (!gl) return;   // bez WebGL zostaje statyczne, miękkie światło z CSS

  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = [
    'precision highp float;',
    'uniform sampler2D uTex;uniform vec2 uRes;uniform vec4 uMap;uniform vec2 uLamp;uniform vec2 uFace;',
    'uniform float uAng;uniform float uSpread;uniform float uLen;uniform float uS;uniform float uT;uniform float uOn;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
    'void main(){',
    '  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);',
    '  vec2 uv=clamp((p-uMap.xy)/uMap.zw,0.,1.);',
    '  vec3 tx=texture2D(uTex,uv).rgb;',
    '  float l=dot(tx,vec3(.299,.587,.114));',
    '  vec3 dark=mix(vec3(l),tx,.4)*.19;',
    '  vec2 v=p-uLamp;float d=length(v);',
    '  vec2 dir=vec2(cos(uAng),sin(uAng));',
    '  float al=dot(v,dir);float ac=abs(dir.x*v.y-dir.y*v.x);',
    '  float an=atan(ac,max(al,.001));',
    '  float cone=exp(-pow(an/uSpread,2.)*1.7)*smoothstep(-.02*uS,.02*uS,al);',
    '  float fall=1./(1.+pow(d/(uLen*.34),2.));',
    '  fall*=1.-smoothstep(uLen*.5,uLen*1.05,d);',
    '  float beam=cone*fall*mix(.55,1.,smoothstep(0.,uS*.035,d))*uOn;',
    '  float spill=exp(-pow(d/(uS*.13),2.))*.5;',
    '  vec2 fv=(p-uFace)/vec2(uS*.14,uS*.2);',
    '  float face=exp(-dot(fv,fv))*.46;',
    '  float lt=clamp(beam*1.2+spill+face,0.,1.);',
    '  vec3 warm=vec3(1.,.955,.885);',
    '  vec3 lit=tx*warm*(.92+.22*beam);',
    '  vec3 c=mix(dark,lit,lt);',
    '  c+=warm*beam*.028;',
    '  float g1=exp(-pow(d/(uS*.0075),2.)),g2=exp(-pow(d/(uS*.04),2.));',
    '  c+=warm*(g1*.5+g2*.07);',
    '  c+=(h(p+uT)-.5)*(1.6/255.);',
    '  gl_FragColor=vec4(c,1.);',
    '}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { return; }
  gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var aLoc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ['uTex', 'uRes', 'uMap', 'uLamp', 'uFace', 'uAng', 'uSpread', 'uLen', 'uS', 'uT', 'uOn'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  var tex = gl.createTexture(), ready = false;
  function upload() {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); } catch (e) { return; }
    ready = true;
    media.insertBefore(canvas, media.querySelector('.hero-shade'));
    media.classList.add('gl-on');
    measure();
    kick();
  }

  /* geometria: ekran ↔ zdjęcie (object-fit: cover + object-position) */
  var W = 0, H = 0, dpr = 1, lamp = [0, 0], face = [0, 0], S = 1, mobile = false;
  function measure() {
    var r = media.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var iw = img.naturalWidth || 1600, ih = img.naturalHeight || 1066, s = Math.max(W / iw, H / ih);
    var dw = iw * s, dh = ih * s, ox = (W - dw) * POS[0], oy = (H - dh) * POS[1];
    lamp = [ox + dw * LAMP[0], oy + dh * LAMP[1]];
    face = [ox + dw * FACE[0], oy + dh * FACE[1]];
    S = dh;                         // skala: wysokość zdjęcia na ekranie
    mobile = W < 700;
    if (!ready) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform4f(U.uMap, ox * dpr, oy * dpr, dw * dpr, dh * dpr);
    gl.uniform2f(U.uLamp, lamp[0] * dpr, lamp[1] * dpr);
    gl.uniform2f(U.uFace, face[0] * dpr, face[1] * dpr);
    gl.uniform1f(U.uS, S * dpr);
    gl.uniform1f(U.uLen, Math.max(W, H) * 1.15 * dpr);
    gl.uniform1f(U.uSpread, mobile ? .34 : .29);
    gl.uniform1i(U.uTex, 0);
    if (SP.reduced) draw(0);
  }

  /* kąt snopa: 0 = w prawo, π/2 = w dół; bez świecenia w niebo (zakres ciągły LO..HI) */
  var LO = -.35, HI = Math.PI + .35, REST = 2.25;
  function clampAng(a) {
    if (a >= LO) return Math.min(a, HI);
    var b = a + Math.PI * 2;
    if (b <= HI) return b;
    return (b - HI) < (Math.PI * 2 + LO - b) ? HI : LO;
  }
  var cur = REST, tgt = REST, on = 0, lastAim = -1e9, last = 0, running = false, visible = true, hasHover = window.matchMedia && matchMedia('(hover: hover)').matches;

  function draw(t) {
    gl.uniform1f(U.uAng, cur);
    gl.uniform1f(U.uOn, SP.reduced ? 1 : on);
    gl.uniform1f(U.uT, (t % 1000) * .001);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function loop(t) {
    if (!visible || SP.reduced) { running = false; return; }
    var dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
    cur += (tgt - cur) * (1 - Math.exp(-dt * 5.2));
    on += (1 - on) * (1 - Math.exp(-dt * 1.6));          // czołówka rozpala się po wejściu
    if (Math.abs(tgt - cur) < .0008 && on > .998) {       // spoczynek: jedna klatka i koniec pętli
      cur = tgt; on = 1; draw(t); running = false; return;
    }
    draw(t);
    requestAnimationFrame(loop);
  }
  function kick() { if (!running && ready && !SP.reduced) { running = true; last = 0; requestAnimationFrame(loop); } }
  function aim(e) {
    var r = media.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    var dx = x - lamp[0], dy = y - lamp[1];
    if (dx * dx + dy * dy < 900) return;
    tgt = clampAng(Math.atan2(dy, dx));
    lastAim = performance.now();
    kick();
  }

  if (img.complete && img.naturalWidth) upload(); else img.addEventListener('load', upload);
  window.addEventListener('resize', function () { measure(); if (SP.reduced && ready) draw(0); });
  hero.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || e.pointerType === 'pen') aim(e); });
  hero.addEventListener('pointerdown', aim);
  /* dotyk: pointerleave przychodzi zaraz po puszczeniu palca — snop zostaje tam, gdzie wskazano */
  hero.addEventListener('pointerleave', function (e) { if (e.pointerType === 'touch') return; lastAim = -1e9; tgt = REST; kick(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(hero);
  }
})();
