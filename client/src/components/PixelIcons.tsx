import React from 'react';

type IconProps = { size?: number; className?: string };

export function GooglePixelIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      shapeRendering="crispEdges"
      aria-hidden
      className={className}
    >
      {/* Pixel-art Google-style multicolor "G" @ 32x32 (no white center) */}
      {/* RED (top-left arc) */}
      <rect x="8" y="4" width="16" height="4" fill="#EA4335" />
      <rect x="6" y="6" width="2" height="2" fill="#EA4335" />
      <rect x="5" y="8" width="2" height="2" fill="#EA4335" />
      <rect x="4" y="10" width="2" height="2" fill="#EA4335" />
      <rect x="3" y="12" width="4" height="8" fill="#EA4335" />

      {/* YELLOW (bottom-left arc) */}
      <rect x="8" y="24" width="16" height="4" fill="#FBBC04" />
      <rect x="6" y="22" width="2" height="2" fill="#FBBC04" />
      <rect x="5" y="20" width="2" height="2" fill="#FBBC04" />
      <rect x="4" y="18" width="2" height="2" fill="#FBBC04" />
      <rect x="3" y="18" width="4" height="6" fill="#FBBC04" />

      {/* GREEN (lower-right arc) */}
      <rect x="24" y="20" width="4" height="8" fill="#34A853" />
      <rect x="22" y="24" width="2" height="2" fill="#34A853" />
      <rect x="20" y="26" width="2" height="2" fill="#34A853" />

      {/* BLUE (right arc + inner G bar) */}
      <rect x="24" y="8" width="4" height="12" fill="#4285F4" />
      <rect x="22" y="6" width="2" height="2" fill="#4285F4" />
      {/* Inner G bar */}
      <rect x="16" y="16" width="12" height="3" fill="#4285F4" />
    </svg>
  );
}

export function GithubPixelIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      aria-hidden
      className={className}
    >
      {/* Pixel Octocat head silhouette approximation @ 24x24 */}
      {/* Ears */}
      <rect x="5" y="3" width="3" height="3" fill="#111" />
      <rect x="16" y="3" width="3" height="3" fill="#111" />
      {/* Head main */}
      <rect x="4" y="6" width="16" height="10" fill="#111" />
      {/* Cheeks bulge */}
      <rect x="3" y="9" width="3" height="6" fill="#111" />
      <rect x="20" y="9" width="3" height="6" fill="#111" />
      {/* Eyes */}
      <rect x="9" y="10" width="2" height="2" fill="#fff" />
      <rect x="15" y="10" width="2" height="2" fill="#fff" />
      {/* Chin */}
      <rect x="9" y="16" width="8" height="2" fill="#111" />
    </svg>
  );
}
