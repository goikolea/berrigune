const metaballFragSource = `
    varying vec2 vTextureCoord;
    uniform sampler2D uSampler;
    
    uniform vec3 uColor;
    
    void main(void) {
        // Obtenemos el valor alpha del blur (de 0 a 1)
        float a = texture2D(uSampler, vTextureCoord).a;
        
        // --- CONFIGURACIÓN DE SUAVIDAD ---
        
        // 1. Relleno Central (Fill)
        // Empieza suavemente a partir de 0.6 de densidad
        float fillOpacity = 0.08; // Muy clarito para ver la rejilla
        float fillMask = smoothstep(0.6, 0.9, a);
        
        // 2. Borde Suave (Glow)
        // Empieza a verse en 0.3 y termina de definirse en 0.6
        // Esto crea un "anillo" de degradado, no una línea dura.
        float borderOpacity = 0.2; // Más visible que el relleno
        
        // Calculamos la intensidad del borde:
        // Subimos de 0.3 a 0.6...
        float outerEdge = smoothstep(0.3, 0.6, a);
        // ...y restamos el centro para que el borde no se sume encima del relleno
        float borderMask = outerEdge - smoothstep(0.6, 0.9, a);

        // 3. Composición Final
        float finalAlpha = (fillMask * fillOpacity) + (borderMask * borderOpacity * outerEdge);
        
        // Recorte final para rendimiento (lo que sea muy invisible no se pinta)
        if (a < 0.25) discard;

        gl_FragColor = vec4(uColor * finalAlpha, finalAlpha);
    }
`;

export class MetaballFilter extends PIXI.Filter {
    constructor(colorHex) {
        super(null, metaballFragSource);
        this.uniforms.uColor = new Float32Array(3);
        this.setColor(colorHex);
        this.padding = 150; 
    }

    setColor(hex) {
        const r = ((hex >> 16) & 0xFF) / 255;
        const g = ((hex >> 8) & 0xFF) / 255;
        const b = (hex & 0xFF) / 255;
        this.uniforms.uColor[0] = r;
        this.uniforms.uColor[1] = g;
        this.uniforms.uColor[2] = b;
    }
}