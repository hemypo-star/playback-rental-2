import React from 'react';
export type Breakpoints = {
    [key: string]: string;
};
export type WindowInfoProviderProps = {
    breakpoints: Breakpoints;
    children?: React.ReactNode;
};
export declare const WindowInfoProvider: React.FC<WindowInfoProviderProps>;
