import { COLORS, WORLD } from '../config/constants.js'; // <--- Importar WORLD

export const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: COLORS.BACKGROUND,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
});

document.body.appendChild(app.view);

app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;

export const world = new PIXI.Container();
export const layers = {
    grid: new PIXI.Container(),
    zones: new PIXI.Container(),
    trails: new PIXI.Container(),
    objects: new PIXI.Container(),
    player: new PIXI.Container(),
    ui: new PIXI.Container()
};

// APLICAR TRANSPARENCIA GLOBAL A LA CAPA DE ZONAS
layers.zones.alpha = 1; 

// Orden de apilamiento
app.stage.addChild(world);
world.addChild(layers.grid);
world.addChild(layers.zones);
world.addChild(layers.trails);
world.addChild(layers.objects);
world.addChild(layers.player);

window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    app.stage.hitArea = app.screen;
});