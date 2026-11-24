import { useCallback, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import {
  ASSET_URLS,
  FLAGS_LAYER,
  MONASTERY_LAYERS,
  type ParallaxLayerId,
} from '../lib/assets';
import {
  PROGRESS_EPSILON,
  REDUCED_MOTION_PROGRESS,
  computeProgress,
  computeSceneState,
} from '../lib/choreography';
import { Navigation } from './Navigation';

function setMask(el: HTMLElement | null, mask: string | null) {
  if (!el || mask === null) return;
  el.style.maskImage = mask;
  el.style.webkitMaskImage = mask;
}

export function ScrollDiveHero() {
  const diveRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const caveRef = useRef<HTMLDivElement | null>(null);
  const caveInRef = useRef<HTMLDivElement | null>(null);
  const archRef = useRef<HTMLImageElement | null>(null);
  const flagsRef = useRef<HTMLImageElement | null>(null);
  const lakeRef = useRef<HTMLImageElement | null>(null);
  const wallsRef = useRef<HTMLImageElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  const monasteryRefs = useRef<
    Partial<Record<Exclude<ParallaxLayerId, 'flags'>, HTMLImageElement | null>>
  >({});

  const handleHomeClick = useCallback(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: false });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  useEffect(() => {
    const diveEl = diveRef.current;
    const frameEl = frameRef.current;
    const caveEl = caveRef.current;
    const caveInEl = caveInRef.current;
    const archEl = archRef.current;
    const flagsEl = flagsRef.current;

    if (!diveEl || !frameEl || !caveEl || !caveInEl || !archEl || !flagsEl) {
      return;
    }

    const renderScene = (p: number) => {
      const viewportHeight = window.innerHeight;
      const frameHeight = frameEl.offsetHeight || viewportHeight;
      const state = computeSceneState(p, viewportHeight, frameHeight);

      diveEl.dataset.progress = state.p.toFixed(5);
      frameEl.style.transform = state.frameTransform;

      for (const spec of MONASTERY_LAYERS) {
        const key = spec.id as Exclude<ParallaxLayerId, 'flags'>;
        const el = monasteryRefs.current[key];
        if (!el) continue;
        const layerState = state.monasteryLayers[key];
        el.style.transform = layerState.transform;
        setMask(el, layerState.mask);
      }

      archEl.style.transform = state.arch.transform;
      setMask(archEl, state.arch.mask);

      caveEl.style.visibility = state.cave.visible ? 'visible' : 'hidden';
      setMask(caveEl, state.cave.mask);

      caveInEl.style.transform = state.caveIn.transform;

      flagsEl.style.transform = state.flags.transform;
      flagsEl.style.opacity = state.flags.opacity.toFixed(4);
    };

    // Wait for all 19 images to decode, or 5s failsafe, then add "ready" to <html>.
    const allImages = Array.from(
      frameEl.querySelectorAll<HTMLImageElement>('img.layer'),
    );
    let readyApplied = false;
    let disposed = false;
    const markReady = () => {
      if (readyApplied) return;
      readyApplied = true;
      document.documentElement.classList.add('ready');
    };

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isReducedMotion = reducedMotionQuery.matches;

    const failsafeTimer = window.setTimeout(markReady, 5000);
    Promise.all(
      allImages.map((img) => {
        if (img.complete && img.naturalWidth > 0) {
          return typeof img.decode === 'function'
            ? img.decode().catch(() => {})
            : Promise.resolve();
        }
        return new Promise<void>((resolve) => {
          const done = () => {
            if (typeof img.decode === 'function') {
              img.decode().catch(() => {}).finally(resolve);
            } else {
              resolve();
            }
          };
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        });
      }),
    ).then(() => {
      if (disposed) return;
      window.clearTimeout(failsafeTimer);
      diveEl.dataset.decoded = 'true';
      markReady();
      if (isReducedMotion) {
        window.requestAnimationFrame(() => {
          if (!disposed) renderScene(REDUCED_MOTION_PROGRESS);
        });
      }
    });

    if (isReducedMotion) {
      markReady();
      renderScene(REDUCED_MOTION_PROGRESS);
      let resizeRaf = 0;
      const onResizeReduced = () => {
        window.cancelAnimationFrame(resizeRaf);
        resizeRaf = window.requestAnimationFrame(() => {
          renderScene(REDUCED_MOTION_PROGRESS);
        });
      };
      window.addEventListener('resize', onResizeReduced, { passive: true });
      return () => {
        disposed = true;
        window.clearTimeout(failsafeTimer);
        window.cancelAnimationFrame(resizeRaf);
        window.removeEventListener('resize', onResizeReduced);
      };
    }

    // Standard motion path: Lenis 1.1.13 driven by our own rAF loop.
    const lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.9,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    // Render once at p = 0 before the first frame.
    let lastP = 0;
    renderScene(0);

    let rafId = 0;
    const tick = (now: number) => {
      lenis.raf(now);
      const currentScroll = lenis.scroll;
      const { p } = computeProgress(
        currentScroll,
        diveEl.offsetTop,
        diveEl.offsetHeight,
        window.innerHeight,
      );
      if (Math.abs(p - lastP) > PROGRESS_EPSILON) {
        lastP = p;
        renderScene(p);
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    let resizeRaf = 0;
    const onResize = () => {
      lenis.resize();
      window.cancelAnimationFrame(resizeRaf);
      resizeRaf = window.requestAnimationFrame(() => {
        const { p } = computeProgress(
          lenis.scroll,
          diveEl.offsetTop,
          diveEl.offsetHeight,
          window.innerHeight,
        );
        lastP = p;
        renderScene(p);
      });
    };
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      disposed = true;
      window.clearTimeout(failsafeTimer);
      window.cancelAnimationFrame(rafId);
      window.cancelAnimationFrame(resizeRaf);
      window.removeEventListener('resize', onResize);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return (
    <main className="dive" id="dive" ref={diveRef} data-testid="scroll-dive">
      <div className="stage">
        <div className="card" id="card">
          <div className="frame" id="frame" ref={frameRef}>
            {MONASTERY_LAYERS.map((layer) => {
              const halfClass =
                layer.half === 'left'
                  ? ' layer-half-left'
                  : layer.half === 'right'
                    ? ' layer-half-right'
                    : '';
              const extraClass = layer.extraClass ? ` ${layer.extraClass}` : '';
              return (
                <img
                  key={layer.id}
                  ref={(el) => {
                    monasteryRefs.current[
                      layer.id as Exclude<ParallaxLayerId, 'flags'>
                    ] = el;
                  }}
                  src={ASSET_URLS[layer.assetKey]}
                  alt=""
                  decoding="async"
                  draggable={false}
                  referrerPolicy="no-referrer"
                  className={`layer${halfClass}${extraClass}`}
                  data-layer={layer.id}
                />
              );
            })}

            <div className="cave" ref={caveRef} data-testid="cave">
              <div className="cave-in" ref={caveInRef} data-testid="cave-in">
                <img
                  ref={lakeRef}
                  src={ASSET_URLS.lake}
                  alt=""
                  decoding="async"
                  draggable={false}
                  referrerPolicy="no-referrer"
                  className="layer"
                  data-layer="lake"
                />
              </div>
              <img
                ref={wallsRef}
                src={ASSET_URLS.walls}
                alt=""
                decoding="async"
                draggable={false}
                referrerPolicy="no-referrer"
                className="layer"
                data-layer="walls"
              />
            </div>

            <img
              ref={archRef}
              src={ASSET_URLS.arch}
              alt=""
              decoding="async"
              draggable={false}
              referrerPolicy="no-referrer"
              className="layer layer-arch"
              data-layer="arch"
            />

            <img
              ref={flagsRef}
              src={ASSET_URLS[FLAGS_LAYER.assetKey]}
              alt=""
              decoding="async"
              draggable={false}
              referrerPolicy="no-referrer"
              className={`layer ${FLAGS_LAYER.extraClass}`}
              data-layer="flags"
            />
          </div>

          <Navigation onHomeClick={handleHomeClick} />
        </div>
      </div>
    </main>
  );
}
