<sub>*Hero made by [@ybouane](https://x.com/ybouane).*</sub>
<p align="center">
  <img src="https://crazygl.com/heroes/hero-extruded-logo-monolith/banner-full.png" alt="Extruded Logo Monolith" width="640">
</p>

# @crazygl/hero-extruded-logo-monolith

Drop in a transparent SVG (or PNG) logo and it becomes a glossy black 3D sculpture with bevelled edges, studio HDRI reflections, a mirror floor, and an animated rim-light sweep. Premium product-shot look for SaaS, agencies, and AI tools.

## Demo
[Extruded Logo Monolith](https://crazygl.com/hero/extruded-logo-monolith)

## Install

```bash
npm install @crazygl/hero-extruded-logo-monolith
```

## Usage

```tsx
import ExtrudedLogoMonolith from '@crazygl/hero-extruded-logo-monolith';

export default function Page() {
  return (
    <ExtrudedLogoMonolith
      logoSvg="https://example.com/logo.svg"
      heading={"Built like\na monolith."}
      thickness={0.32}
      bevel={0.6}
      rimColor="#7aa2ff"
    />
  );
}
```

## Customise

- **Logo** — `logoSvg` accepts a transparent SVG (sharpest extrusion), a PNG (auto-traced from its alpha mask), or a GLB/GLTF model (swaps the extruded mesh for your real 3D asset).
- **Sculpture** — `monolithSize`, `thickness` (extrusion depth), `bevel` (edge rounding).
- **Material** — `logoColor`, `metalness`, `roughness`, `imperfectionStrength` (procedural micro-roughness), `useGlbMaterials` (keep a GLB's authored PBR materials).
- **Lighting** — `keyColor`, `rimColor`/`rimIntensity`/`rimSweepSpeed` (the orbiting accent light), `envIntensity` (studio reflection), `showFloor` (mirror floor).
- **Layout & motion** — `layout` (centered / content-left / content-right), `rotationSpeed`, `parallaxStrength`.
- **Background** — `transparent`, `bgTop`/`bgBottom` gradient.

## Best for

- Premium SaaS and developer-tool launch pages
- Design agencies and studios showing off a wordmark
- AI products and brand teaser sites that need a hero logo moment
- Luxury or hardware product announcements



This hero is part of [CrazyGL](https://crazygl.com), a collection of production-ready WebGL, canvas, 3D, and typography effects. Every CrazyGL hero ships with an agent-ready `SKILL.md` file that helps developers and coding agents adapt the effect into custom landing pages and interactive experiences.
