import * as THREE from 'three';

export class Player {
    constructor(scene) {
        // Player attributes
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.moveSpeed = 10;
        this.size = 0.8;
        this.invulnerable = false;
        this.invulnerableTime = 1.0; // seconds
        
        // Create player mesh
        const geometry = new THREE.CylinderGeometry(this.size, this.size, 1.5, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0x3498db });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 0.75, 10);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        scene.add(this.mesh);
        
        // Add a directional indicator (facing forward)
        const indicatorGeometry = new THREE.ConeGeometry(0.3, 0.5, 8);
        const indicatorMaterial = new THREE.MeshStandardMaterial({ color: 0xecf0f1 });
        this.indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        this.indicator.rotation.x = Math.PI / 2;
        this.indicator.position.set(0, 0.75, -this.size - 0.1);
        this.mesh.add(this.indicator);
    }
    
    update(deltaTime, moveDirection) {
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
            
            // Apply movement
            this.mesh.position.x += moveDirection.x * this.moveSpeed * deltaTime;
            this.mesh.position.z += moveDirection.z * this.moveSpeed * deltaTime;
            
            // Update rotation to face movement direction
            if (moveDirection.x !== 0 || moveDirection.z !== 0) {
                this.mesh.rotation.y = Math.atan2(moveDirection.x, -moveDirection.z);
            }
            
            // Constrain to arena bounds with some buffer
            const arenaSize = 19;
            this.mesh.position.x = Math.max(-arenaSize, Math.min(arenaSize, this.mesh.position.x));
            this.mesh.position.z = Math.max(-arenaSize, Math.min(arenaSize, this.mesh.position.z));
        }
        
        // Flash effect when invulnerable
        if (this.invulnerable) {
            this.invulnerableTime -= deltaTime;
            this.mesh.visible = Math.floor(this.invulnerableTime * 10) % 2 === 0;
            
            if (this.invulnerableTime <= 0) {
                this.invulnerable = false;
                this.mesh.visible = true;
            }
        }
    }
    
    takeDamage(amount) {
        if (this.invulnerable) return;
        
        this.health -= amount;
        if (this.health < 0) this.health = 0;
        
        // Become invulnerable briefly
        this.invulnerable = true;
        this.invulnerableTime = 1.0;
    }
}

