import * as THREE from 'three';

export class Boss {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        
        // Boss attributes
        this.maxHealth = 300;
        this.health = this.maxHealth;
        this.moveSpeed = 2;
        this.attackCooldown = 3;
        this.attackTimer = 0;
        this.stage = 1;
        this.stageThresholds = [0.7, 0.4, 0.1]; // Percentage of health to trigger stage changes
        
        // Create boss body
        const bodyGeometry = new THREE.SphereGeometry(2.5, 16, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 1.0,
            metalness: 0.0,
            flatShading: true
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.set(0, 2.5, -10);
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        scene.add(this.body);
        
        // Add rocky details to body
        this.addRockyDetails(this.body);
        
        // Create boss hands
        const handGeometry = new THREE.BoxGeometry(2, 2, 2);
        const handMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 1.0,
            metalness: 0.0,
            flatShading: true
        });
        
        this.leftHand = new THREE.Mesh(handGeometry, handMaterial);
        this.leftHand.position.set(-4, 2, -10);
        this.leftHand.castShadow = true;
        this.leftHand.receiveShadow = true;
        this.addRockyDetails(this.leftHand);
        scene.add(this.leftHand);
        
        this.rightHand = new THREE.Mesh(handGeometry, handMaterial);
        this.rightHand.position.set(4, 2, -10);
        this.rightHand.castShadow = true;
        this.rightHand.receiveShadow = true;
        this.addRockyDetails(this.rightHand);
        scene.add(this.rightHand);
        
        // Hand movement patterns
        this.leftHandBasePos = new THREE.Vector3(-4, 2, 0);
        this.rightHandBasePos = new THREE.Vector3(4, 2, 0);
        this.leftHandTarget = new THREE.Vector3(-4, 2, 0);
        this.rightHandTarget = new THREE.Vector3(4, 2, 0);
        
        // Attack state
        this.attacking = false;
        this.attackType = null;
        this.attackDuration = 0;
        this.attackTimer = 0;
        
        // Movement pattern
        this.moveTarget = new THREE.Vector3(0, 2.5, -10);
        this.moveTimer = 0;
    }
    
    addRockyDetails(mesh) {
        // Add small rock protrusions to the mesh
        const count = Math.floor(Math.random() * 5) + 5;
        
        for (let i = 0; i < count; i++) {
            const size = Math.random() * 0.5 + 0.3;
            const protrusion = new THREE.Mesh(
                new THREE.BoxGeometry(size, size, size),
                new THREE.MeshStandardMaterial({ 
                    color: 0x6d4c41,
                    roughness: 1.0,
                    metalness: 0.0,
                    flatShading: true
                })
            );
            
            // Random position on the surface
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const radius = mesh.geometry.parameters.radius || 1;
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            protrusion.position.set(x, y, z);
            mesh.add(protrusion);
        }
    }
    
    update(deltaTime) {
        this.updateStage();
        
        if (!this.attacking) {
            // Move normally
            this.moveTimer -= deltaTime;
            
            if (this.moveTimer <= 0) {
                // Pick a new random position in the arena
                const x = (Math.random() - 0.5) * 30;
                const z = (Math.random() - 0.5) * 30 - 5; // Keep towards the back half
                this.moveTarget.set(x, 2.5, z);
                this.moveTimer = Math.random() * 3 + 2;
            }
            
            // Move towards target
            this.body.position.lerp(this.moveTarget, deltaTime * this.moveSpeed * 0.5);
            
            // Update hand positions to follow body
            this.leftHandTarget.set(
                this.body.position.x - 4,
                2,
                this.body.position.z
            );
            
            this.rightHandTarget.set(
                this.body.position.x + 4,
                2,
                this.body.position.z
            );
            
            this.leftHand.position.lerp(this.leftHandTarget, deltaTime * this.moveSpeed);
            this.rightHand.position.lerp(this.rightHandTarget, deltaTime * this.moveSpeed);
            
            // Check if it's time to attack
            this.attackTimer -= deltaTime;
            
            if (this.attackTimer <= 0) {
                this.chooseAttack();
            }
        } else {
            // Perform current attack
            this.attackTimer -= deltaTime;
            
            if (this.attackTimer <= 0) {
                this.attacking = false;
                this.attackTimer = Math.random() * 2 + 1;
            } else {
                this.performAttack(deltaTime);
            }
        }
        
        // Face the player
        const directionToPlayer = new THREE.Vector3()
            .subVectors(this.player.mesh.position, this.body.position)
            .setY(0)
            .normalize();
            
        if (directionToPlayer.length() > 0.001) {
            const targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z);
            this.body.rotation.y = targetRotation;
        }
        
        // Animate body
        this.body.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
        this.body.position.y = 2.5 + Math.sin(Date.now() * 0.002) * 0.3;
    }
    
    updateStage() {
        const healthPercentage = this.health / this.maxHealth;
        
        if (healthPercentage <= this.stageThresholds[0] && this.stage === 1) {
            this.stage = 2;
            this.moveSpeed += 1;
        } else if (healthPercentage <= this.stageThresholds[1] && this.stage === 2) {
            this.stage = 3;
            this.moveSpeed += 1;
        } else if (healthPercentage <= this.stageThresholds[2] && this.stage === 3) {
            this.stage = 4;
            this.moveSpeed += 1;
        }
    }
    
    chooseAttack() {
        // Choose an attack based on the stage
        const attacks = ["handSlam", "spinAttack"];
        
        if (this.stage >= 2) {
            attacks.push("handThrow");
        }
        
        if (this.stage >= 3) {
            attacks.push("rockRain");
        }
        
        if (this.stage === 4) {
            attacks.push("rockWave");
        }
        
        const attackType = attacks[Math.floor(Math.random() * attacks.length)];
        this.startAttack(attackType);
    }
    
    startAttack(attackType) {
        this.attacking = true;
        this.attackType = attackType;
        
        switch (attackType) {
            case "handSlam":
                this.attackDuration = 2.0;
                this.attackTimer = this.attackDuration;
                
                // Target hands at player position
                const playerPos = this.player.mesh.position.clone();
                this.attackTarget = playerPos;
                
                // Create warning indicator
                if (window.game) {
                    window.game.addAttackIndicator(
                        playerPos.x, 
                        playerPos.z, 
                        4, 
                        1.5,
                        15
                    );
                }
                break;
                
            case "spinAttack":
                this.attackDuration = 3.0;
                this.attackTimer = this.attackDuration;
                this.spinAngle = 0;
                this.spinRadius = 6;
                
                // Create warning indicators in a circle
                if (window.game) {
                    const center = this.body.position.clone();
                    const steps = 8;
                    for (let i = 0; i < steps; i++) {
                        const angle = (i / steps) * Math.PI * 2;
                        const x = center.x + Math.cos(angle) * this.spinRadius;
                        const z = center.z + Math.sin(angle) * this.spinRadius;
                        window.game.addAttackIndicator(x, z, 3, 2.0, 10);
                    }
                }
                break;
                
            case "handThrow":
                this.attackDuration = 2.5;
                this.attackTimer = this.attackDuration;
                this.throwHand = Math.random() > 0.5 ? "left" : "right";
                this.throwTarget = this.player.mesh.position.clone();
                
                // Create warning indicator
                if (window.game) {
                    window.game.addAttackIndicator(
                        this.throwTarget.x,
                        this.throwTarget.z,
                        3,
                        1.8,
                        20
                    );
                }
                break;
                
            case "rockRain":
                this.attackDuration = 4.0;
                this.attackTimer = this.attackDuration;
                this.rockRainTimer = 0;
                this.rockRainInterval = 0.5;
                break;
                
            case "rockWave":
                this.attackDuration = 3.0;
                this.attackTimer = this.attackDuration;
                this.waveDirection = new THREE.Vector3(
                    this.player.mesh.position.x - this.body.position.x,
                    0,
                    this.player.mesh.position.z - this.body.position.z
                ).normalize();
                
                if (window.game) {
                    const start = this.body.position.clone();
                    const distance = 40;
                    const segments = 5;
                    
                    for (let i = 1; i <= segments; i++) {
                        const t = i / segments;
                        const wavePos = new THREE.Vector3(
                            start.x + this.waveDirection.x * distance * t,
                            0,
                            start.z + this.waveDirection.z * distance * t
                        );
                        
                        window.game.addAttackIndicator(
                            wavePos.x,
                            wavePos.z,
                            5,
                            1.5 + t * 1.0, // Later ones hit later
                            15
                        );
                    }
                }
                break;
        }
    }
    
    performAttack(deltaTime) {
        const progress = 1 - (this.attackTimer / this.attackDuration);
        
        switch (this.attackType) {
            case "handSlam":
                if (progress < 0.5) {
                    // Hands rise and prepare
                    const riseHeight = 5 + progress * 5;
                    this.leftHand.position.y = riseHeight;
                    this.rightHand.position.y = riseHeight;
                    
                    // Move above player position
                    this.leftHand.position.x = this.attackTarget.x - 2;
                    this.leftHand.position.z = this.attackTarget.z;
                    
                    this.rightHand.position.x = this.attackTarget.x + 2;
                    this.rightHand.position.z = this.attackTarget.z;
                } else {
                    // Slam down
                    const slamProgress = (progress - 0.5) * 2; // 0 to 1
                    const slamHeight = 10 * (1 - slamProgress);
                    
                    this.leftHand.position.y = Math.max(2, slamHeight);
                    this.rightHand.position.y = Math.max(2, slamHeight);
                }
                break;
                
            case "spinAttack":
                // Spin hands around body
                this.spinAngle += deltaTime * 4; // Adjust speed as needed
                
                this.leftHand.position.x = this.body.position.x + Math.cos(this.spinAngle) * this.spinRadius;
                this.leftHand.position.z = this.body.position.z + Math.sin(this.spinAngle) * this.spinRadius;
                this.leftHand.position.y = 2;
                
                this.rightHand.position.x = this.body.position.x + Math.cos(this.spinAngle + Math.PI) * this.spinRadius;
                this.rightHand.position.z = this.body.position.z + Math.sin(this.spinAngle + Math.PI) * this.spinRadius;
                this.rightHand.position.y = 2;
                break;
                
            case "handThrow":
                if (progress < 0.4) {
                    // Wind up
                    const handToThrow = this.throwHand === "left" ? this.leftHand : this.rightHand;
                    handToThrow.position.y = 3 + progress * 5;
                } else if (progress < 0.8) {
                    // Throw
                    const throwProgress = (progress - 0.4) / 0.4; // 0 to 1
                    const handToThrow = this.throwHand === "left" ? this.leftHand : this.rightHand;
                    
                    handToThrow.position.lerp(this.throwTarget.clone().setY(2), throwProgress);
                } else {
                    // Return
                    const returnProgress = (progress - 0.8) / 0.2; // 0 to 1
                    const handToThrow = this.throwHand === "left" ? this.leftHand : this.rightHand;
                    const returnTarget = this.throwHand === "left" ? 
                        this.leftHandBasePos.clone().add(this.body.position) : 
                        this.rightHandBasePos.clone().add(this.body.position);
                    
                    handToThrow.position.lerp(returnTarget, returnProgress);
                }
                break;
                
            case "rockRain":
                // Periodically spawn rocks from above
                this.rockRainTimer -= deltaTime;
                
                if (this.rockRainTimer <= 0) {
                    this.rockRainTimer = this.rockRainInterval;
                    
                    // Create a rock at a random position near the player
                    const playerPos = this.player.mesh.position;
                    const offset = new THREE.Vector3(
                        (Math.random() - 0.5) * 10,
                        0,
                        (Math.random() - 0.5) * 10
                    );
                    const rockPos = playerPos.clone().add(offset);
                    
                    // Add an indicator
                    if (window.game) {
                        window.game.addAttackIndicator(
                            rockPos.x,
                            rockPos.z,
                            2,
                            0.8,
                            10
                        );
                    }
                }
                break;
                
            case "rockWave":
                // This attack is mostly handled by the indicators
                // We just make the boss perform a stomping animation
                if (progress < 0.3) {
                    // Raise hands
                    this.leftHand.position.y = 4 + progress * 4;
                    this.rightHand.position.y = 4 + progress * 4;
                    
                    // Position hands properly
                    this.leftHand.position.x = this.body.position.x - 3;
                    this.leftHand.position.z = this.body.position.z;
                    
                    this.rightHand.position.x = this.body.position.x + 3;
                    this.rightHand.position.z = this.body.position.z;
                } else if (progress < 0.4) {
                    // Slam down
                    const slamProgress = (progress - 0.3) * 10; // 0 to 1 quickly
                    
                    this.leftHand.position.y = 5 * (1 - slamProgress) + 2;
                    this.rightHand.position.y = 5 * (1 - slamProgress) + 2;
                } else {
                    // Return to normal
                    this.leftHand.position.lerp(new THREE.Vector3(
                        this.body.position.x - 4,
                        2,
                        this.body.position.z
                    ), deltaTime * 5);
                    
                    this.rightHand.position.lerp(new THREE.Vector3(
                        this.body.position.x + 4,
                        2,
                        this.body.position.z
                    ), deltaTime * 5);
                }
                break;
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
    }
}

