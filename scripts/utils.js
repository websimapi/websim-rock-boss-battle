import * as THREE from 'three';

export function createWarningIndicator(x, z, size) {
    const radius = size / 2;
    const geometry = new THREE.CylinderGeometry(radius, radius, 0.1, 32);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        transparent: true, 
        opacity: 0.5 
    });
    const indicator = new THREE.Mesh(geometry, material);
    indicator.position.set(x, 0.05, z);
    indicator.rotation.x = Math.PI / 2;
    
    // Add pulse animation
    const startTime = Date.now();
    function animate() {
        const elapsed = (Date.now() - startTime) / 1000;
        const scale = 1 + Math.sin(elapsed * 5) * 0.2;
        indicator.scale.set(scale, 1, scale);
        requestAnimationFrame(animate);
    }
    animate();
    
    return indicator;
}

export function createDamageIndicator(x, z, size) {
    const radius = size / 2;
    const geometry = new THREE.CylinderGeometry(radius, radius, 0.1, 32);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xffff00, 
        transparent: true, 
        opacity: 0.7 
    });
    const indicator = new THREE.Mesh(geometry, material);
    indicator.position.set(x, 0.06, z);
    indicator.rotation.x = Math.PI / 2;
    return indicator;
}

