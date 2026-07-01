import * as React from 'react';
import CrazyGLWrapper, {
	useContent,
	useHeroReady,
	type HeroComponentProps,
} from '@crazygl/core';
import metadata from './metadata.json';
import './style.css';

/* ─────────────────────────────────────────────────────────────────────────
   Extruded Logo Monolith — Three.js product-shot render of a user logo.

   Physics statement
     - Geometry: SVG path → THREE.ExtrudeGeometry. PNG/raster falls back
       to a marching-squares trace of the alpha mask so logos with no
       vector source still extrude (less crisp, but valid).
     - Material: MeshStandardMaterial — physically-based Cook-Torrance
       BRDF. metalness ≈ 0.72 + roughness ≈ 0.22 = glossy "piano-lacquer"
       finish. F0 derived by three from metalness × color.
     - Environment: procedural studio HDRI baked into a 1024×512 equirect
       canvas → PMREMGenerator. NO horizontal continuous structure (no
       horizon, no city band) per skill rules: those stretch around the
       equator on equirect projection.
     - Floor: a three.js Reflector — real specular RT mirror of the
       scene from the floor POV.
     - Lighting: hemisphere fill + animated rim-sweep directional light
       orbiting the monolith + warm key light from upper-left.
     - Pointer: parallax. Cursor X → yaw (±0.35 rad), Y → pitch (±0.18
       rad). Eased toward target each frame.
     - Imperfections: procedural FBM roughness map breaks the perfect
       mirror so the surface reads as polished lacquer, not plastic CGI.

   References
     - three.js example "webgl_geometry_extrude_shapes" (SVG → extrude).
     - three.js Reflector (examples/jsm/objects/Reflector).
     - Karis 2013 "Real Shading in Unreal Engine 4" — metallic F0 + Schlick.
     - iq HDRI rules (no horizontal continuous bands on equirect).
     - PMREMGenerator (three.js docs) — prefiltered roughness mip chain.

   Coordinate spaces
     fragCoord — pixel coords on the canvas [0..res.x] × [0..res.y]
     ndc       — three normalized device coords [-1..1]²
     world     — three scene world units; monolith near origin,
                 shifted ±X by layout; camera at ~(0, 0.2, 4.5).
     svgPx     — SVG viewBox coords; Y-flipped + centred before extrude.
     u_input   — runtime pointer 0..1 (top-left origin); mapped to
                 ±yaw / ±pitch on the group rotation.
   ───────────────────────────────────────────────────────────────────────── */

const ThreeStage = React.lazy(() => import('./ThreeStage'));

type LayoutMode = 'centered' | 'content-left' | 'content-right';

function ExtrudedLogoMonolithHero(props: HeroComponentProps) {
	const {
		size,
		input,
		reducedMotion,
		rootRef,
		layout = 'content-left' as LayoutMode,
		logoSvg = 'https://crazygl.com/samples/crazygl.svg',
		monolithSize = 1.05,
		thickness = 0.32,
		bevel = 0.6,
		rotationSpeed = 0.18,
		parallaxStrength = 0.5,
		logoColor = '#DeDeDe',
		metalness = 0.72,
		roughness = 0.22,
		imperfectionStrength = 0.35,
		keyColor = '#ffeecf',
		rimColor = '#7aa2ff',
		rimIntensity = 1.0,
		rimSweepSpeed = 0.35,
		envIntensity = 1.1,
		showFloor = true,
		useGlbMaterials = true,
		transparent = false,
		bgTop = '#10131c',
		bgBottom = '#04050a',
	} = props as any;

	const content = useContent(props);
	useHeroReady(props);
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => setMounted(true), []);

	const contentAlign: React.CSSProperties =
		layout === 'content-left'
			? { justifyContent: 'flex-start', textAlign: 'left' }
			: layout === 'content-right'
				? { justifyContent: 'flex-end', textAlign: 'right' }
				: { justifyContent: 'center', textAlign: 'center' };

	const bgStyle: React.CSSProperties = transparent
		? { background: 'transparent' }
		: { background: `linear-gradient(180deg, ${bgTop} 0%, ${bgBottom} 100%)` };

	return (
		<>
			<crazygl-stage
				style={
					{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', ...bgStyle } as React.CSSProperties
				}
			>
				{mounted ? (
					<React.Suspense fallback={null}>
						<ThreeStage
							rootRef={rootRef}
							size={size}
							input={input}
							reducedMotion={reducedMotion}
							layout={layout}
							logoSvg={logoSvg}
							monolithSize={monolithSize}
							thickness={thickness}
							bevel={bevel}
							rotationSpeed={rotationSpeed}
							parallaxStrength={parallaxStrength}
							logoColor={logoColor}
							metalness={metalness}
							roughness={roughness}
							imperfectionStrength={imperfectionStrength}
							keyColor={keyColor}
							rimColor={rimColor}
							rimIntensity={rimIntensity}
							rimSweepSpeed={rimSweepSpeed}
							envIntensity={envIntensity}
							showFloor={showFloor}
							useGlbMaterials={useGlbMaterials}
							transparent={transparent}
						/>
					</React.Suspense>
				) : null}
			</crazygl-stage>
			<crazygl-content
				style={
					{
						position: 'absolute',
						inset: 0,
						display: 'flex',
						alignItems: 'center',
						zIndex: 1,
						pointerEvents: 'none',
						...contentAlign,
					} as React.CSSProperties
				}
			>
				<div className="crazygl-elm-content">{content.node}</div>
			</crazygl-content>
		</>
	);
}

export { metadata };
export default function ExtrudedLogoMonolith(props: any) {
	return <CrazyGLWrapper hero={ExtrudedLogoMonolithHero} metadata={metadata as any} {...props} />;
}
