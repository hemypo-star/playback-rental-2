/// <reference types="react" />
export type WatchedBreakpoints = {
    [key: string]: boolean;
};
export interface IWindowInfoContext {
    width?: number;
    height?: number;
    '--vw': string;
    '--vh': string;
    breakpoints: WatchedBreakpoints;
    eventsFired: number;
}
export declare const WindowInfoContext: import("react").Context<IWindowInfoContext>;
