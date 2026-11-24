const SOURCE_BASE =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/';

export function buildProxyUrl(filename: string): string {
  const sourceUrl = `${SOURCE_BASE}${filename}`;
  return `https://images.higgs.ai/?default=1&output=webp&url=${encodeURIComponent(sourceUrl)}&w=2688&q=85`;
}

export const ASSET_FILENAMES = {
  sky: 'hf_20261124_032051_b03be317-55bc-49c0-9643-583fc5604213.png',
  side: 'hf_20261124_032150_6a19ddba-1bad-419f-9e29-dca0828c11eb.png',
  stairs: 'hf_20261124_050711_a8f1e754-6cb0-4763-b6a4-e7acd19f6d16.png',
  hall: 'hf_20261124_032131_a39a98b6-be3d-473c-a0a1-5ad2850557e7.png',
  people: 'hf_20261124_050913_015b6505-badf-4834-b44e-dca4af03c966.png',
  larch: 'hf_20261124_032234_5b1a89ba-826e-4bdd-9416-0faf5b650f82.png',
  pav: 'hf_20261124_032301_6b8aa813-522f-412c-b90d-0bfaf40c7590.png',
  mid: 'hf_20261124_032324_f9cb6fb0-9f9d-4f42-adcb-cfeae0e153da.png',
  near: 'hf_20261124_032346_c94ad70e-0a0f-4a4e-99f8-39e0200da791.png',
  lake: 'hf_20261124_032412_9f658303-9bca-4653-a7e8-7fcb3788f887.png',
  walls: 'hf_20261124_032423_d01ee5a9-9ec6-424c-93bb-9972ecf2f3cf.png',
  arch: 'hf_20261124_025152_784dec8b-ad51-476d-9e19-dbca11ca8d01.png',
  flags: 'hf_20261124_032437_291e3d42-e769-437c-abcf-ecf2965a8feb.png',
} as const;

export type AssetKey = keyof typeof ASSET_FILENAMES;

export const ASSET_URLS: Record<AssetKey, string> = {
  sky: buildProxyUrl(ASSET_FILENAMES.sky),
  side: buildProxyUrl(ASSET_FILENAMES.side),
  stairs: buildProxyUrl(ASSET_FILENAMES.stairs),
  hall: buildProxyUrl(ASSET_FILENAMES.hall),
  people: buildProxyUrl(ASSET_FILENAMES.people),
  larch: buildProxyUrl(ASSET_FILENAMES.larch),
  pav: buildProxyUrl(ASSET_FILENAMES.pav),
  mid: buildProxyUrl(ASSET_FILENAMES.mid),
  near: buildProxyUrl(ASSET_FILENAMES.near),
  lake: buildProxyUrl(ASSET_FILENAMES.lake),
  walls: buildProxyUrl(ASSET_FILENAMES.walls),
  arch: buildProxyUrl(ASSET_FILENAMES.arch),
  flags: buildProxyUrl(ASSET_FILENAMES.flags),
};

export type ParallaxLayerId =
  | 'sky'
  | 'side'
  | 'stairs-base'
  | 'hall'
  | 'stairs-band-2'
  | 'people-band-2'
  | 'stairs-band-3'
  | 'people-band-3'
  | 'larch-left'
  | 'larch-right'
  | 'pav'
  | 'mid-left'
  | 'mid-right'
  | 'near-left'
  | 'near-right'
  | 'flags';

export interface ParallaxLayerSpec {
  id: ParallaxLayerId;
  assetKey: AssetKey;
  yA: number;
  yB: number;
  yC: number;
  /** Horizontal offset in frame widths (e.g. -0.07 => -7%) */
  dx?: number;
  /** Clip half class for split tree layers */
  half?: 'left' | 'right';
  /** Dynamic soft bottom fade amount (percent of layer height) */
  fade?: number;
  /** Fade speed multiplier (defaults to 6) */
  fadeSpeed?: number;
  /** Top cut percentage for stair depth bands (feathered over 1.2%) */
  bandTop?: number;
  /** Extra static CSS class name (e.g. static masks for people bands or flags) */
  extraClass?: string;
}

/**
 * The 15 monastery parallax layers in exact paint order (before div.cave).
 * Combined with lake, walls, arch, and flags, the scene holds 19 img elements.
 */
export const MONASTERY_LAYERS: readonly ParallaxLayerSpec[] = [
  { id: 'sky', assetKey: 'sky', yA: 0, yB: 0, yC: -0.12 },
  { id: 'side', assetKey: 'side', yA: 0, yB: -0.15, yC: -0.6, fade: 10 },
  { id: 'stairs-base', assetKey: 'stairs', yA: 0, yB: -0.1, yC: -0.6 },
  { id: 'hall', assetKey: 'hall', yA: 0, yB: -0.1, yC: -0.6 },
  {
    id: 'stairs-band-2',
    assetKey: 'stairs',
    yA: 0,
    yB: -0.15,
    yC: -0.63,
    bandTop: 66,
    fade: 5,
    fadeSpeed: 40,
  },
  {
    id: 'people-band-2',
    assetKey: 'people',
    yA: 0,
    yB: -0.15,
    yC: -0.63,
    extraClass: 'mask-people-band-2',
  },
  {
    id: 'stairs-band-3',
    assetKey: 'stairs',
    yA: 0,
    yB: -0.2,
    yC: -0.66,
    bandTop: 72,
    fade: 7,
    fadeSpeed: 30,
  },
  {
    id: 'people-band-3',
    assetKey: 'people',
    yA: 0,
    yB: -0.2,
    yC: -0.66,
    extraClass: 'mask-people-band-3',
  },
  {
    id: 'larch-left',
    assetKey: 'larch',
    yA: 0,
    yB: -0.2,
    yC: -0.8,
    dx: -0.07,
    half: 'left',
    fade: 30,
  },
  {
    id: 'larch-right',
    assetKey: 'larch',
    yA: 0,
    yB: -0.2,
    yC: -0.8,
    dx: 0.07,
    half: 'right',
    fade: 30,
  },
  { id: 'pav', assetKey: 'pav', yA: 0, yB: -0.2, yC: -0.85, fade: 14 },
  {
    id: 'mid-left',
    assetKey: 'mid',
    yA: 0,
    yB: -0.27,
    yC: -0.95,
    dx: -0.05,
    half: 'left',
    fade: 18,
  },
  {
    id: 'mid-right',
    assetKey: 'mid',
    yA: 0,
    yB: -0.27,
    yC: -0.95,
    dx: 0.05,
    half: 'right',
    fade: 18,
  },
  {
    id: 'near-left',
    assetKey: 'near',
    yA: 0,
    yB: -0.36,
    yC: -1.2,
    dx: -0.06,
    half: 'left',
    fade: 34,
  },
  {
    id: 'near-right',
    assetKey: 'near',
    yA: 0,
    yB: -0.36,
    yC: -1.2,
    dx: 0.06,
    half: 'right',
    fade: 34,
  },
] as const;

export const FLAGS_LAYER: ParallaxLayerSpec = {
  id: 'flags',
  assetKey: 'flags',
  yA: 0.14,
  yB: 0.14,
  yC: 0,
  extraClass: 'mask-flags',
};

export const TOTAL_IMAGE_LAYER_COUNT = MONASTERY_LAYERS.length + 4; // + lake, walls, arch, flags = 19
