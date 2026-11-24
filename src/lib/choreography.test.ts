import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSET_URLS,
  MONASTERY_LAYERS,
  TOTAL_IMAGE_LAYER_COUNT,
} from './assets';
import {
  KEY_B,
  computeArchBottomMask,
  computeCaveMask,
  computeFlagsOpacity,
  computeFramePan,
  computeProgress,
  computeSceneState,
  computeSoftBottomMask,
  progressToU,
  spline,
} from './choreography';

test('assets define all 13 proxied URLs and 19 total image layers', () => {
  assert.equal(Object.keys(ASSET_URLS).length, 13);
  assert.equal(TOTAL_IMAGE_LAYER_COUNT, 19);
  assert.equal(MONASTERY_LAYERS.length, 15);

  assert.equal(
    ASSET_URLS.sky,
    'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261124_032051_b03be317-55bc-49c0-9643-583fc5604213.png&w=2688&q=85',
  );
  assert.equal(
    ASSET_URLS.arch,
    'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261124_025152_784dec8b-ad51-476d-9e19-dbca11ca8d01.png&w=2688&q=85',
  );
  assert.equal(
    ASSET_URLS.flags,
    'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261124_032437_291e3d42-e769-437c-abcf-ecf2965a8feb.png&w=2688&q=85',
  );
});

test('scroll progress maps p with top/bottom dead zones into u', () => {
  assert.deepEqual(computeProgress(0, 0, 4200, 1000), { p: 0, u: 0 });
  assert.equal(progressToU(0.03), 0);
  assert.equal(progressToU(0.02), 0);
  assert.equal(progressToU(0.97), 1);
  assert.equal(progressToU(1), 1);

  const mid = computeProgress(1600, 0, 4200, 1000);
  assert.ok(Math.abs(mid.p - 0.5) < 1e-9);
  assert.ok(Math.abs(mid.u - 0.5) < 1e-9);

  // Zero or negative travel height safely returns p=0
  assert.deepEqual(computeProgress(100, 0, 900, 900), { p: 0, u: 0 });
});

test('monotone cubic Hermite spline hits A, B, C exactly, is C1 at B, and never overshoots', () => {
  const triples: Array<[number, number, number]> = [
    [0, 0, -0.12],
    [0, -0.15, -0.6],
    [0, -0.36, -1.2],
    [1.0, 0.16, -0.07],
    [1, 1, 1.75],
    [0.22, 0.2, 0],
    [0.8, 0.8, 1],
    [0.14, 0.14, 0],
    [0, 1, 1],
  ];

  for (const [a, b, c] of triples) {
    assert.ok(Math.abs(spline(0, a, b, c) - a) < 1e-12);
    assert.ok(Math.abs(spline(KEY_B, a, b, c) - b) < 1e-12);
    assert.ok(Math.abs(spline(1, a, b, c) - c) < 1e-12);

    // Check C1 continuity at KEY_B
    const eps = 1e-6;
    const slopeLeft = (spline(KEY_B, a, b, c) - spline(KEY_B - eps, a, b, c)) / eps;
    const slopeRight = (spline(KEY_B + eps, a, b, c) - spline(KEY_B, a, b, c)) / eps;
    assert.ok(
      Math.abs(slopeLeft - slopeRight) < 1e-3,
      `C1 mismatch for [${a}, ${b}, ${c}]: left=${slopeLeft}, right=${slopeRight}`,
    );

    // Check monotonicity & zero overshoot across 200 samples
    const minAB = Math.min(a, b);
    const maxAB = Math.max(a, b);
    const minBC = Math.min(b, c);
    const maxBC = Math.max(b, c);
    for (let i = 0; i <= 200; i++) {
      const u = i / 200;
      const val = spline(u, a, b, c);
      if (u <= KEY_B) {
        assert.ok(val >= minAB - 1e-12 && val <= maxAB + 1e-12);
      } else {
        assert.ok(val >= minBC - 1e-12 && val <= maxBC + 1e-12);
      }
    }
  }
});

test('soft bottom fade masks stay untouched at rest and dissolve bottom edge when lifting', () => {
  assert.equal(computeSoftBottomMask(0, 10, 6), 'none');
  assert.equal(
    computeSoftBottomMask(0, 5, 40, 66),
    'linear-gradient(to bottom, transparent 66%, #000 67.2%)',
  );
  assert.equal(
    computeSoftBottomMask(-0.5, 10, 6),
    'linear-gradient(to bottom, #000 0%, #000 90.00%, transparent 100%)',
  );
  assert.equal(
    computeSoftBottomMask(-0.2, 5, 40, 66),
    'linear-gradient(to bottom, transparent 66%, #000 67.2%, #000 95.00%, transparent 100%)',
  );
});

test('arch bottom fade activates only past B and reaches 26% fade', () => {
  assert.equal(computeArchBottomMask(0), 'none');
  assert.equal(computeArchBottomMask(KEY_B), 'none');
  assert.equal(
    computeArchBottomMask(1),
    'linear-gradient(to bottom, #000 0%, #000 74.00%, transparent 100%)',
  );
});

test('cave mask hides cave at A, frames opening at B, and opens wide at C', () => {
  const atA = computeCaveMask(1.0, 1);
  assert.equal(atA.visible, false);
  assert.ok(atA.start >= 100);

  const atB = computeCaveMask(0.16, 1);
  assert.equal(atB.visible, true);
  assert.ok(Math.abs(atB.seal - 76) < 1e-9);
  assert.ok(Math.abs(atB.feather - 11) < 1e-9);
  assert.ok(Math.abs(atB.start - 65) < 1e-9);

  const atC = computeCaveMask(-0.07, 1.75);
  assert.equal(atC.visible, true);
  assert.ok(Math.abs(atC.seal - 23) < 1e-9);
  assert.ok(Math.abs(atC.feather - 19.25) < 1e-9);
  assert.ok(Math.abs(atC.start - 3.75) < 1e-9);
});

test('flags opacity ramps linearly between u=0.55 and u=0.90', () => {
  assert.equal(computeFlagsOpacity(0), 0);
  assert.equal(computeFlagsOpacity(0.55), 0);
  assert.ok(Math.abs(computeFlagsOpacity(0.725) - 0.5) < 1e-9);
  assert.equal(computeFlagsOpacity(0.9), 1);
  assert.equal(computeFlagsOpacity(1), 1);
});

test('frame pan activates only when frame is taller than viewport and holds from B to C', () => {
  // Tall/portrait screen: frameHeight === viewportHeight => no pan
  assert.equal(computeFramePan(0.42, 844, 844), 0);
  assert.equal(computeFramePan(1, 844, 844), 0);

  // Ultra-wide screen: 1920x900 => frameHeight = 1080, spare = -180
  assert.equal(computeFramePan(0, 900, 1080), 0);
  assert.ok(Math.abs(computeFramePan(0.42, 900, 1080) - -108) < 1e-9);
  assert.ok(Math.abs(computeFramePan(1, 900, 1080) - -108) < 1e-9);
});

test('scene state is completely deterministic and reversible', () => {
  const s0 = computeSceneState(0, 900, 1080);
  const sMid = computeSceneState(0.5, 900, 1080);
  const s1 = computeSceneState(1, 900, 1080);
  const sBack = computeSceneState(0, 900, 1080);

  assert.deepEqual(s0, sBack);
  assert.equal(s0.cave.visible, false);
  assert.equal(sMid.cave.visible, true);
  assert.equal(s1.arch.scale, 1.75);
  assert.equal(s1.flags.opacity, 1);
  assert.equal(s1.monasteryLayers['near-left'].dxPercent, -6);
  assert.equal(s1.monasteryLayers['near-right'].dxPercent, 6);
  assert.equal(s1.monasteryLayers['larch-left'].dxPercent, -7);
  assert.equal(s1.monasteryLayers['mid-right'].dxPercent, 5);
});
