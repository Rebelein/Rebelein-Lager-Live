import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" fill="hsl(var(--primary))" stroke="none" />
      <text
        x="12"
        y="16"
        fontFamily="Inter, sans-serif"
        fontSize="10"
        fill="hsl(var(--primary-foreground))"
        textAnchor="middle"
        fontWeight="bold"
      >
        LM
      </text>
    </svg>
  );
}
