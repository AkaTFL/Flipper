
const GreenExtractionShader = {
  uniforms: {
    tDiffuse: { value: null },
    threshold: { value: 0.5 }
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float threshold;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // On garde uniquement les zones très vertes
      float isGreen = step(threshold, color.g - (color.r + color.b) * 0.5);
      gl_FragColor = vec4(color.rgb * isGreen, 1.0);
    }
  `
};