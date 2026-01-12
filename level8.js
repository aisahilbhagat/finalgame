window.Level8 = {
    engine: null,
    targetX: 12000, // EXTENDED: Pushed far back to accommodate new zones
    player: null,
    cameraX: 0,
    time: 0,
    
    // Level Data
    platforms: [], 
    obstacles: [], 
    checkpoints: [], 
    activeCheckpoint: null,
    
    // Enemy System
    spirits: [],
    projectiles: [],
    
    // Visuals
    particles: [],
    torches: [],
    banners: [],
    
    // State
    inputBlocked: false,
    flashIntensity: 0,
    shake: 0,

    // --- SPRITE ASSETS (Hardcoded Copy from Level 7) ---
    demonSprite: [
        [0,0,0,3,0,0,0,0,3,0,0,0],
        [0,0,3,1,3,0,0,3,1,3,0,0],
        [0,3,1,1,1,3,3,1,1,1,3,0],
        [0,3,1,1,1,1,1,1,1,1,3,0],
        [0,1,1,2,1,1,1,1,2,1,1,0], 
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [3,1,1,4,4,4,4,4,4,1,1,3],
        [3,1,1,1,1,1,1,1,1,1,1,3],
        [0,3,1,1,1,1,1,1,1,1,3,0],
        [0,0,3,1,1,1,1,1,1,3,0,0],
        [0,0,0,3,1,3,3,1,3,0,0,0],
        [0,0,0,0,3,0,0,3,0,0,0,0]
    ],
    
    // Ethereal Palette (Hardcoded Copy)
    spriteColors: {
        1: '#1a2a4a', // Spiritual Navy
        2: '#ffffff', // Glowing Soul White
        3: '#001a33', // Deep Void
        4: '#00f2ff'  // Spirit Cyan
    },

    init: function(engine) {
        this.engine = engine;
        console.log("Level 8 Initialized: High Peaks (Extended)");
        this.generateAtmosphere();
    },

    load: function() {
        this.loadCharacterScript(() => {
            if (window.LevelCharacter) {
                // Start slightly higher to match the mountain theme
                this.player = new window.LevelCharacter(100, 600);
                this.setupLevel();
            } else {
                console.error("Critical: LevelCharacter failed to load.");
            }
        });
    },

    loadCharacterScript: function(callback) {
        if (window.LevelCharacter) { callback(); return; }
        const script = document.createElement('script');
        script.src = 'levelcharacter.js';
        script.onload = () => {
            if (window.LevelCharacter) callback();
            else console.error("LevelCharacter missing.");
        };
        document.body.appendChild(script);
    },

    setupLevel: function() {
        this.platforms = [];
        this.obstacles = [];
        this.spirits = [];
        this.projectiles = [];
        this.checkpoints = [];
        this.torches = [];
        this.banners = [];

        // ============================================================
        // ZONE 1: THE BASE (Safe Entry)
        // ============================================================
        this.platforms.push({ x: 0, y: 700, w: 600, h: 200, type: 'ground' });
        this.banners.push({ x: 400, y: 550, color: '#00f2ff' });

        // ============================================================
        // ZONE 2: THE SWITCHBACKS (Vertical Ascent)
        // ============================================================
        // Step 1
        this.platforms.push({ x: 700, y: 600, w: 100, h: 20, type: 'stone' });
        // Hazard: Guard on a small platform
        this.platforms.push({ x: 900, y: 500, w: 200, h: 20, type: 'stone' });
        this.obstacles.push({ 
            type: 'armor', x: 1000, y: 450, range: 80, baseSpeed: 1.5, 
            aggroRadius: 250, aggroSpeed: 3.5, cooldown: 0, 
            startX: 1000, dir: 1, state: 'patrol', hp: 4 
        });

        // Step 2 (Higher)
        this.platforms.push({ x: 750, y: 400, w: 100, h: 20, type: 'floating' });
        this.platforms.push({ x: 600, y: 300, w: 100, h: 20, type: 'floating' });
        
        // Hazard: Lava Jet blocking the vertical jump
        this.obstacles.push({ type: 'lava_jet', x: 650, y: 450, h: 200, timer: 0, interval: 140, state: 'idle' });

        // Step 3 (The Crossing)
        this.platforms.push({ x: 900, y: 250, w: 400, h: 20, type: 'bridge' });
        // Spirit Ambush
        this.spawnSpirit(1100, 50, 400); 
        this.spawnSpirit(1200, 50, 400);

        // ============================================================
        // ZONE 3: THE WINDY GAPS (Exposure)
        // ============================================================
        // Platform 1
        this.platforms.push({ x: 1500, y: 250, w: 80, h: 20, type: 'floating' });
        
        // Platform 2 (Guarded)
        this.platforms.push({ x: 1700, y: 250, w: 150, h: 20, type: 'stone' });
        this.obstacles.push({ 
            type: 'armor', x: 1775, y: 200, range: 60, baseSpeed: 2, 
            aggroRadius: 200, aggroSpeed: 5, cooldown: 0, 
            startX: 1775, dir: 1, state: 'patrol', hp: 3 
        });

        // Platform 3 (Swing Blade Danger)
        this.platforms.push({ x: 2000, y: 250, w: 80, h: 20, type: 'floating' });
        this.obstacles.push({ type: 'swing_blade', cx: 2040, cy: 0, length: 250, speed: 0.05, angle: 0, range: 0.9 });

        // ============================================================
        // CHECKPOINT 1 (The Ledge)
        // ============================================================
        this.platforms.push({ x: 2300, y: 250, w: 300, h: 400, type: 'stone' });
        this.checkpoints.push({ x: 2400, y: 250, active: false, id: 1 });
        this.torches.push({ x: 2450, y: 200 });

        // ============================================================
        // ZONE 4: THE SPIRE (High Vertical & Blades)
        // ============================================================
        this.platforms.push({ x: 2700, y: 200, w: 80, h: 20, type: 'floating' });
        this.platforms.push({ x: 2800, y: 100, w: 80, h: 20, type: 'floating' });
        
        // The Gauntlet of Blades
        this.platforms.push({ x: 3000, y: 50, w: 600, h: 20, type: 'bridge' });
        this.obstacles.push({ type: 'swing_blade', cx: 3100, cy: -200, length: 250, speed: 0.04, angle: 0, range: 1.0 });
        this.obstacles.push({ type: 'swing_blade', cx: 3300, cy: -200, length: 250, speed: 0.045, angle: 1.5, range: 1.0 });
        this.obstacles.push({ type: 'swing_blade', cx: 3500, cy: -200, length: 250, speed: 0.04, angle: 3.0, range: 1.0 });

        // Spirit pressure during the blades
        this.spawnSpirit(3300, -100, 600);
        this.spawnSpirit(3500, -100, 600);

        // ============================================================
        // ZONE 5: THE PEAKS (Maximum Altitude)
        // ============================================================
        this.platforms.push({ x: 3800, y: 50, w: 60, h: 20, type: 'floating' });
        this.platforms.push({ x: 4000, y: 0, w: 60, h: 20, type: 'floating' });
        this.platforms.push({ x: 4200, y: -50, w: 60, h: 20, type: 'floating' });
        
        // Lava Jets firing UP
        this.obstacles.push({ type: 'lava_jet', x: 3900, y: 200, h: 300, timer: 0, interval: 120, state: 'idle' });
        this.obstacles.push({ type: 'lava_jet', x: 4100, y: 150, h: 300, timer: 60, interval: 120, state: 'idle' });

        // ============================================================
        // CHECKPOINT 2 (The Summit Camp)
        // ============================================================
        this.platforms.push({ x: 4400, y: -100, w: 400, h: 500, type: 'stone' });
        this.checkpoints.push({ x: 4500, y: -100, active: false, id: 2 });
        this.banners.push({ x: 4600, y: -250, color: '#ff4444' }); 

        // ============================================================
        // ZONE 6: THE DESCENT (Controlled Fall)
        // ============================================================
        this.platforms.push({ x: 5000, y: -50, w: 200, h: 20, type: 'stone' });
        this.obstacles.push({ 
            type: 'armor', x: 5100, y: -100, range: 80, baseSpeed: 2, 
            aggroRadius: 300, aggroSpeed: 4, cooldown: 0, 
            startX: 5100, dir: -1, state: 'patrol', hp: 5 
        });

        this.platforms.push({ x: 5300, y: 50, w: 100, h: 20, type: 'floating' });
        this.platforms.push({ x: 5500, y: 150, w: 100, h: 20, type: 'floating' });
        
        // Swarm of Spirits
        this.spawnSpirit(5400, -200, 800, 20);
        this.spawnSpirit(5600, -200, 800, 20);
        this.spawnSpirit(5500, -300, 800, 20);

        // ============================================================
        // ZONE 7: THE FINAL RIDGE (The OLD Gauntlet)
        // ============================================================
        this.platforms.push({ x: 5800, y: 250, w: 1200, h: 50, type: 'bridge' });
        
        // Heavy guards
        this.obstacles.push({ 
            type: 'armor', x: 6000, y: 200, range: 150, baseSpeed: 1, 
            aggroRadius: 400, aggroSpeed: 3, cooldown: 0, 
            startX: 6000, dir: 1, state: 'patrol', hp: 6 
        });
        this.obstacles.push({ 
            type: 'armor', x: 6500, y: 200, range: 150, baseSpeed: 1, 
            aggroRadius: 400, aggroSpeed: 3, cooldown: 0, 
            startX: 6500, dir: -1, state: 'patrol', hp: 6 
        });

        // Final Swing Blades (Pre-Expansion)
        this.obstacles.push({ type: 'swing_blade', cx: 6200, cy: 0, length: 250, speed: 0.06, angle: 0, range: 1.0 });
        this.obstacles.push({ type: 'swing_blade', cx: 6600, cy: 0, length: 250, speed: 0.06, angle: 3.14, range: 1.0 });

        // Final Spirit Guardian (Pre-Expansion)
        this.spawnSpirit(6800, 50, 1000, 50);

        // ============================================================
        // EXPANSION START: INSPIRED BY LEVEL 4
        // ============================================================
        
        // Previous End Platform turned into a Connector
        this.platforms.push({ x: 7200, y: 250, w: 600, h: 200, type: 'ground' });
        this.banners.push({ x: 7600, y: 100, color: '#fff' }); // Marker for "Halfway"

        // CHECKPOINT (The Halfway Rest) - Added to fix the large gap
        this.checkpoints.push({ x: 7500, y: 250, active: false, id: 4 });
        this.torches.push({ x: 7550, y: 200 });

        // ============================================================
        // ZONE 8: THE GUILLOTINE PEAKS (Inspired by L4 Room 2)
        // ============================================================
        // A long corridor section with restricted jump height and fast blades.
        
        // Floor
        this.platforms.push({ x: 7800, y: 250, w: 1000, h: 20, type: 'stone' });
        // Ceiling (Restricts jumping)
        this.platforms.push({ x: 8000, y: 100, w: 800, h: 50, type: 'stone' });

        // Denser Swing Blades (From Level 4 style)
        // L4 had speeds 0.05/0.06. We keep that intensity.
        this.obstacles.push({ type: 'swing_blade', cx: 8000, cy: -150, length: 350, speed: 0.05, angle: 0, range: 0.8 });
        this.obstacles.push({ type: 'swing_blade', cx: 8250, cy: -150, length: 350, speed: 0.06, angle: 1.5, range: 0.8 });
        this.obstacles.push({ type: 'swing_blade', cx: 8500, cy: -150, length: 350, speed: 0.05, angle: 0.5, range: 0.8 });
        
        // Heavy Armor guarding the exit of the guillotine
        this.obstacles.push({ 
            type: 'armor', x: 8700, y: 200, range: 100, baseSpeed: 2, 
            aggroRadius: 300, aggroSpeed: 4, cooldown: 0, 
            startX: 8700, dir: -1, state: 'patrol', hp: 5 
        });

        // ============================================================
        // CHECKPOINT 3 (The Frozen Outpost)
        // ============================================================
        this.platforms.push({ x: 9000, y: 250, w: 300, h: 400, type: 'stone' });
        this.checkpoints.push({ x: 9100, y: 250, active: false, id: 3 });
        this.torches.push({ x: 9150, y: 200 });

        // ============================================================
        // ZONE 9: THE VERTICAL DRAFT (Inspired by L4 Room 3/6)
        // ============================================================
        // Vertical climb using small ledges + Steam/Ice Vents
        
        // Step 1
        this.platforms.push({ x: 9400, y: 150, w: 80, h: 20, type: 'floating' });
        // Hazard: Ice Jet (Lava Jet logic) firing horizontally like L4
        this.obstacles.push({ type: 'lava_jet', x: 9500, y: 250, h: 200, timer: 0, interval: 100, state: 'idle' }); // Fast interval

        // Step 2
        this.platforms.push({ x: 9600, y: 50, w: 80, h: 20, type: 'floating' });
        // Backtrack Jump (L4 style)
        this.platforms.push({ x: 9450, y: -50, w: 80, h: 20, type: 'floating' });
        
        // Step 3 (High Ledge)
        this.platforms.push({ x: 9700, y: -150, w: 200, h: 20, type: 'stone' });
        
        // Spirit Swarm at altitude
        this.spawnSpirit(9600, -300, 600);
        this.spawnSpirit(9800, -300, 600);

        // ============================================================
        // ZONE 10: THE SILENT ARMORY (Inspired by L4 Room 5)
        // ============================================================
        // Wide spaces, elite guards, no falling hazards, just combat.
        
        this.platforms.push({ x: 10000, y: -150, w: 1000, h: 50, type: 'bridge' });
        
        // Two Elite Guards patrolling tight (L4 Armory style)
        this.obstacles.push({ 
            type: 'armor', x: 10200, y: -200, range: 200, baseSpeed: 2, 
            aggroRadius: 400, aggroSpeed: 5, cooldown: 0, 
            startX: 10200, dir: 1, state: 'patrol', hp: 5 
        });
        this.obstacles.push({ 
            type: 'armor', x: 10600, y: -200, range: 200, baseSpeed: 2, 
            aggroRadius: 400, aggroSpeed: 5, cooldown: 0, 
            startX: 10600, dir: -1, state: 'patrol', hp: 5 
        });
        
        // Upper Walkway (L4 Room 4 style)
        this.platforms.push({ x: 10300, y: -300, w: 400, h: 20, type: 'floating' });
        // Guard on top
        this.obstacles.push({ 
            type: 'armor', x: 10500, y: -350, range: 150, baseSpeed: 1, 
            aggroRadius: 300, aggroSpeed: 4, cooldown: 0, 
            startX: 10500, dir: 1, state: 'patrol', hp: 3 
        });

        // ============================================================
        // FINAL DESCENT TO VICTORY
        // ============================================================
        this.platforms.push({ x: 11200, y: -50, w: 100, h: 20, type: 'floating' });
        this.platforms.push({ x: 11400, y: 50, w: 100, h: 20, type: 'floating' });
        
        // Final Platform
        this.platforms.push({ x: 11600, y: 250, w: 800, h: 200, type: 'ground' });
        this.targetX = 12000;
        this.banners.push({ x: 11800, y: 100, color: '#00f2ff' });
    },

    spawnSpirit: function(x, y, aggroRange, hp = 30) {
        this.spirits.push({
            x: x, y: y, 
            startY: y,
            state: 'idle', 
            timer: 0, 
            hp: hp,
            aggroRange: aggroRange,
            trail: [],
            frameOffset: Math.random() * 1000
        });
    },

    generateAtmosphere: function() {
        // High Peaks Atmosphere: More particles, faster horizontal wind
        this.particles = [];
        for(let i=0; i<120; i++) { 
            this.particles.push({
                x: Math.random() * 2000, 
                y: Math.random() * 1200 - 400, // Wider vertical range
                size: Math.random() * 2.5,
                speedX: -(Math.random() * 6 + 3), // Faster wind
                speedY: Math.random() * 1 - 0.5,
                color: '#ccf2ff', // Colder blue
                alpha: Math.random() * 0.6
            });
        }
    },

    update: function() {
        this.time += 0.05;
        if (this.flashIntensity > 0) this.flashIntensity -= 0.05;
        if (this.shake > 0) this.shake--;

        if (!this.player) return;

        this.player.update();

        // Checkpoints
        for (let cp of this.checkpoints) {
            if (!cp.active && this.player.x > cp.x) {
                cp.active = true;
                this.activeCheckpoint = cp;
                this.playSound('checkpoint');
                // Heal at checkpoint
                if (this.player.hp < this.player.maxHp) {
                    this.player.hp = Math.min(this.player.hp + 50, this.player.maxHp);
                }
            }
        }

        // Death Check (Void)
        if (this.player.y > 900 || this.player.hp <= 0) {
            this.playSound('fall');
            this.player.hp = 0;
            this.resetPlayer();
        }

        // Win Condition
        if (this.player.x >= this.targetX) {
             console.log("Level 8 Complete!");
             if (this.engine && this.engine.handleContentComplete) {
                 this.engine.handleContentComplete();
             }
        }

        // Physics & Collision
        const hitbox = this.player.hitbox || { offsetX: 0, offsetY: 0, width: 36, height: 60 };
        let pL = this.player.x + hitbox.offsetX;
        let pR = pL + hitbox.width;
        let pT = this.player.y + hitbox.offsetY;
        let pB = pT + hitbox.height;

        let groundLevel = 2000;
        
        for (let plat of this.platforms) {
            if (pR > plat.x && pL < plat.x + plat.w &&
                pB > plat.y && pT < plat.y + plat.h) {
                const floorThreshold = plat.y + Math.max(15, this.player.vy + 5);
                if (pB > floorThreshold) {
                    const overlapL = pR - plat.x;
                    const overlapR = (plat.x + plat.w) - pL;
                    if (overlapL < overlapR) this.player.x -= overlapL;
                    else this.player.x += overlapR;
                    this.player.vx = 0;
                    pL = this.player.x + hitbox.offsetX;
                    pR = pL + hitbox.width;
                }
            }
            if (pR > plat.x && pL < plat.x + plat.w) {
                 if (pB <= plat.y + 35 && this.player.vy >= 0) {
                     if (plat.y < groundLevel) groundLevel = plat.y;
                 }
            }
        }
        this.player.groundY = groundLevel;

        this.updateObstacles(pL, pR, pT, pB);
        this.updateSpirits(pL, pR, pT, pB);
        this.updateProjectiles(pL, pR, pT, pB);

        // Camera Logic
        let targetCam = this.player.x - 300;
        // Basic clamp
        this.cameraX += (targetCam - this.cameraX) * 0.1;
        if (this.cameraX < 0) this.cameraX = 0;
    },

    updateObstacles: function(pL, pR, pT, pB) {
        const cx = pL + (pR - pL)/2; 
        const cy = pT + (pB - pT)/2; 

        this.obstacles = this.obstacles.filter(o => !o.dead);

        for (let obs of this.obstacles) {
            if (obs.type === 'swing_blade') {
                const time = this.time * 20; 
                const currentAngle = Math.sin(time * obs.speed + obs.angle) * obs.range;
                const bx = obs.cx + Math.sin(currentAngle) * obs.length;
                const by = obs.cy + Math.cos(currentAngle) * obs.length;
                obs.bx = bx; obs.by = by;

                if (Math.hypot(cx - bx, cy - by) < 45) {
                     if (!this.player.isStunned) {
                        this.player.takeDamage(25, (cx > bx ? 1 : -1));
                        this.playSound('clank');
                        this.shake = 5;
                     }
                }
            }
            else if (obs.type === 'lava_jet') {
                obs.timer++;
                if (obs.timer > obs.interval) obs.timer = 0;
                // Active phase
                if (obs.timer > (obs.interval - 40)) {
                    if (pR > obs.x && pL < obs.x + 30 && pB > (obs.y - obs.h) && pT < obs.y) {
                         if (!this.player.isStunned) {
                             this.player.takeDamage(35, (this.player.facingRight ? -1 : 1));
                             this.player.vy = -12;
                         }
                    }
                }
            }
            else if (obs.type === 'armor') {
                const dist = Math.hypot(cx - obs.x, cy - obs.y);
                if (dist < obs.aggroRadius) {
                     const dir = (cx > obs.x) ? 1 : -1;
                     obs.x += dir * obs.aggroSpeed;
                     obs.dir = dir;
                } else {
                     obs.x += obs.dir * obs.baseSpeed;
                     if (Math.abs(obs.x - obs.startX) > obs.range) obs.dir *= -1;
                }

                if (Math.abs(cx - obs.x) < 30 && Math.abs(cy - obs.y) < 50) {
                    if (this.player.isAttacking) {
                        obs.hp--;
                        this.playSound('hit');
                        obs.x += (this.player.facingRight ? 15 : -15);
                        if (obs.hp <= 0) obs.dead = true;
                    } else if (!this.player.isStunned) {
                        this.player.takeDamage(20, (cx > obs.x ? 1 : -1));
                    }
                }
            }
        }
    },

    updateSpirits: function(pL, pR, pT, pB) {
        const cx = pL + (pR - pL)/2; 
        const cy = pT + (pB - pT)/2;

        this.spirits = this.spirits.filter(s => s.hp > 0);

        for (let s of this.spirits) {
            const dist = Math.hypot(cx - s.x, cy - s.y);

            // Trail Logic
            if (s.state === 'chasing' || s.state === 'charging') {
                 s.trail.unshift({ x: s.x, y: s.y, opacity: 0.5 });
                 if (s.trail.length > 5) s.trail.pop();
            }
            s.trail.forEach(t => t.opacity -= 0.05);
            s.trail = s.trail.filter(t => t.opacity > 0);

            // State Machine
            if (s.state === 'idle') {
                s.y = s.startY + Math.sin(this.time * 2 + s.frameOffset * 0.01) * 10;
                if (dist < s.aggroRange) s.state = 'chasing';
            } 
            else if (s.state === 'chasing') {
                const targetX = cx + (s.x > cx ? 150 : -150); // Keep slightly closer distance
                const targetY = cy - 80;
                s.x += (targetX - s.x) * 0.035; // Slightly faster than L7
                s.y += (targetY - s.y) * 0.035;

                s.timer++;
                if (s.timer > 70) { // Faster aggro cycle
                    s.state = 'charging';
                    s.timer = 0;
                }
            }
            else if (s.state === 'charging') {
                s.timer++; 
                if (s.timer > 35) { // Faster charge
                    s.state = 'firing';
                    s.timer = 0;
                }
            }
            else if (s.state === 'firing') {
                this.projectiles.push({
                    x: s.x, y: s.y,
                    vx: (cx - s.x) * 0.045, // Faster projectiles
                    vy: (cy - s.y) * 0.045,
                    life: 180,
                    trail: []
                });
                this.playSound('shoot');
                s.state = 'cooldown';
                s.timer = 0;
            }
            else if (s.state === 'cooldown') {
                s.timer++;
                if (s.timer > 90) { // Shorter cooldown
                    s.state = 'chasing';
                    s.timer = 0;
                }
            }

            // Damage
            if (this.player.isAttacking) {
                if (Math.hypot(cx - s.x, cy - s.y) < 50) {
                    s.hp -= 10;
                    this.playSound('hit');
                    s.x += (this.player.facingRight ? 20 : -20);
                }
            }
        }
    },

    updateProjectiles: function(pL, pR, pT, pB) {
        const cx = pL + (pR - pL)/2; 
        const cy = pT + (pB - pT)/2;

        this.projectiles = this.projectiles.filter(p => p.life > 0);
        
        for (let p of this.projectiles) {
            p.trail.unshift({x: p.x, y: p.y});
            if (p.trail.length > 5) p.trail.pop();

            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (Math.hypot(cx - p.x, cy - p.y) < 25) {
                if (!this.player.isStunned) {
                    this.player.takeDamage(15, (cx > p.x ? 1 : -1));
                    p.life = 0;
                }
            }
        }
    },

    resetPlayer: function() {
        if (this.activeCheckpoint) {
            this.player.x = this.activeCheckpoint.x;
            this.player.y = this.activeCheckpoint.y - 60;
            this.player.hp = Math.floor(this.player.maxHp * 0.75);
        } else {
            this.player.x = 100;
            this.player.y = 600;
            this.player.hp = this.player.maxHp;
        }
        
        this.player.vy = 0;
        this.player.vx = 0;
        this.player.isStunned = false;
        this.flashIntensity = 0.5;
        this.shake = 5;
    },

    playSound: function(name) {
        if (this.engine && this.engine.playSound) this.engine.playSound(name);
    },

    // --- RENDER FUNCTIONS ---

    render: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // Background: High Peaks Gradient
        const grd = ctx.createLinearGradient(0, -500, 0, h);
        grd.addColorStop(0, "#000515"); 
        grd.addColorStop(0.4, "#0a1a30"); 
        grd.addColorStop(1, "#050a10"); 
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        this.renderAtmosphere(ctx);
        ctx.restore();

        ctx.save();
        
        // Shake
        let shakeX = 0, shakeY = 0;
        if (this.shake > 0) {
            shakeX = (Math.random() - 0.5) * this.shake;
            shakeY = (Math.random() - 0.5) * this.shake;
        }

        // Camera Vertical Logic
        let camY = 0;
        if (this.player && this.player.y < 300) camY = (300 - this.player.y) * 0.8;
        
        ctx.translate(-this.cameraX + shakeX, camY + shakeY);

        // Banners
        this.banners.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x + 30, b.y);
            ctx.lineTo(b.x + 30, b.y + 80);
            ctx.lineTo(b.x + 15, b.y + 60);
            ctx.lineTo(b.x, b.y + 80);
            ctx.fill();
            // Wind effect on banner
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.fillRect(b.x, b.y + 10, 30, 5);
        });

        // Platforms
        for (let plat of this.platforms) {
            if (plat.type === 'bridge') {
                ctx.fillStyle = "#2d2d3d"; // Colder stone
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = "#3e3e4e";
                ctx.fillRect(plat.x, plat.y, plat.w, 4); 
                ctx.fillStyle = "#1a1a20";
                for(let i=0; i<plat.w; i+=20) ctx.fillRect(plat.x + i, plat.y, 2, plat.h);
            } else if (plat.type === 'floating') {
                ctx.fillStyle = "#263238";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.shadowColor = "#00f2ff"; 
                ctx.shadowBlur = 12;
                ctx.strokeStyle = "#00f2ff"; 
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = "#151520";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            }
        }

        // Torches
        this.torches.forEach(t => {
            const glow = ctx.createRadialGradient(t.x, t.y, 5, t.x, t.y, 60);
            glow.addColorStop(0, "rgba(0, 242, 255, 0.6)"); // Cyan fire
            glow.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = glow;
            ctx.fillRect(t.x - 60, t.y - 60, 120, 120);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(t.x, t.y - 5, 3 + Math.random() * 3, 0, Math.PI*2);
            ctx.fill();
        });

        // Checkpoints
        this.checkpoints.forEach(cp => {
            ctx.fillStyle = cp.active ? "#00ffaa" : "#444"; 
            ctx.fillRect(cp.x - 2, cp.y - 50, 4, 50); 
            ctx.beginPath();
            ctx.moveTo(cp.x, cp.y - 50);
            ctx.lineTo(cp.x + 30, cp.y - 45);
            ctx.lineTo(cp.x, cp.y - 40);
            ctx.fill();
        });
        
        // --- EXIT GATE RENDER ---
        this.renderExitGate(ctx);

        this.renderObstacles(ctx);
        this.renderSpirits(ctx);
        this.renderProjectiles(ctx);

        if (this.player) this.player.render(ctx);

        ctx.restore();

        // UI
        if (this.flashIntensity > 0) {
            ctx.fillStyle = `rgba(0, 242, 255, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, w, h);
        }

        if (this.player) {
            const maxHp = this.player.maxHp || 100;
            const curHp = Math.max(0, this.player.hp);
            const pct = curHp / maxHp;

            ctx.fillStyle = "#000";
            ctx.fillRect(20, 50, 204, 20);
            ctx.strokeStyle = "#00f2ff"; 
            ctx.strokeRect(20, 50, 204, 20);

            ctx.fillStyle = pct > 0.5 ? "#00f2ff" : (pct > 0.25 ? "#aa00ff" : "#ff0055"); 
            ctx.fillRect(22, 52, 200 * pct, 16);

            ctx.fillStyle = "#fff";
            ctx.font = "12px monospace";
            ctx.fillText(`SOUL: ${Math.ceil(curHp)}`, 230, 64);
        }

        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText("LEVEL 8: High Peaks", 20, 30);
    },
    
    renderExitGate: function(ctx) {
        const doorX = this.targetX;
        const doorY = 250; 
        
        ctx.fillStyle = "#111";
        ctx.fillRect(doorX, doorY - 140, 100, 140);
        
        const pulse = Math.sin(this.time * 3) * 0.2 + 0.8;
        const grad = ctx.createLinearGradient(0, doorY, 0, doorY - 120);
        grad.addColorStop(0, `rgba(0, 242, 255, ${pulse})`);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(doorX + 10, doorY - 130, 80, 130);
        
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = "#00f2ff";
        ctx.shadowBlur = 10;
        ctx.fillText("ASCEND >", doorX + 50, doorY - 160);
        ctx.restore();
    },

    renderAtmosphere: function(ctx) {
        this.particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            // Loop particles across a wider area for parallax feel
            if (p.x < -100) {
                p.x = ctx.canvas.width + 100 + Math.random() * 200;
                p.y = Math.random() * 1000 - 400;
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fillRect(p.x, p.y, p.size * 5, p.size); // Stretched for wind
        });
        ctx.globalAlpha = 1.0;
    },

    renderObstacles: function(ctx) {
        for (let obs of this.obstacles) {
            if (obs.type === 'swing_blade') {
                ctx.strokeStyle = "#889";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(obs.cx, obs.cy);
                ctx.lineTo(obs.bx, obs.by);
                ctx.stroke();
                
                ctx.save();
                ctx.translate(obs.bx, obs.by);
                const angle = Math.atan2(obs.bx - obs.cx, obs.by - obs.cy);
                ctx.rotate(-angle);
                ctx.fillStyle = "#ccd"; 
                ctx.beginPath();
                ctx.moveTo(0, 0); ctx.lineTo(-25, 50); ctx.lineTo(0, 70); ctx.lineTo(25, 50);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (obs.type === 'lava_jet') {
                 if (obs.timer > (obs.interval - 40)) {
                    const h = obs.h * 1.0; 
                    const grad = ctx.createLinearGradient(0, obs.y, 0, obs.y - h);
                    grad.addColorStop(0, "rgba(0, 0, 0, 0.8)");
                    grad.addColorStop(0.5, "rgba(0, 242, 255, 0.6)"); // Cyan energy beams
                    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                    ctx.fillStyle = grad;
                    ctx.fillRect(obs.x, obs.y - h, 30, h);
                 }
            } else if (obs.type === 'armor') {
                if (obs.dead) return;
                ctx.fillStyle = "#333";
                ctx.fillRect(obs.x - 12, obs.y - 25, 24, 45); 
                ctx.fillStyle = "#00f2ff"; 
                ctx.fillRect(obs.x - 5, obs.y - 35, 4, 4);
                ctx.fillRect(obs.x + 2, obs.y - 35, 4, 4);
            }
        }
    },

    renderSpirits: function(ctx) {
        const SCALE = 3; 
        
        for (let s of this.spirits) {
            let sx = 0, sy = 0;
            if (s.state === 'charging') {
                const intensity = (s.timer / 35) * 8; 
                sx = (Math.random() - 0.5) * intensity;
                sy = (Math.random() - 0.5) * intensity;
            }

            s.trail.forEach(t => {
                this.drawPixelSprite(ctx, t.x + sx, t.y + sy, SCALE, t.opacity * 0.4, true); 
            });

            this.drawPixelSprite(ctx, s.x + sx, s.y + sy, SCALE, 1.0, false, s.state === 'charging');
        }
    },

    drawPixelSprite: function(ctx, x, y, scale, opacity, ghostMode, isCharging) {
        ctx.save();
        ctx.translate(x - (12 * scale)/2, y - (12 * scale)/2); 
        ctx.globalAlpha = opacity;

        if (isCharging) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f2ff';
        }

        const colors = this.spriteColors;
        const sprite = this.demonSprite;

        for (let r = 0; r < 12; r++) {
            for (let c = 0; c < 12; c++) {
                const val = sprite[r][c];
                if (val !== 0) {
                    if (ghostMode) {
                        ctx.fillStyle = colors[4]; 
                    } else {
                        ctx.fillStyle = colors[val];
                    }
                    
                    if (val === 2 && isCharging) {
                         ctx.fillStyle = '#fff';
                         ctx.shadowBlur = 20;
                         ctx.shadowColor = '#00f2ff';
                    }

                    ctx.fillRect(c * scale, r * scale, scale, scale);
                    ctx.shadowBlur = 0; 
                }
            }
        }
        ctx.restore();
    },

    renderProjectiles: function(ctx) {
        for (let p of this.projectiles) {
            p.trail.forEach((t, i) => {
                 ctx.fillStyle = `rgba(0, 242, 255, ${0.4 - i * 0.1})`;
                 ctx.fillRect(t.x - 4, t.y - 4, 8, 8);
            });

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.fillStyle = "#fff";
            ctx.shadowColor = "#00f2ff";
            ctx.shadowBlur = 10;
            ctx.fillRect(-5, -5, 10, 10);
            ctx.restore();
        }
    }
};