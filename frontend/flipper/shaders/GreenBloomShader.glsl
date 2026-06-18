// GreenBloomShader - Vertex Shader
#ifdef VERTEX_SHADER
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
#endif

// GreenBloomShader - Fragment Shader
#ifdef FRAGMENT_SHADER
uniform sampler2D tDiffuse;
uniform float greenThreshold;
uniform float greenRange;
uniform float bloomIntensity;

varying vec2 vUv;

// Isolate green channel and create bloom effect
void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    
    // Extract green component
    float greenChannel = texel.g;
    
    // Create mask for green colors
    // Green pixels have high G and low R/B
    float isGreen = 0.0;
    if (greenChannel > greenThreshold) {
        float rDiff = abs(texel.r - greenChannel);
        float bDiff = abs(texel.b - greenChannel);
        
        // If red and blue are significantly lower than green, it's a green color
        if (rDiff > greenRange && bDiff > greenRange) {
            isGreen = smoothstep(0.0, 1.0, (rDiff + bDiff) * 0.5);
        }
    }
    
    // Apply bloom effect to green pixels
    vec3 bloomColor = vec3(0.0, 1.0, 0.0);
    vec3 bloom = bloomColor * isGreen * bloomIntensity;
    
    // Combine original color with bloom
    vec3 finalColor = texel.rgb + bloom;
    
    // Add glow to green areas
    float glow = isGreen * bloomIntensity * 0.5;
    finalColor += vec3(glow);
    
    gl_FragColor = vec4(finalColor, texel.a);
}
#endif
