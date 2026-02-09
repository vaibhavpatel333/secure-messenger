declare module 'react-window' {
  import { ComponentType, CSSProperties, ReactElement } from 'react';

  export interface ListProps {
    height: number;
    itemCount: number;
    itemSize: number;
    width: string | number;
    children: ComponentType<{ index: number; style: CSSProperties }>;
  }

  export const FixedSizeList: ComponentType<ListProps>;
}

