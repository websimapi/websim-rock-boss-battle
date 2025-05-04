import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Player } from './player.js';
import { Boss } from './boss.js';
import { createWarningIndicator, createDamageIndicator } from './utils.js';

class Game {
    constructor() {
        // Set up initial state but don't start yet
        this.initialized = false;
        this.setupStartScreen();
    }
    
    setupStartScreen() {
        // Add event listener to start button
        document.getElementById('start-button').addEventListener('click', () => {
            // Hide start screen
            document.getElementById('start-screen').classList.add('hidden');
            // Show UI
            document.getElementById('ui').classList.remove('hidden');
            // Initialize game
            this.initializeGame();
        });
    }
    
    initializeGame() {
        if (this.initialized) return;
        this.initialized = true;
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Camera setup for top-down view
        this.camera.position.set(0, 20, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Arena
        this.createArena();
        
        // Lighting
        this.setupLights();
        
        // Game objects
        this.player = new Player(this.scene);
        this.boss = new Boss(this.scene, this.player);
        
        // Game state
        this.gameOver = false;
        this.victory = false;
        
        // Attack indicators
        this.indicators = [];
        
        // Input handling
        this.keys = {};
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
        
        // Window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // UI elements
        this.healthFill = document.getElementById('health-fill');
        this.bossHealthFill = document.getElementById('boss-health-fill');
        this.stageIndicator = document.getElementById('stage-indicator');
        
        // Restart buttons
        document.getElementById('restart-button').addEventListener('click', this.restart.bind(this));
        document.getElementById('restart-button-victory').addEventListener('click', this.restart.bind(this));
        
        // Sound effects - pre-load but don't play yet
        this.loadSounds();
        
        // Animation loop
        this.clock = new THREE.Clock();
        this.animate();
    }
    
    loadSounds() {
        this.sounds = {
            playerHit: new Audio('sounds/player_hit.mp3'),
            bossHit: new Audio('sounds/boss_hit.mp3'),
            bossAttack: new Audio('sounds/boss_attack.mp3'),
            bossSpecial: new Audio('sounds/boss_special.mp3'),
            warning: new Audio('sounds/warning.mp3'),
            gameOver: new Audio('sounds/game_over.mp3'),
            victory: new Audio('sounds/victory.mp3')
        };
        
        // Pre-load all sounds without playing
        Object.values(this.sounds).forEach(sound => {
            sound.load();
            sound.volume = 0.7; // Slightly reduce volume
        });
    }
    
    // Safe sound play function
    playSound(soundName) {
        if (this.sounds[soundName]) {
            // Create a promise to handle any potential errors
            const playPromise = this.sounds[soundName].play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn(`Sound play failed: ${error}`);
                });
            }
        }
    }
    
    createArena() {
        // Arena floor
        const floorGeometry = new THREE.PlaneGeometry(40, 40);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x444444,
            roughness: 0.7,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Arena walls
        const wallHeight = 2;
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
        
        // North wall
        const northWall = new THREE.Mesh(
            new THREE.BoxGeometry(40, wallHeight, 1),
            wallMaterial
        );
        northWall.position.set(0, wallHeight / 2, -20);
        northWall.castShadow = true;
        northWall.receiveShadow = true;
        this.scene.add(northWall);
        
        // South wall
        const southWall = new THREE.Mesh(
            new THREE.BoxGeometry(40, wallHeight, 1),
            wallMaterial
        );
        southWall.position.set(0, wallHeight / 2, 20);
        southWall.castShadow = true;
        southWall.receiveShadow = true;
        this.scene.add(southWall);
        
        // East wall
        const eastWall = new THREE.Mesh(
            new THREE.BoxGeometry(1, wallHeight, 40),
            wallMaterial
        );
        eastWall.position.set(20, wallHeight / 2, 0);
        eastWall.castShadow = true;
        eastWall.receiveShadow = true;
        this.scene.add(eastWall);
        
        // West wall
        const westWall = new THREE.Mesh(
            new THREE.BoxGeometry(1, wallHeight, 40),
            wallMaterial
        );
        westWall.position.set(-20, wallHeight / 2, 0);
        westWall.castShadow = true;
        westWall.receiveShadow = true;
        this.scene.add(westWall);
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);
        
        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 15, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -25;
        directionalLight.shadow.camera.right = 25;
        directionalLight.shadow.camera.top = 25;
        directionalLight.shadow.camera.bottom = -25;
        this.scene.add(directionalLight);
    }
    
    onKeyDown(event) {
        this.keys[event.key.toLowerCase()] = true;
    }
    
    onKeyUp(event) {
        this.keys[event.key.toLowerCase()] = false;
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    update(deltaTime) {
        if (this.gameOver || this.victory) return;
        
        // Update player
        const moveDirection = new THREE.Vector3(0, 0, 0);
        
        if (this.keys['w'] || this.keys['arrowup']) moveDirection.z -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) moveDirection.z += 1;
        if (this.keys['a'] || this.keys['arrowleft']) moveDirection.x -= 1;
        if (this.keys['d'] || this.keys['arrowright']) moveDirection.x += 1;
        
        this.player.update(deltaTime, moveDirection);
        
        // Update boss
        this.boss.update(deltaTime);
        
        // Update attack indicators
        for (let i = this.indicators.length - 1; i >= 0; i--) {
            const indicator = this.indicators[i];
            indicator.timeLeft -= deltaTime;
            
            if (indicator.timeLeft <= 0) {
                this.scene.remove(indicator.mesh);
                this.indicators.splice(i, 1);
                
                // Create damage effect at this location
                if (indicator.createDamage) {
                    const damageEffect = createDamageIndicator(indicator.position.x, indicator.position.z, indicator.size);
                    this.scene.add(damageEffect);
                    
                    // Check if player is in damage zone
                    const playerPos = this.player.mesh.position;
                    const dist = Math.sqrt(
                        Math.pow(playerPos.x - indicator.position.x, 2) + 
                        Math.pow(playerPos.z - indicator.position.z, 2)
                    );
                    
                    if (dist < indicator.size / 2) {
                        this.player.takeDamage(indicator.damage || 10);
                        this.playSound('playerHit');
                    }
                    
                    // Remove damage effect after a short time
                    setTimeout(() => {
                        this.scene.remove(damageEffect);
                    }, 300);
                }
            }
        }
        
        // Update UI
        this.updateUI();
        
        // Check win/lose conditions
        if (this.player.health <= 0) {
            this.gameOver = true;
            document.getElementById('game-over').classList.remove('hidden');
            this.playSound('gameOver');
        }
        
        if (this.boss.health <= 0) {
            this.victory = true;
            document.getElementById('victory').classList.remove('hidden');
            this.playSound('victory');
        }
    }
    
    updateUI() {
        // Update health bars
        this.healthFill.style.width = `${(this.player.health / this.player.maxHealth) * 100}%`;
        this.bossHealthFill.style.width = `${(this.boss.health / this.boss.maxHealth) * 100}%`;
        
        // Update stage indicator
        this.stageIndicator.textContent = `Stage: ${this.boss.stage}`;
    }
    
    addAttackIndicator(x, z, size, duration, damage) {
        const indicator = createWarningIndicator(x, z, size);
        this.scene.add(indicator);
        
        this.indicators.push({
            mesh: indicator,
            position: { x, z },
            size: size,
            timeLeft: duration,
            createDamage: true,
            damage: damage
        });
        
        this.playSound('warning');
    }
    
    restart() {
        // Hide game over and victory screens
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('victory').classList.add('hidden');
        
        // Reset game state
        
        // Remove old player and boss
        this.scene.remove(this.player.mesh);
        this.scene.remove(this.boss.body);
        this.scene.remove(this.boss.leftHand);
        this.scene.remove(this.boss.rightHand);
        
        // Remove indicators
        for (const indicator of this.indicators) {
            this.scene.remove(indicator.mesh);
        }
        this.indicators = [];
        
        // Create new player and boss
        this.player = new Player(this.scene);
        this.boss = new Boss(this.scene, this.player);
        
        // Reset game state
        this.gameOver = false;
        this.victory = false;
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const deltaTime = this.clock.getDelta();
        this.update(deltaTime);
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
const game = new Game();

// Expose game object to window for debugging
window.game = game;