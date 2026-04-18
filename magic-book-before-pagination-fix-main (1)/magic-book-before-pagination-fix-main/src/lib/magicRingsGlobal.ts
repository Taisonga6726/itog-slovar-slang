/**
 * Адаптация MagicRings из SLOVAR_02 (vanilla JS + WebGL2): полноэкранный слой за контентом.
 */

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function initGlobalMagicRings(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  options?: { burstImpulse?: number }
): () => void {
  const burstImpulse = typeof options?.burstImpulse === "number" ? options.burstImpulse : 1.45;
  const globalViewport = true;

  if (prefersReducedMotion()) {
    container.setAttribute("hidden", "");
    return () => {};
  }

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  });
  if (!gl) {
    container.setAttribute("hidden", "");
    return () => {};
  }

  const props = {
    color: "#fc42ff",
    colorTwo: "#42fcff",
    ringCount: 6,
    speed: 0.38,
    attenuation: 10,
    lineThickness: 2,
    baseRadius: 0.35,
    radiusStep: 0.1,
    scaleRate: 0.07,
    opacity: 1,
    noiseAmount: 0.035,
    rotation: 0,
    ringGap: 1.5,
    fadeIn: 0.7,
    fadeOut: 0.5,
    followMouse: true,
    mouseInfluence: 0.2,
    hoverScale: 1.2,
    parallax: 0.05,
    clickBurst: true,
  };

  const vertexShaderSource = `#version 300 es
precision highp float;
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

  const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;

uniform float uTime, uAttenuation, uLineThickness;
uniform float uBaseRadius, uRadiusStep, uScaleRate;
uniform float uOpacity, uNoiseAmount, uRotation, uRingGap;
uniform float uFadeIn, uFadeOut;
uniform float uMouseInfluence, uHoverAmount, uHoverScale, uParallax, uBurst;
uniform vec2 uResolution, uMouse;
uniform vec3 uColor, uColorTwo;
uniform int uRingCount;

const float HP = 1.5707963;
const float CYCLE = 3.45;

float fadeAnim(float t) {
  return t < uFadeIn ? smoothstep(0.0, uFadeIn, t) : 1.0 - smoothstep(uFadeOut, CYCLE - 0.2, t);
}

float ring(vec2 p, float ri, float cut, float t0, float px) {
  float t = mod(uTime + t0, CYCLE);
  float r = ri + t / CYCLE * uScaleRate;
  float d = abs(length(p) - r);
  float a = atan(abs(p.y), abs(p.x)) / HP;
  float th = max(1.0 - a, 0.5) * px * uLineThickness;
  float h = (1.0 - smoothstep(th, th * 1.5, d)) + 1.0;
  d += pow(cut * a, 3.0) * r;
  return h * exp(-uAttenuation * d) * fadeAnim(t);
}

void main() {
  float px = 1.0 / min(uResolution.x, uResolution.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) * px;
  float cr = cos(uRotation), sr = sin(uRotation);
  p = mat2(cr, -sr, sr, cr) * p;
  p -= uMouse * uMouseInfluence;
  float sc = mix(1.0, uHoverScale, uHoverAmount) + uBurst * 0.3;
  p /= sc;
  vec3 c = vec3(0.0);
  float rcf = max(float(uRingCount) - 1.0, 1.0);
  for (int i = 0; i < 10; i++) {
    if (i >= uRingCount) break;
    float fi = float(i);
    vec2 pr = p - fi * uParallax * uMouse;
    vec3 rc = mix(uColor, uColorTwo, fi / rcf);
    float rv = ring(pr, uBaseRadius + fi * uRadiusStep, pow(uRingGap, fi), i == 0 ? 0.0 : 2.95 * fi, px);
    c = mix(c, rc, vec3(rv));
  }
  c *= 1.0 + uBurst * 2.0;
  float n = fract(sin(dot(gl_FragCoord.xy + uTime * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) * uNoiseAmount;
  O = vec4(c, max(c.r, max(c.g, c.b)) * uOpacity);
}`;

  function compile(type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = compile(gl.VERTEX_SHADER, vertexShaderSource);
  const fs = compile(gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    container.setAttribute("hidden", "");
    return () => {};
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    container.setAttribute("hidden", "");
    return () => {};
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    container.setAttribute("hidden", "");
    return () => {};
  }
  gl.useProgram(program);

  const pos = gl.getAttribLocation(program, "position");
  const vbo = gl.createBuffer();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  function u(name: string) {
    return gl.getUniformLocation(program, name);
  }

  const uniforms = {
    time: u("uTime"),
    attenuation: u("uAttenuation"),
    lineThickness: u("uLineThickness"),
    baseRadius: u("uBaseRadius"),
    radiusStep: u("uRadiusStep"),
    scaleRate: u("uScaleRate"),
    opacity: u("uOpacity"),
    noiseAmount: u("uNoiseAmount"),
    rotation: u("uRotation"),
    ringGap: u("uRingGap"),
    fadeIn: u("uFadeIn"),
    fadeOut: u("uFadeOut"),
    mouseInfluence: u("uMouseInfluence"),
    hoverAmount: u("uHoverAmount"),
    hoverScale: u("uHoverScale"),
    parallax: u("uParallax"),
    burst: u("uBurst"),
    resolution: u("uResolution"),
    mouse: u("uMouse"),
    color: u("uColor"),
    colorTwo: u("uColorTwo"),
    ringCount: u("uRingCount"),
  };

  function hexToRgb(hex: string): [number, number, number] {
    const value = String(hex || "")
      .trim()
      .replace("#", "");
    const full = value.length === 3 ? value.split("").map((ch) => ch + ch).join("") : value;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return [1, 1, 1];
    return [
      parseInt(full.slice(0, 2), 16) / 255,
      parseInt(full.slice(2, 4), 16) / 255,
      parseInt(full.slice(4, 6), 16) / 255,
    ];
  }

  const colorA = hexToRgb(props.color);
  const colorB = hexToRgb(props.colorTwo);
  const mouse = [0, 0];
  const smoothMouse = [0, 0];
  let hover = 0;
  let isHovered = false;
  let burst = 0;
  let raf = 0;

  function getStageRect() {
    if (globalViewport) {
      return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }
    return container.getBoundingClientRect();
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    gl.viewport(0, 0, w, h);
  }

  function onMouseMove(e: MouseEvent) {
    const r = getStageRect();
    mouse[0] = (e.clientX - r.left) / r.width - 0.5;
    mouse[1] = -((e.clientY - r.top) / r.height - 0.5);
  }

  function onPointerDown() {
    if (props.clickBurst) burst = burstImpulse;
  }

  window.addEventListener("mousemove", onMouseMove, { passive: true });
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(resize);
    ro.observe(container);
  }
  resize();

  function draw(now: number) {
    raf = requestAnimationFrame(draw);

    if (globalViewport) {
      isHovered = true;
    }

    smoothMouse[0] += (mouse[0] - smoothMouse[0]) * 0.045;
    smoothMouse[1] += (mouse[1] - smoothMouse[1]) * 0.045;
    hover += ((isHovered ? 1 : 0) - hover) * 0.05;
    burst *= globalViewport ? 0.92 : 0.95;
    if (burst < 0.001) burst = 0;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.uniform1f(uniforms.time, now * 0.001 * props.speed);
    gl.uniform1f(uniforms.attenuation, props.attenuation);
    gl.uniform1f(uniforms.lineThickness, props.lineThickness);
    gl.uniform1f(uniforms.baseRadius, props.baseRadius);
    gl.uniform1f(uniforms.radiusStep, props.radiusStep);
    gl.uniform1f(uniforms.scaleRate, props.scaleRate);
    gl.uniform1f(uniforms.opacity, props.opacity);
    gl.uniform1f(uniforms.noiseAmount, props.noiseAmount);
    gl.uniform1f(uniforms.rotation, (props.rotation * Math.PI) / 180);
    gl.uniform1f(uniforms.ringGap, props.ringGap);
    gl.uniform1f(uniforms.fadeIn, props.fadeIn);
    gl.uniform1f(uniforms.fadeOut, props.fadeOut);
    gl.uniform1f(uniforms.mouseInfluence, props.followMouse ? props.mouseInfluence : 0);
    gl.uniform1f(uniforms.hoverAmount, hover);
    gl.uniform1f(uniforms.hoverScale, props.hoverScale);
    gl.uniform1f(uniforms.parallax, props.parallax);
    const burstUniform = props.clickBurst ? burst * (globalViewport ? 1.15 : 1) : 0;
    gl.uniform1f(uniforms.burst, burstUniform);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.mouse, smoothMouse[0], smoothMouse[1]);
    gl.uniform3f(uniforms.color, colorA[0], colorA[1], colorA[2]);
    gl.uniform3f(uniforms.colorTwo, colorB[0], colorB[1], colorB[2]);
    gl.uniform1i(uniforms.ringCount, Math.max(1, Math.min(10, props.ringCount)));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  raf = requestAnimationFrame(draw);

  return function dispose() {
    cancelAnimationFrame(raf);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("resize", resize);
    if (ro) ro.disconnect();
    gl.deleteBuffer(vbo);
    gl.deleteVertexArray(vao);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
  };
}
