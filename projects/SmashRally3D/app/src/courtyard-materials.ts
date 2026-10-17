import {
    Texture,
    Vec2,
    ADDRESS_REPEAT,
    FILTER_LINEAR,
    FILTER_LINEAR_MIPMAP_LINEAR,
    PIXELFORMAT_RGBA8,
    type AppBase,
    type Entity,
    type StandardMaterial,
} from 'playcanvas';

/** Original static surface authoring; no downloaded imagery or per-frame animation. */
function surface(app: AppBase, name: string, pixel: (x: number, y: number) => number[]) {
    const texture = new Texture(app.graphicsDevice, {
        name,
        width: 256,
        height: 256,
        format: PIXELFORMAT_RGBA8,
        mipmaps: true,
        minFilter: FILTER_LINEAR_MIPMAP_LINEAR,
        magFilter: FILTER_LINEAR,
        addressU: ADDRESS_REPEAT,
        addressV: ADDRESS_REPEAT,
    });
    const data = texture.lock() as Uint8Array;
    for (let y = 0; y < 256; y++)
        for (let x = 0; x < 256; x++) {
            const rgb = pixel(x, y);
            const at = (y * 256 + x) * 4;
            for (let c = 0; c < 3; c++) data[at + c] = Math.round(Math.max(0, Math.min(255, rgb[c])));
            data[at + 3] = 255;
        }
    texture.unlock();
    return texture;
}

/** Scope clones to scenery mesh instances; the component's original material stays intact. */
export function applyCourtyardMaterials(app: AppBase, root: Entity) {
    const grain = (x: number, y: number) => {
        let n = Math.imul(x + 17, 374761393) ^ Math.imul(y + 41, 668265263);
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
    };
    const stone = surface(app, 'authored quiet stone', (x, y) => {
        const course = x % 64 < 3 || y % 128 < 3 ? 24 : 0;
        const block = grain(Math.floor(x / 64), Math.floor(y / 128)) * 6;
        const value = 249 - block - course + (grain(x, y) - 0.5) * 6;
        return [value, value, value];
    });
    const recess = (at: number, period: number) => {
        const wrapped = ((at % period) + period) % period;
        const distance = Math.min(wrapped, period - wrapped);
        return distance < 3 ? (1 - distance / 3) ** 2 : 0;
    };
    // Fine deterministic grains and recessed panel joints, without broad wave shading.
    const height = (x: number, y: number) =>
        grain((x + 256) % 256, (y + 256) % 256) * 0.14 -
        recess(x, 64) * 0.35 - recess(y, 128) * 0.35;
    const normals = surface(app, 'authored stone micro surface', (x, y) => {
        const dx = (height(x + 1, y) - height(x - 1, y)) * 0.35;
        const dy = (height(x, y + 1) - height(x, y - 1)) * 0.35;
        const length = Math.hypot(dx, dy, 1);
        return [128 - (dx / length) * 127, 128 - (dy / length) * 127, 128 + 127 / length];
    });
    const glass = surface(app, 'authored opaque sky in glass', (x, y) => {
        const v = y / 255;
        const sky = 0.65 + v * 0.32;
        const reflectedCanopy = 0.045 * Math.exp(-(((v - 0.72 - x / 4200) / 0.12) ** 2));
        const value = (sky + reflectedCanopy) * 255;
        return [value, value, value];
    });
    const stoneScale: Record<string, [number, number]> = {
        'club facade': [2, 1],
        'structural pier': [0.3, 2],
        foundation: [8, 0.5],
        'planter base': [1, 1],
        'planter rim': [1, 0.2],
        'window sill': [1, 0.15],
        'window lintel': [1, 0.15],
    };
    const cache = new Map<string, StandardMaterial>();
    for (const entry of root.find((n) => !!(n as Entity).render)) {
        const node = entry as Entity;
        const isGlass = node.name === 'recessed glass' || node.name === 'upper glass reflection';
        const scale = stoneScale[node.name];
        if (!isGlass && !scale) continue;
        const original = node.render!.material as StandardMaterial;
        const key = `${original.id}/${node.name}`;
        let material = cache.get(key);
        if (!material) {
            material = original.clone();
            material.name = `club ${isGlass ? 'glass' : 'stone'} / ${node.name}`;
            material.diffuseMap = isGlass ? glass : stone;
            material.diffuseMapTiling = isGlass ? new Vec2(1, 1) : new Vec2(scale[0], scale[1]);
            if (isGlass) {
                material.diffuse.fromString('#55798a');
                if (node.name === 'upper glass reflection') {
                    // Sample the same pane coordinates, removing the old hard painted band.
                    material.diffuseMapTiling = new Vec2(1.7 / 2.7, 0.34 / 2.54);
                    material.diffuseMapOffset = new Vec2((1.35 - 0.49 - 0.85) / 2.7, (1.27 + 1.07 - 0.17) / 2.54);
                }
            }
            material.gloss = isGlass ? 0.82 : 0.12;
            material.specular.set(isGlass ? 0.19 : 0.04, isGlass ? 0.22 : 0.04, isGlass ? 0.24 : 0.04);
            if (!isGlass) {
                material.normalMap = normals;
                material.normalMapTiling = new Vec2(...scale);
                material.bumpiness = 0.3;
            }
            material.update();
            cache.set(key, material);
        }
        for (const mesh of node.render!.meshInstances) mesh.material = material;
    }
}
