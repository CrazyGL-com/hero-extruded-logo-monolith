import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { useHeroAnimationFrame, useHeroAssetGate } from '@crazygl/core';
import { loadLogo3D } from '@crazygl/core/three/loadLogo3D';
// Procedural studio HDRI — 1024×512 equirect canvas. Vertical sky→floor
// gradient + discrete radial softboxes. NO horizontal continuous structure
// (skill rule — those stretch around the equator on equirect projection).
function makeStudioEnv(keyHex, rimHex, intensity) {
    const W = 1024;
    const H = 512;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d');
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0.0, '#dde3ec');
    sky.addColorStop(0.45, '#5e6678');
    sky.addColorStop(0.55, '#1c2230');
    sky.addColorStop(1.0, '#07080c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    const boxes = [
        { x: W * 0.16, y: H * 0.20, r: 240, core: '#ffffff', halo: keyHex },
        { x: W * 0.80, y: H * 0.24, r: 210, core: '#dde7ff', halo: '#5070a0' },
        { x: W * 0.04, y: H * 0.34, r: 140, core: '#f5f0e8', halo: '#3a4258' },
        { x: W * 0.96, y: H * 0.32, r: 140, core: '#f5f0e8', halo: '#3a4258' },
        { x: W * 0.46, y: H * 0.10, r: 120, core: '#ffffff', halo: rimHex },
        { x: W * 0.30, y: H * 0.38, r: 55, core: '#ffffff', halo: '#ffffff' },
        { x: W * 0.68, y: H * 0.42, r: 65, core: '#ffffff', halo: '#ffffff' },
        { x: W * 0.25, y: H * 0.78, r: 90, core: '#3a2c18', halo: '#0a0703' },
        { x: W * 0.75, y: H * 0.82, r: 80, core: '#23303f', halo: '#030608' },
    ];
    ctx.globalCompositeOperation = 'lighter';
    for (const b of boxes) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0.0, b.core);
        g.addColorStop(0.35, b.halo);
        const fade = b.halo.length === 9 ? b.halo.slice(0, 7) + '00' : b.halo + '00';
        g.addColorStop(1.0, fade);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'source-over';
    const seam = ctx.getImageData(0, 0, 32, H);
    ctx.putImageData(seam, W - 32, 0);
    if (intensity !== 1) {
        ctx.globalCompositeOperation = 'multiply';
        const c = Math.max(0, Math.min(255, Math.round(intensity * 255)));
        ctx.fillStyle = `rgb(${c}, ${c}, ${c})`;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
    }
    return cv;
}
function makeRoughnessMap(strength) {
    const S = 512;
    const cv = document.createElement('canvas');
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(S, S);
    const data = img.data;
    const hash = (x, y) => {
        const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return s - Math.floor(s);
    };
    const noise = (x, y) => {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const xf = x - xi;
        const yf = y - yi;
        const u = xf * xf * (3 - 2 * xf);
        const v = yf * yf * (3 - 2 * yf);
        const a = hash(xi, yi);
        const b = hash(xi + 1, yi);
        const c = hash(xi, yi + 1);
        const d = hash(xi + 1, yi + 1);
        return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            let n = 0;
            let a = 0.5;
            let f = 2.5;
            for (let o = 0; o < 4; o++) {
                n += a * noise((x / S) * f, (y / S) * f);
                a *= 0.5;
                f *= 2.1;
            }
            const v = 0.5 + (n - 0.5) * strength * 1.3;
            const c = Math.max(0, Math.min(255, Math.round(v * 255)));
            const i = (y * S + x) * 4;
            data[i] = c;
            data[i + 1] = c;
            data[i + 2] = c;
            data[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return cv;
}
function hexToColor(hex) {
    return new THREE.Color(hex);
}
export default function ThreeStage(props) {
    const { rootRef, size, input, reducedMotion, layout, logoSvg, monolithSize, thickness, bevel, rotationSpeed, parallaxStrength, logoColor, metalness, roughness, imperfectionStrength, keyColor, rimColor, rimIntensity, rimSweepSpeed, envIntensity, showFloor, useGlbMaterials, } = props;
    const canvasRef = React.useRef(null);
    const rendererRef = React.useRef(null);
    const sceneRef = React.useRef(null);
    const cameraRef = React.useRef(null);
    const groupRef = React.useRef(null);
    const meshRef = React.useRef(null);
    const materialRef = React.useRef(null);
    const reflectorRef = React.useRef(null);
    const reflectorOverlayRef = React.useRef(null);
    const rimLightRef = React.useRef(null);
    const keyLightRef = React.useRef(null);
    const envRTRef = React.useRef(null);
    const pmremRef = React.useRef(null);
    const roughnessMapRef = React.useRef(null);
    const yawRef = React.useRef(0);
    const pitchRef = React.useRef(0);
    const ambientYawRef = React.useRef(0);
    const logoAspectRef = React.useRef(1);
    const loadedRef = React.useRef(null);
    const [shapesVersion, setShapesVersion] = React.useState(0);
    // Off-DOM async asset: the 3D logo built by loadLogo3D (GLTF for
    // .glb/.gltf, otherwise an extruded SVG). Hold the hero "not ready"
    // until it's built / fails / there's nothing to load.
    const [assetReady, setAssetReady] = React.useState(false);
    useHeroAssetGate(assetReady);
    // Geometry bbox in mesh-local coords. Used in the animation frame to
    // keep the model floating above the floor regardless of monolithSize.
    const geomBboxRef = React.useRef(null);
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            premultipliedAlpha: false,
            powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.setClearColor(0x000000, 0);
        rendererRef.current = renderer;
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
        // Camera slightly above the sculpture's centre — gives a viewing
        // angle steep enough that the mirror floor reflection becomes
        // visible below the model. Aim slightly above origin so the
        // model sits in the upper-middle of the frame and the floor
        // occupies the lower-third.
        camera.position.set(0, 0.55, 4.5);
        camera.lookAt(0, -0.18, 0);
        cameraRef.current = camera;
        const hemi = new THREE.HemisphereLight(0xc8d4e8, 0x0a0a14, 0.55);
        scene.add(hemi);
        const key = new THREE.DirectionalLight(hexToColor(keyColor), 1.8);
        key.position.set(-3.2, 4.5, 3.5);
        scene.add(key);
        keyLightRef.current = key;
        const rim = new THREE.DirectionalLight(hexToColor(rimColor), rimIntensity * 2.4);
        rim.position.set(2.4, 1.0, -2.8);
        scene.add(rim);
        rimLightRef.current = rim;
        const group = new THREE.Group();
        scene.add(group);
        groupRef.current = group;
        pmremRef.current = new THREE.PMREMGenerator(renderer);
        pmremRef.current.compileEquirectangularShader();
        return () => {
            renderer.dispose();
            pmremRef.current?.dispose();
            pmremRef.current = null;
            envRTRef.current?.dispose();
            envRTRef.current = null;
            roughnessMapRef.current?.dispose();
            roughnessMapRef.current = null;
            // meshRef.current is either a single Mesh (shapes branch) or a
            // loaded GLB scene root (Group/Object3D). Walk descendants so
            // we dispose every BufferGeometry regardless. The hero material
            // is reused across rebuilds and disposed via materialRef.
            if (meshRef.current) {
                meshRef.current.traverse?.((child) => {
                    if (child.isMesh) {
                        child.geometry?.dispose?.();
                    }
                });
            }
            materialRef.current?.dispose?.();
            materialRef.current = null;
            rendererRef.current = null;
            sceneRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    React.useEffect(() => {
        const renderer = rendererRef.current;
        const camera = cameraRef.current;
        if (!renderer || !camera)
            return;
        const w = Math.max(1, Math.floor(size.width));
        const h = Math.max(1, Math.floor(size.height));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }, [size.width, size.height]);
    React.useEffect(() => {
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const pmrem = pmremRef.current;
        if (!renderer || !scene || !pmrem)
            return;
        const cv = makeStudioEnv(keyColor, rimColor, envIntensity);
        const eqTex = new THREE.CanvasTexture(cv);
        eqTex.mapping = THREE.EquirectangularReflectionMapping;
        eqTex.colorSpace = THREE.SRGBColorSpace;
        const rt = pmrem.fromEquirectangular(eqTex);
        eqTex.dispose();
        envRTRef.current?.dispose();
        envRTRef.current = rt;
        scene.environment = rt.texture;
        const mat = materialRef.current;
        if (mat) {
            mat.envMapIntensity = envIntensity;
            mat.needsUpdate = true;
        }
    }, [keyColor, rimColor, envIntensity]);
    React.useEffect(() => {
        const cv = makeRoughnessMap(imperfectionStrength);
        const tex = new THREE.CanvasTexture(cv);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2.5, 2.5);
        roughnessMapRef.current?.dispose();
        roughnessMapRef.current = tex;
        const mat = materialRef.current;
        if (mat) {
            mat.roughnessMap = tex;
            mat.needsUpdate = true;
        }
    }, [imperfectionStrength]);
    // (1) Logo source → parsed shapes OR loaded GLB scene. Runs ONLY when
    // logoSvg changes. Caches the result so subsequent geometry rebuilds
    // (thickness/bevel) don't re-fetch the asset.
    //
    // Uses `loadLogo3D` from @crazygl/core which routes on the URL:
    //   *.glb / *.gltf → GLTFLoader (the user supplied real 3D geometry,
    //                    we skip the extrusion path entirely)
    //   anything else → SVGLoader / raster trace → THREE.Shape[]
    // An AbortController invalidates in-flight requests on logo change so a
    // late-arriving response can't overwrite a newer one.
    React.useEffect(() => {
        // No logo source → nothing async to wait for; release the gate.
        if (!logoSvg) {
            setAssetReady(true);
            return;
        }
        const controller = new AbortController();
        loadLogo3D(logoSvg, {
            signal: controller.signal,
            svgCurveResolution: 64,
            maxRasterGrid: 220,
        })
            .then((result) => {
            if (controller.signal.aborted)
                return;
            if (result.kind === 'shapes') {
                if (result.shapes.length === 0) {
                    console.warn('[extruded-logo-monolith] no shapes parsed from', logoSvg);
                    return;
                }
                loadedRef.current = {
                    kind: 'shapes',
                    shapes: result.shapes,
                    aspect: result.aspect,
                    key: logoSvg,
                };
            }
            else {
                loadedRef.current = {
                    kind: 'object',
                    object: result.object,
                    aspect: result.aspect,
                    bbox: result.bbox,
                    key: logoSvg,
                };
            }
            logoAspectRef.current = result.aspect;
            setShapesVersion((v) => v + 1);
        })
            .catch((err) => {
            if (controller.signal.aborted)
                return;
            console.warn('[extruded-logo-monolith] logo load failed:', err);
        })
            .finally(() => {
            // Flip ready on every terminal path — built, no-shapes, or
            // error — except when this load was aborted by a newer one.
            if (controller.signal.aborted)
                return;
            setAssetReady(true);
        });
        return () => controller.abort();
    }, [logoSvg]);
    // (2) Loaded asset + thickness + bevel → scene-graph mesh. Runs when
    // shapes/scene change OR when thickness/bevel change. Two branches:
    //
    //   • shapes path → ExtrudeGeometry from THREE.Shape[] (existing
    //     pipeline). The hero's MeshStandardMaterial is applied.
    //   • object path → the loaded GLB scene root is added directly.
    //     If `useGlbMaterials` is OFF, the hero's MeshStandardMaterial is
    //     applied to every Mesh descendant via `traverse` (matches the
    //     extrusion's piano-lacquer look). If ON, the GLB's authored
    //     PBR materials are kept; the scene's environment still gives
    //     them studio reflections.
    //
    // Reuses the hero material so colour/metalness/roughness slider
    // changes don't fire here (they're in their own effect below).
    //
    // PERF: the shapes branch defers `new ExtrudeGeometry()` (and the
    // vertex-normal computation that follows) to a `setTimeout(0)` macro-
    // task so the slider's input-event handler returns synchronously and
    // the page doesn't stall mid-drag. The OLD mesh stays on stage until
    // the new geometry is ready (no flicker). A generation token guards
    // against late-arriving builds overwriting newer ones when the user
    // scrubs faster than a single build completes. Deps are deliberately
    // scoped to the things that ACTUALLY change geometry — colour /
    // lights / env intensity have their own effects above.
    const buildGenRef = React.useRef(0);
    React.useEffect(() => {
        const scene = sceneRef.current;
        const group = groupRef.current;
        const cached = loadedRef.current;
        if (!scene || !group || !cached)
            return;
        // Always ensure the hero material exists — the GLB-override branch
        // and the shapes branch both need it (and the slider-driven update
        // effects assume materialRef.current is non-null once any logo has
        // loaded).
        let mat = materialRef.current;
        if (!mat) {
            mat = new THREE.MeshStandardMaterial({
                color: hexToColor(logoColor),
                metalness,
                roughness,
                envMapIntensity: envIntensity,
                roughnessMap: roughnessMapRef.current ?? null,
            });
            materialRef.current = mat;
        }
        else if (mat.roughnessMap !== roughnessMapRef.current) {
            mat.roughnessMap = roughnessMapRef.current ?? null;
            mat.needsUpdate = true;
        }
        if (cached.kind === 'object') {
            // GLB path. Cheap — tear down + add immediately (no extrude
            // computation involved).
            if (meshRef.current) {
                const old = meshRef.current;
                group.remove(old);
                old.traverse?.((child) => {
                    if (child.isMesh) {
                        child.geometry?.dispose?.();
                    }
                });
                meshRef.current = null;
            }
            const sceneRoot = cached.object;
            if (!useGlbMaterials) {
                sceneRoot.traverse((child) => {
                    if (child.isMesh) {
                        child.material = mat;
                    }
                });
            }
            // Bbox in mesh-local coords (used by the rAF loop to keep
            // the model floating above the floor regardless of scale).
            geomBboxRef.current = {
                minY: cached.bbox.min.y,
                maxY: cached.bbox.max.y,
            };
            group.add(sceneRoot);
            meshRef.current = sceneRoot;
            return;
        }
        // Shapes path. Defer the heavy ExtrudeGeometry build so the
        // slider's `input` handler returns synchronously. Tear down the
        // old mesh AFTER the new one is ready (no flicker mid-drag).
        const gen = ++buildGenRef.current;
        const handle = setTimeout(() => {
            if (buildGenRef.current !== gen)
                return;
            if (!groupRef.current || !sceneRef.current)
                return;
            const stillCached = loadedRef.current;
            if (!stillCached || stillCached.kind !== 'shapes')
                return;
            // Bevel segments scale smoothly with the slider so the
            // visual changes continuously instead of snapping at
            // threshold values. curveSegments=32 is enough for the
            // post-Chaikin-smoothed silhouette (the trace itself is
            // already a smooth polygon at that point); bevelSegments
            // capped at ~10 keeps vertex count manageable.
            const bevelSize = 0.008 + bevel * 0.040;
            const bevelThickness = 0.008 + bevel * 0.055;
            const bevelSegments = Math.max(1, Math.round(2 + bevel * 8));
            const depth = thickness;
            // Adaptive `curveSegments`. ExtrudeGeometry applies this knob
            // UNIFORMLY across the cap AND every bevel ring + the side
            // walls; for an SVG logo (real CubicBezierCurves preserved
            // through `svgDataToShapes`) the cost is
            //   curves × curveSegments × (bevelSegments + 1) × 4
            // vertices on the bevel alone. At bevelSegments=10 and a
            // typical 50-curve logo that's ~40 k verts just for the rim,
            // and rebuilding the geometry on every slider tick visibly
            // stalls the page (50–150 ms).
            //
            // Visually, the bevel doesn't need 24 segments per curve once
            // the bevel is rounded — extra curve samples on the cap are
            // invisible behind a thick rounded rim. Scaling curveSegments
            // down with sqrt(bevelSegments+1) holds rim fidelity roughly
            // constant in screen pixels while cutting build time
            // dramatically (~3× speedup at bevel=1.0). PNG paths
            // (LineCurves) are unaffected — they sample as 2-point
            // curves regardless of this number, and the loadLogoShapes
            // subdivision pass already gives them dense side quads.
            const curveSegments = Math.max(10, Math.round(24 / Math.sqrt(bevelSegments + 1)));
            const tBuild0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
            const geom = new THREE.ExtrudeGeometry(stillCached.shapes, {
                depth,
                bevelEnabled: bevel > 0.01,
                bevelSize,
                bevelThickness,
                bevelSegments,
                curveSegments,
                steps: 1,
            });
            if (typeof console !== 'undefined') {
                const tBuild1 = typeof performance !== 'undefined'
                    ? performance.now()
                    : Date.now();
                // Timing: bevel-only edits should be sub-frame on typical
                // logos. If this prints >50 ms watch for runaway
                // curveSegments × bevelSegments product.
                console.log(`[extruded-monolith] ExtrudeGeometry build=${(tBuild1 - tBuild0).toFixed(1)}ms ` +
                    `shapes=${stillCached.shapes.length} bevel=${bevel.toFixed(2)} ` +
                    `bevelSeg=${bevelSegments} curveSeg=${curveSegments}`);
            }
            // Late-arrival guard: a newer build may have started while we
            // were synchronous. Discard.
            if (buildGenRef.current !== gen) {
                geom.dispose();
                return;
            }
            geom.translate(0, 0, -depth / 2);
            geom.computeVertexNormals();
            geom.computeBoundingBox();
            const bb = geom.boundingBox;
            geomBboxRef.current = { minY: bb.min.y, maxY: bb.max.y };
            // Swap. Old mesh removed just before the new one is added so
            // the scene never goes blank mid-drag.
            if (meshRef.current) {
                const old = meshRef.current;
                group.remove(old);
                old.traverse?.((child) => {
                    if (child.isMesh) {
                        child.geometry?.dispose?.();
                    }
                });
                meshRef.current = null;
            }
            const mesh = new THREE.Mesh(geom, mat);
            group.add(mesh);
            meshRef.current = mesh;
        }, 0);
        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shapesVersion, thickness, bevel, useGlbMaterials]);
    React.useEffect(() => {
        const scene = sceneRef.current;
        if (!scene)
            return;
        if (reflectorRef.current) {
            scene.remove(reflectorRef.current);
            reflectorRef.current.dispose();
            reflectorRef.current = null;
        }
        if (reflectorOverlayRef.current) {
            scene.remove(reflectorOverlayRef.current);
            reflectorOverlayRef.current.material.dispose();
            reflectorOverlayRef.current.geometry.dispose();
            reflectorOverlayRef.current = null;
        }
        if (!showFloor)
            return;
        // Floor just below the sculpture (which fits inside a ~1-unit-tall
        // box). At y = -0.62 the reflected geometry shows below the model.
        const floorY = -0.62;
        const reflGeom = new THREE.PlaneGeometry(16, 16);
        const reflector = new Reflector(reflGeom, {
            textureWidth: 1024,
            textureHeight: 1024,
            color: new THREE.Color(0x404654),
        });
        reflector.rotation.x = -Math.PI / 2;
        reflector.position.y = floorY;
        scene.add(reflector);
        reflectorRef.current = reflector;
        const overlayGeom = new THREE.PlaneGeometry(16, 16);
        const overlayMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
        });
        const overlay = new THREE.Mesh(overlayGeom, overlayMat);
        overlay.rotation.x = -Math.PI / 2;
        overlay.position.y = floorY + 0.001;
        scene.add(overlay);
        reflectorOverlayRef.current = overlay;
    }, [showFloor]);
    React.useEffect(() => {
        if (keyLightRef.current)
            keyLightRef.current.color = hexToColor(keyColor);
    }, [keyColor]);
    React.useEffect(() => {
        if (rimLightRef.current) {
            rimLightRef.current.color = hexToColor(rimColor);
            rimLightRef.current.intensity = rimIntensity * 2.4;
        }
    }, [rimColor, rimIntensity]);
    React.useEffect(() => {
        const mat = materialRef.current;
        if (!mat)
            return;
        mat.color = hexToColor(logoColor);
        mat.metalness = metalness;
        mat.roughness = roughness;
        mat.envMapIntensity = envIntensity;
        mat.needsUpdate = true;
    }, [logoColor, metalness, roughness, envIntensity]);
    useHeroAnimationFrame(rootRef, ({ delta, elapsed }) => {
        const renderer = rendererRef.current;
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        const group = groupRef.current;
        if (!renderer || !scene || !camera || !group)
            return;
        const layoutX = layout === 'content-left' ? 0.95 : layout === 'content-right' ? -0.95 : 0.0;
        const px = (input?.x ?? 0.5) * 2 - 1;
        const py = (input?.y ?? 0.5) * 2 - 1;
        const targetYaw = -px * 0.35 * parallaxStrength;
        const targetPitch = py * 0.18 * parallaxStrength;
        const ease = 1 - Math.exp(-delta * 4.5);
        yawRef.current += (targetYaw - yawRef.current) * ease;
        pitchRef.current += (targetPitch - pitchRef.current) * ease;
        if (!reducedMotion) {
            ambientYawRef.current += delta * rotationSpeed * 0.55;
        }
        const scale = monolithSize;
        const aspect = logoAspectRef.current || 1;
        const fitScale = aspect > 1 ? 1.6 / aspect : 1.6;
        const finalScale = scale * fitScale * 0.55;
        // Keep the model's bottom edge a hair above the floor regardless of
        // monolithSize so the sculpture never intersects the mirror.
        const floorY = -0.62;
        const gap = 0.04;
        const bb = geomBboxRef.current;
        const yOffset = bb ? Math.max(0, floorY + gap - bb.minY * finalScale) : 0;
        group.position.set(layoutX, yOffset, 0);
        group.scale.setScalar(finalScale);
        // Camera aim follows the model's vertical centre so the sculpture
        // stays roughly framed regardless of size. Composition still keeps
        // the floor visible in the lower band.
        const aimY = -0.18 + yOffset * 0.55;
        camera.lookAt(0, aimY, 0);
        group.rotation.set(pitchRef.current, ambientYawRef.current + yawRef.current, 0);
        const rim = rimLightRef.current;
        if (rim) {
            const t = elapsed * rimSweepSpeed;
            const r = 4.2;
            rim.position.set(Math.cos(t) * r + layoutX, 0.8 + 0.35 * Math.sin(t * 0.7), Math.sin(t) * r);
            rim.target.position.set(layoutX, 0, 0);
            rim.target.updateMatrixWorld();
        }
        renderer.render(scene, camera);
    });
    return (_jsx("canvas", { ref: canvasRef, className: "crazygl-elm-canvas", "aria-hidden": "true" }));
}
