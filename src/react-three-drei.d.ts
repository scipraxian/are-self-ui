/** Minimal type declaration for @react-three/drei when package types are missing. */
declare module '@react-three/drei' {
  import type { ReactNode } from 'react';
  export const Environment: (props: { preset?: string }) => ReactNode;
  export const Html: (props: { position?: [number, number, number]; center?: boolean; children?: ReactNode }) => ReactNode;
  export const OrbitControls: (props: Record<string, unknown>) => ReactNode;
  export function useCursor(active: boolean): void;
}
