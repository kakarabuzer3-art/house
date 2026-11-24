import { FLAGS_LAYER, MONASTERY_LAYERS, type ParallaxLayerId, type ParallaxLayerSpec } from './assets';

export const KEY_B = 0.42;
export const H0 = KEY_B;
export const H1 = 1 - KEY_B;
export const REDUCED_MOTION_PROGRESS = 0.42;
export const PROGRESS_EPSILON = 0.00001;

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Computes raw scroll progress p in [0, 1] and dead-zoned choreography
 * progress u = clamp((p - 0.03) / 0.94, 0, 1).
 */
export function computeProgress(
  scrollY: number,
  diveOffsetTop: number,
  diveHeight: number,
  viewportHeight: number,
): { p: number; u: number } {
  const travel = diveHeight - viewportHeight;
  const p = travel > 0 ? clamp((scrollY - diveOffsetTop) / travel, 0, 1) : 0;
  const u = progressToU(p);
  return { p, u };
}

export function progressToU(p: number): number {
  return clamp((p - 0.03) / 0.94, 0, 1);
}

/**
 * Monotone cubic Hermite spline through (0, A), (0.42, B), (1, C).
 * Endpoint tangents are 0 (rest-to-rest). The tangent at B is the weighted
 * harmonic mean of the two segment slopes when both slopes share a sign,
 * and 0 otherwise — guaranteeing C1 continuity and zero overshoot.
 */
export function spline(u: number, a: number, b: number, c: number): number {
  const x = clamp(u, 0, 1);
  const d0 = (b - a) / H0;
  const d1 = (c - b) / H1;

  let mB = 0;
  if (d0 * d1 > 0) {
    mB = (H0 + H1) / (H0 / d0 + H1 / d1);
  }

  if (x <= KEY_B) {
    const t = x / H0;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return h00 * a + h01 * b + h11 * H0 * mB;
  }

  const t = (x - KEY_B) / H1;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  return h00 * b + h10 * H1 * mB + h01 * c;
}

/**
 * Builds the dynamic soft bottom-fade mask (and optional stair band top edge).
 * At rest (y = 0), returns 'none' for full layers or only the top band feather.
 */
export function computeSoftBottomMask(
  y: number,
  fade?: number,
  fadeSpeed = 6,
  bandTop?: number,
): string | null {
  if (fade === undefined && bandTop === undefined) {
    return null;
  }

  const f = fade !== undefined ? fade * Math.min(1, Math.max(0, -y) * fadeSpeed) : 0;
  const hasBottomFade = f > 0.001;

  if (bandTop !== undefined) {
    const bandOpaque = Number((bandTop + 1.2).toFixed(2));
    if (!hasBottomFade) {
      return `linear-gradient(to bottom, transparent ${bandTop}%, #000 ${bandOpaque}%)`;
    }
    const bottomStart = Math.max(bandOpaque, 100 - f);
    return `linear-gradient(to bottom, transparent ${bandTop}%, #000 ${bandOpaque}%, #000 ${bottomStart.toFixed(2)}%, transparent 100%)`;
  }

  if (!hasBottomFade) {
    return 'none';
  }

  const bottomStart = Math.max(0, 100 - f);
  return `linear-gradient(to bottom, #000 0%, #000 ${bottomStart.toFixed(2)}%, transparent 100%)`;
}

/**
 * Computes the arch's bottom leg dissolve mask once scroll passes B (u > 0.42).
 */
export function computeArchBottomMask(u: number): string {
  if (u <= KEY_B) {
    return 'none';
  }
  const tC = clamp((u - KEY_B) / H1, 0, 1);
  const fb = 26 * clamp(tC / 0.35, 0, 1);
  if (fb <= 0.001) {
    return 'none';
  }
  const stop = (100 - fb).toFixed(2);
  return `linear-gradient(to bottom, #000 0%, #000 ${stop}%, transparent 100%)`;
}

export interface CaveMaskState {
  visible: boolean;
  seal: number;
  feather: number;
  start: number;
  mask: string;
}

/**
 * Computes the soft moving mask that reveals the cave exclusively under the
 * arch's opening line.
 */
export function computeCaveMask(ay: number, as: number): CaveMaskState {
  const seal = (1 + (0.6 - 1) * as + ay) * 100;
  const feather = 11 * as;
  const start = seal - feather;
  const visible = start < 100;
  const mask = visible
    ? `linear-gradient(to bottom, transparent ${start.toFixed(2)}%, #000 ${seal.toFixed(2)}%)`
    : 'none';
  return { visible, seal, feather, start, mask };
}

/**
 * Computes flags opacity: linear ramp 0 -> 1 between u = 0.55 and u = 0.90.
 */
export function computeFlagsOpacity(u: number): number {
  return clamp((u - 0.55) / (0.9 - 0.55), 0, 1);
}

/**
 * Computes vertical pan (in px) for wide viewports where the 16:9 frame is
 * taller than the viewport (spare = viewportHeight - frameHeight < 0).
 */
export function computeFramePan(
  u: number,
  viewportHeight: number,
  frameHeight: number,
): number {
  const spare = viewportHeight - frameHeight;
  if (spare >= 0) {
    return 0;
  }
  const k = spline(u, 0, 1, 1);
  const pan = spare * 0.6 * k;
  return pan === 0 ? 0 : pan;
}

export interface LayerTransformState {
  id: ParallaxLayerId;
  dxPercent: number;
  yPercent: number;
  transform: string;
  mask: string | null;
}

export interface SceneState {
  p: number;
  u: number;
  framePanPx: number;
  frameTransform: string;
  monasteryLayers: Record<Exclude<ParallaxLayerId, 'flags'>, LayerTransformState>;
  arch: {
    y: number;
    scale: number;
    transform: string;
    mask: string;
  };
  cave: CaveMaskState;
  caveIn: {
    y: number;
    scale: number;
    transform: string;
  };
  flags: {
    y: number;
    opacity: number;
    transform: string;
  };
}

function evaluateLayer(spec: ParallaxLayerSpec, u: number): LayerTransformState {
  const y = spline(u, spec.yA, spec.yB, spec.yC);
  const dxPercent = Math.round((spec.dx ?? 0) * 10000) / 100;
  const yPercent = y === 0 ? 0 : y * 100;
  const transform = `translate3d(${dxPercent.toFixed(4)}%, ${yPercent.toFixed(4)}%, 0)`;
  const mask = computeSoftBottomMask(y, spec.fade, spec.fadeSpeed ?? 6, spec.bandTop);
  return { id: spec.id, dxPercent, yPercent, transform, mask };
}

export function computeSceneState(
  p: number,
  viewportHeight: number,
  frameHeight: number,
): SceneState {
  const clampedP = clamp(p, 0, 1);
  const u = progressToU(clampedP);

  const framePanPx = computeFramePan(u, viewportHeight, frameHeight);
  const frameTransform = `translate3d(-50%, ${framePanPx.toFixed(2)}px, 0)`;

  const monasteryLayers = {} as Record<
    Exclude<ParallaxLayerId, 'flags'>,
    LayerTransformState
  >;
  for (const spec of MONASTERY_LAYERS) {
    monasteryLayers[spec.id as Exclude<ParallaxLayerId, 'flags'>] = evaluateLayer(spec, u);
  }

  const ay = spline(u, 1.0, 0.16, -0.07);
  const as = spline(u, 1, 1, 1.75);
  const arch = {
    y: ay,
    scale: as,
    transform: `translate3d(0, ${(ay * 100).toFixed(4)}%, 0) scale(${as.toFixed(5)})`,
    mask: computeArchBottomMask(u),
  };

  const cave = computeCaveMask(ay, as);

  const cy = spline(u, 0.22, 0.2, 0);
  const cs = spline(u, 0.8, 0.8, 1);
  const caveIn = {
    y: cy,
    scale: cs,
    transform: `translate3d(0, ${(cy * 100).toFixed(4)}%, 0) scale(${cs.toFixed(5)})`,
  };

  const fy = spline(u, FLAGS_LAYER.yA, FLAGS_LAYER.yB, FLAGS_LAYER.yC);
  const flagsOpacity = computeFlagsOpacity(u);
  const flags = {
    y: fy,
    opacity: flagsOpacity,
    transform: `translate3d(0, ${(fy * 100).toFixed(4)}%, 0)`,
  };

  return {
    p: clampedP,
    u,
    framePanPx,
    frameTransform,
    monasteryLayers,
    arch,
    cave,
    caveIn,
    flags,
  };
}
