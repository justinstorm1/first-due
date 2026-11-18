import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

/**
 * Artwork shared with the app icon (assets/app.icon) and the native splash image
 * (assets/images/splash-icon.png). Keep these paths in sync with those files.
 */
export const FLAME_PATH =
  "M512 160 C 566 300, 772 380, 772 618 C 772 772, 656 872, 512 872 C 368 872, 252 772, 252 618 C 252 500, 322 424, 368 372 C 376 456, 408 510, 462 532 C 440 398, 468 262, 512 160 Z";
export const CORE_PATH =
  "M512 512 C 548 590, 648 640, 648 736 C 648 810, 588 860, 512 860 C 436 860, 376 810, 376 736 C 376 672, 424 630, 452 598 C 462 640, 480 662, 502 670 C 492 608, 494 556, 512 512 Z";

/** iOS-style continuous-corner approximation. */
export const TILE_RADIUS_RATIO = 0.2237;

export function TileBackground({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C2261A" />
          <Stop offset="0.55" stopColor="#8E120A" />
          <Stop offset="1" stopColor="#5A0A06" />
        </LinearGradient>
        <LinearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.18" />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect width="1024" height="1024" rx={1024 * TILE_RADIUS_RATIO} fill="url(#tile)" />
      <Rect width="1024" height="1024" rx={1024 * TILE_RADIUS_RATIO} fill="url(#gloss)" />
    </Svg>
  );
}

export function Flame({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFC233" />
          <Stop offset="0.55" stopColor="#FF7A1A" />
          <Stop offset="1" stopColor="#FF4A14" />
        </LinearGradient>
      </Defs>
      <Path d={FLAME_PATH} fill="url(#flame)" />
    </Svg>
  );
}

export function FlameCore({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="core" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE08A" />
          <Stop offset="1" stopColor="#FFF8E1" />
        </LinearGradient>
      </Defs>
      <Path d={CORE_PATH} fill="url(#core)" />
    </Svg>
  );
}
