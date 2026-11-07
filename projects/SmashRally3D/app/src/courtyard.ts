import { Entity, type AppBase } from 'playcanvas';

type Shape = (
    name: string,
    type: 'box' | 'cylinder' | 'sphere',
    position: number[],
    scale: number[],
    color: string,
    parent: Entity,
) => Entity;

/** Original, static practice-club scenery. No gameplay objects or lighting. */
export function buildCourtyard(app: AppBase, shape: Shape) {
    const root = new Entity('club courtyard');
    app.root.addChild(root);
    const building = new Entity('club building');
    root.addChild(building);
    const box = (name: string, p: number[], s: number[], color: string) =>
        shape(name, 'box', p, s, color, building);

    // A quiet dark lower course backs the opponent/net. The upper bays reveal
    // actual jamb/sill depth rather than bright painted rectangles on one wall.
    box('rear walkway', [0, -0.015, 10.25], [24.6, 0.09, 2.2], '#576271');
    box('foundation', [0, 0.18, 11.6], [24.4, 0.3, 0.9], '#485c66');
    box('club facade', [0, 3.15, 11.9], [24, 5.7, 0.4], '#9baaa5');
    box('club lower wall', [0, 1.04, 11.4], [24, 1.42, 0.65], '#506b78');
    box('lower wall coping', [0, 1.82, 11.31], [24.2, 0.14, 0.9], '#819396');
    box('canopy underside', [0, 5.91, 10.9], [24.8, 0.18, 2.05], '#657a7c');
    box('club canopy', [0, 6.06, 10.85], [25, 0.12, 2.3], '#c9c9b6');
    box('canopy edge', [0, 5.99, 9.69], [25, 0.16, 0.09], '#9ea99f');
    for (let x = -10.5; x <= 10.5; x += 3) {
        box('structural pier', [x, 3.68, 11.19], [0.22, 4.16, 0.96], '#a4b0a8');
    }
    for (let x = -9; x <= 9; x += 3) {
        box('recessed glass', [x, 3.73, 11.66], [2.7, 2.54, 0.06], '#34566b');
        box('window reveal left', [x - 1.38, 3.73, 11.35], [0.1, 2.72, 0.64], '#718888');
        box('window reveal right', [x + 1.38, 3.73, 11.35], [0.1, 2.72, 0.64], '#718888');
        box('window lintel', [x, 5.09, 11.31], [2.86, 0.14, 0.78], '#b3bbae');
        box('window sill', [x, 2.36, 11.24], [2.86, 0.16, 0.92], '#a1ada6');
        box('window mullion', [x + 0.42, 3.73, 11.57], [0.045, 2.54, 0.08], '#6d878e');
        box('window transom', [x, 4.58, 11.57], [2.7, 0.045, 0.08], '#6d878e');
        // Restrained opaque sky reflection: no expensive transparency, bloom,
        // moving sparkle or high-contrast white marks behind a high shuttle.
        box('upper glass reflection', [x - 0.49, 4.8, 11.6], [1.7, 0.34, 0.02], '#4b6a79');
    }
    for (const side of [-1, 1]) {
        const garden = new Entity(side < 0 ? 'west planter tree' : 'east planter tree');
        garden.setLocalPosition(side * 8.5, 0, 7.8);
        root.addChild(garden);
        const part = (name: string, type: 'box' | 'cylinder' | 'sphere', p: number[], s: number[], color: string) =>
            shape(name, type, p, s, color, garden);
        part('planter paving', 'box', [0, -0.015, 0], [3.05, 0.09, 3.2], '#576271');
        part('planter base', 'box', [0, 0.39, 0], [2.4, 0.72, 2.4], '#756c70');
        part('planter rim', 'box', [0, 0.8, 0], [2.55, 0.1, 2.55], '#9a9290');
        part('planter soil', 'box', [0, 0.861, 0], [2.21, 0.022, 2.21], '#514c4a');
        part('tree trunk', 'cylinder', [0, 2.19, 0], [0.26, 2.64, 0.26], '#796953');
        part('tree fork', 'cylinder', [side * 0.28, 3.29, 0.1], [0.17, 1.25, 0.17], '#796953').setLocalEulerAngles(0, 0, side * -27);
        part('lower foliage', 'sphere', [side * -0.27, 4.1, -0.12], [2.9, 3.25, 2.55], '#4c7261');
        part('outer foliage', 'sphere', [side * 0.79, 5.17, 0.7], [2.75, 3.0, 2.45], '#638372');
        part('inner foliage', 'sphere', [side * -0.69, 4.92, 0.35], [2.1, 2.7, 2.0], '#567b68');
    }
    return root;
}
