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
            // Load sounds immediately after user interaction to ensure browser allows playback
            this.loadSounds(); 

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
        // Check if the renderer DOM element already exists to prevent duplicates on restart
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer.contains(this.renderer.domElement)) {
            gameContainer.appendChild(this.renderer.domElement);
        }

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
        // Ensure listeners are not added multiple times on restart
        if (!this.keydownListener) {
            this.keydownListener = this.onKeyDown.bind(this);
            window.addEventListener('keydown', this.keydownListener);
        }
        if (!this.keyupListener) {
            this.keyupListener = this.onKeyUp.bind(this);
            window.addEventListener('keyup', this.keyupListener);
        }
        if (!this.resizeListener) {
            this.resizeListener = this.onWindowResize.bind(this);
            window.addEventListener('resize', this.resizeListener);
        }


        // UI elements
        this.healthFill = document.getElementById('health-fill');
        this.bossHealthFill = document.getElementById('boss-health-fill');
        this.stageIndicator = document.getElementById('stage-indicator');

        // Restart buttons - Ensure listeners are not added multiple times
        const restartButton = document.getElementById('restart-button');
        const restartButtonVictory = document.getElementById('restart-button-victory');
        
        // Remove previous listeners if they exist
        restartButton.replaceWith(restartButton.cloneNode(true));
        restartButtonVictory.replaceWith(restartButtonVictory.cloneNode(true));
        
        // Add new listeners
        document.getElementById('restart-button').addEventListener('click', this.restart.bind(this));
        document.getElementById('restart-button-victory').addEventListener('click', this.restart.bind(this));
        

        // Sound effects - loading moved to click handler
        // this.loadSounds(); // Removed from here

        // Animation loop
        this.clock = new THREE.Clock();
        // Cancel previous animation frame if restarting
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.animate();
    }

    loadSounds() {
        // Prevent reloading sounds if already loaded
        if (this.sounds) return; 
        
        this.sounds = {
            playerHit: new Audio('/sounds/player_hit.mp3'),
            bossHit: new Audio('/sounds/boss_hit.mp3'),
            bossAttack: new Audio('/sounds/boss_attack.mp3'),
            bossSpecial: new Audio('/sounds/boss_special.mp3'),
            warning: new Audio('/sounds/warning.mp3'),
            gameOver: new Audio('/sounds/game_over.mp3'),
            victory: new Audio('/sounds/victory.mp3')
        };

        // Pre-load all sounds without playing
        Object.values(this.sounds).forEach(sound => {
            sound.load();
            sound.volume = 0.7; // Slightly reduce volume
        });
        
        // Small trick to potentially improve sound readiness after interaction
        // Play a silent sound immediately after user interaction
        const silentSound = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        silentSound.play().catch(e => {}); // Play and ignore errors
    }

    // Safe sound play function
    playSound(soundName) {
        // Ensure sounds are loaded before trying to play
        if (!this.sounds || !this.sounds[soundName]) {
            console.warn(`Sound "${soundName}" not loaded or does not exist.`);
            return;
        }
        
        // Reset sound to beginning if it's currently playing
        if (!this.sounds[soundName].paused) {
            this.sounds[soundName].currentTime = 0;
        } else {
            // If paused, ensure it's reset if it finished previously
            this.sounds[soundName].currentTime = 0;
        }

        const playPromise = this.sounds[soundName].play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Log specific errors, but avoid crashing the game
                 // Don't log interruption errors, as they are common when playing sounds rapidly
                if (error.name !== 'AbortError') {
                     console.warn(`Sound play failed for "${soundName}": ${error}`);
                }
            });
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
        
        // Stop any currently playing sounds abruptly
        if (this.sounds) {
            Object.values(this.sounds).forEach(sound => {
                sound.pause();
                sound.currentTime = 0;
            });
        }

        // Clear existing scene objects
        while(this.scene.children.length > 0){ 
            const object = this.scene.children[0];
            // Keep essential lights and floor if needed, or recreate them in initializeGame
            if (object.type !== 'AmbientLight' && object.type !== 'DirectionalLight') {
                 // Recursively dispose of geometry and materials
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => mat.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
            this.scene.remove(object); 
        }

        // Reset indicators array
        this.indicators = [];
        
        // Re-initialize the game state without reloading the page
        this.initialized = false; // Allow re-initialization
        this.initializeGame(); 

        // Show UI again
        document.getElementById('ui').classList.remove('hidden');
    }

    animate() {
        // Store the animation frame ID so it can be cancelled on restart
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

        const deltaTime = this.clock.getDelta();
        // Prevent large deltaTime steps if the tab was inactive
        const dt = Math.min(deltaTime, 0.1); // Cap delta time at 100ms
        
        this.update(dt);

        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
const game = new Game();

// Expose game object to window for debugging
window.game = game;