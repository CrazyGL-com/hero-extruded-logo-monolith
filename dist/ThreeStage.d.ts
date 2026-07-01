import * as React from 'react';
type LayoutMode = 'centered' | 'content-left' | 'content-right';
interface StageProps {
    rootRef: React.RefObject<HTMLElement | null>;
    size: {
        width: number;
        height: number;
        dpr: number;
    };
    input: {
        x: number;
        y: number;
        active: boolean;
    };
    reducedMotion: boolean;
    layout: LayoutMode;
    logoSvg: string;
    monolithSize: number;
    thickness: number;
    bevel: number;
    rotationSpeed: number;
    parallaxStrength: number;
    logoColor: string;
    metalness: number;
    roughness: number;
    imperfectionStrength: number;
    keyColor: string;
    rimColor: string;
    rimIntensity: number;
    rimSweepSpeed: number;
    envIntensity: number;
    showFloor: boolean;
    useGlbMaterials: boolean;
    transparent: boolean;
}
export default function ThreeStage(props: StageProps): import("react/jsx-runtime").JSX.Element;
export {};
