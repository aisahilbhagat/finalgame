window.Level3 = {
    engine: null,
    targetX: 4200, // End of level trigger
    player: null,
    cameraX: 0,
    time: 0,
    
    // Level Data
    platforms: [], 
    obstacles: [], 
    checkpoints: [], 
    activeCheckpoint: null, 
    
    // Boss State
    boss: null,
    bossArenaActive: false,
    
    // Visuals
    particles: [],
    torches: [],
    
    // State for control suppression (Cutscenes/Damage)
    inputBlocked: false,
    flashIntensity: 0,
    shake: 0,

    init: function(engine) {
        this.engine = engine;
        console.log("Level 3 Initialized: The Magma Keep (Attrition Mode)");
        // Initialize simple ambient particles (embers)
        this.generateEmbers();
    },

    load: function() {
        this.loadCharacterScript(() => {
            if (window.LevelCharacter) {
                // Spawn Player
                this.player = new window.LevelCharacter(100, 600);
                this.setupLevel();
                this.setupBoss();
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
        // --- 1. PLATFORMS (Difficulty: 8) ---
        // Theme: Castle Interior. Dark stone, lava below.
        
        this.platforms = [
            // STARTING ZONE (Safe)
            { x: 0, y: 700, w: 400, h: 200, type: 'ground' },

            // SECTION 1: The Hall of Blades
            // Tighter gaps, timing based on swinging axes (obstacles)
            { x: 450, y: 650, w: 80, h: 300, type: 'stone' },
            { x: 650, y: 600, w: 80, h: 350, type: 'stone' },
            { x: 850, y: 550, w: 80, h: 400, type: 'stone' },
            
            // The "Bridge" (Crumbling visuals)
            { x: 1050, y: 550, w: 300, h: 40, type: 'bridge' }, 
            
            // SECTION 2: The Vertical Climb
            // Requiring precise jumps
            { x: 1450, y: 500, w: 100, h: 40, type: 'floating' },
            { x: 1650, y: 400, w: 80, h: 40, type: 'floating' },
            { x: 1850, y: 300, w: 80, h: 40, type: 'floating' },
            
            // Mid-Check Platform
            { x: 2050, y: 300, w: 200, h: 40, type: 'stone' },

            // SECTION 3: The Descent to the Arena
            // Small platforms over a massive lava pit
            { x: 2350, y: 350, w: 60, h: 20, type: 'floating' },
            { x: 2500, y: 400, w: 60, h: 20, type: 'floating' },
            { x: 2650, y: 450, w: 60, h: 20, type: 'floating' },

            // BOSS ARENA (Wide flat area)
            // x: 2800 to 3800
            { x: 2800, y: 550, w: 1000, h: 250, type: 'arena_floor' },
            
            // Arena Platforms (For dodging boss shockwaves)
            { x: 2900, y: 400, w: 100, h: 20, type: 'floating' },
            { x: 3200, y: 350, w: 100, h: 20, type: 'floating' }, // High center
            { x: 3500, y: 400, w: 100, h: 20, type: 'floating' },

            // EXIT GATE (Unlock after boss)
            { x: 3900, y: 550, w: 400, h: 250, type: 'ground' }
        ];

        // --- CHECKPOINTS RESTORED ---
        this.checkpoints = [
            { x: 1050, y: 550, active: false, id: 1 }, // Before bridge
            { x: 2050, y: 300, active: false, id: 2 }, // Top of climb
            { x: 2850, y: 550, active: false, id: 3 }  // Arena entrance
        ];

        // --- 2. OBSTACLES ---
        this.obstacles = [
            // A. PENDULUM BLADES (The Hall)
            // High damage swinging obstacles
            { type: 'swing_blade', cx: 550, cy: 100, length: 350, speed: 0.04, angle: 0, range: 0.6 },
            { type: 'swing_blade', cx: 750, cy: 100, length: 350, speed: 0.05, angle: 1, range: 0.6 },
            { type: 'swing_blade', cx: 950, cy: 100, length: 350, speed: 0.04, angle: 0.5, range: 0.6 },

            // B. LAVA JETS (The Bridge)
            // Timed hazards shooting up from below
            { type: 'lava_jet', x: 1100, y: 600, h: 150, timer: 0, interval: 120, state: 'idle' },
            { type: 'lava_jet', x: 1250, y: 600, h: 150, timer: 60, interval: 120, state: 'idle' },

            // C. CURSED ARMOR (Ghosts from L2, reskinned, faster)
            { 
                type: 'armor', x: 1650, y: 350, range: 100, baseSpeed: 2, 
                aggroRadius: 150, aggroSpeed: 4.0, cooldown: 0, 
                startX: 1650, dir: 1, state: 'patrol', hp: 1 
            },

            // D. LAVA FLOOR (Instant Death Zone)
            // Implicit: y > 800 is death, but we visualize it
        ];

        // Torch locations for atmosphere
        this.torches = [
            { x: 200, y: 650 }, { x: 1050, y: 500 }, { x: 2050, y: 250 },
            { x: 2800, y: 500 }, { x: 3800, y: 500 }
        ];
    },

    setupBoss: function() {
        // --- MAGMA GOLEM DATA ---
        this.boss = {
            active: false,
            dead: false,
            x: 3500,
            y: 450,
            vx: 0, 
            vy: 0,
            hp: 500,
            maxHp: 500,
            invulnTimer: 0, 
            state: 'idle', 
            timer: 0,
            facingRight: false,
            width: 120, 
            height: 120,
            
            // Animation props
            pulse: 0,
            walkCycle: 0,
            particles: [],
            
            // Visual Config
            pixelSize: 10,
            colors: {
                ROCK: "#4a4a4a", ROCK_DARK: "#2a2a2a", ROCK_LIGHT: "#6a6a6a",
                LAVA_CORE: "#ff3300", LAVA_MID: "#ff8800", LAVA_HOT: "#ffffaa",
                EYE_IDLE: "#ffcc00", EYE_ANGRY: "#ff0000"
            },
            
            // Logic Methods
            takeDamage: function(amount) {
                if (this.state === 'dead') return;
                this.hp -= amount;
                this.pulse += 2; // Visual flair
                if (this.hp <= 0) {
                    this.state = 'dead';
                    this.dead = true; // Sets dead flag for camera
                    this.timer = 0;
                }
            }
        };

        // Golem Matrix (0:Empty, 1:Rock, 2:Lava, 3:Eye, 4:DarkRock, 5:LightRock)
        this.boss.grid = [
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,1,5,1,1,5,1,0,0,0], // Head
            [0,0,1,1,1,1,1,1,1,1,0,0],
            [0,1,1,4,3,4,4,3,4,1,1,0], // Eyes
            [0,1,4,4,4,4,4,4,4,4,1,0],
            [1,1,1,2,2,2,2,2,2,1,1,1], // Chest/Lava
            [1,1,2,2,2,2,2,2,2,2,1,1],
            [1,1,2,2,2,2,2,2,2,2,1,1],
            [0,1,1,2,2,2,2,2,2,1,1,0],
            [0,0,1,1,1,1,1,1,1,1,0,0], // Waist
            [0,0,1,1,0,0,0,0,1,1,0,0], // Legs
            [0,1,1,1,0,0,0,0,1,1,1,0]  // Feet
        ];
    },

    generateEmbers: function() {
        this.particles = [];
        for(let i=0; i<30; i++) {
            this.particles.push({
                x: Math.random() * 2000, 
                y: Math.random() * 800, 
                size: Math.random() * 3 + 1,
                speedY: -Math.random() * 1.5 - 0.5,
                life: Math.random() * 100,
                color: Math.random() > 0.5 ? '#ff4500' : '#ff8c00'
            });
        }
    },

    update: function() {
        this.time += 0.05;
        if (this.flashIntensity > 0) this.flashIntensity -= 0.05;
        if (this.shake > 0) this.shake--;

        if (!this.player) return;

        // --- PLAYER UPDATE ---
        this.player.update();

        // --- CHECKPOINT LOGIC ---
        for (let cp of this.checkpoints) {
            if (!cp.active && this.player.x > cp.x) {
                cp.active = true;
                this.activeCheckpoint = cp;
                // Optional: Heal at checkpoint on first touch
                if (this.player.hp < this.player.maxHp) this.player.hp = this.player.maxHp;
            }
        }

        // --- DEATH CHECK ---
        if (this.player.hp <= 0) {
            this.resetPlayer();
        }

        // --- BOSS TRIGGER ---
        if (!this.bossArenaActive && this.player.x > 2700 && !this.boss.dead) {
            this.bossArenaActive = true;
            this.boss.active = true;
        }

        // --- BOSS LOGIC ---
        this.updateBoss();

        // --- PHYSICS & COLLISION (HARDCODED COPY) ---
        // 1. Horizontal
        const hitbox = this.player.hitbox || { offsetX: 0, offsetY: 0, width: 36, height: 60 };
        let pLeft = this.player.x + hitbox.offsetX;
        let pRight = pLeft + hitbox.width;
        let pTop = this.player.y + hitbox.offsetY;
        let pBottom = pTop + hitbox.height;
        let pVelY = this.player.vy || 0;

        for (let plat of this.platforms) {
            if (pRight > plat.x && pLeft < plat.x + plat.w &&
                pBottom > plat.y && pTop < plat.y + plat.h) {
                
                const floorThreshold = plat.y + Math.max(15, pVelY + 5);
                if (pBottom > floorThreshold) {
                    const overlapL = pRight - plat.x;
                    const overlapR = (plat.x + plat.w) - pLeft;
                    if (overlapL < overlapR) this.player.x -= overlapL;
                    else this.player.x += overlapR;
                    this.player.vx = 0;
                    pLeft = this.player.x + hitbox.offsetX;
                    pRight = pLeft + hitbox.width;
                }
            }
        }

        // 2. Vertical
        let groundLevel = 1000; // Death pit default
        for (let plat of this.platforms) {
            if (pRight > plat.x && pLeft < plat.x + plat.w) {
                if (pBottom <= plat.y + 35) {
                    if (plat.y < groundLevel) groundLevel = plat.y;
                }
            }
        }
        this.player.groundY = groundLevel;

        this.updateObstacles(hitbox, pLeft, pRight, pTop, pBottom);

        // --- CAMERA ---
        // Locking camera in boss arena
        if (this.bossArenaActive && !this.boss.dead) {
            // Smooth lerp to center arena
            const targetCam = 2800; // Arena start
            this.cameraX += (targetCam - this.cameraX) * 0.05;
        } else {
            // Normal follow
            const targetCam = Math.max(0, this.player.x - 300);
            this.cameraX += (targetCam - this.cameraX) * 0.1;
        }

        // --- DEATH & WIN ---
        if (this.player.y > 800) {
            // Lava death
            this.playSound('burn');
            this.player.hp = 0; // Force death logic
            this.resetPlayer();
        }

        if (this.player.x >= this.targetX) {
             console.log("Level 3 Complete!");
             if (this.engine && this.engine.handleContentComplete) {
                 this.engine.handleContentComplete();
             }
        }
    },

    updateBoss: function() {
        if (!this.boss || !this.boss.active || this.boss.dead) return;

        const b = this.boss;
        const p = this.player;
        const dt = 16; // Assumed roughly 60fps

        b.pulse += 0.05;
        b.timer -= dt;

        // Hitbox for Boss
        const bRect = { x: b.x - 60, y: b.y - 60, w: 120, h: 120 };
        const pRect = { x: p.x + 18, y: p.y + 6, w: 36, h: 60 };

        // 1. PLAYER ATTACKING BOSS
        if (p.isAttacking) {
            // Check intersection
            if (pRect.x < bRect.x + bRect.w && pRect.x + pRect.w > bRect.x &&
                pRect.y < bRect.y + bRect.h && pRect.y + pRect.h > bRect.y) {
                
                if (b.invulnTimer <= 0) {
                    b.takeDamage(25); // 20 hits to kill
                    b.invulnTimer = 30; // 0.5s invuln
                    this.playSound('hit');
                    // Knockback boss slightly
                    b.x += (p.x < b.x) ? 5 : -5;
                }
            }
        }
        if (b.invulnTimer > 0) b.invulnTimer--;

        // 2. STATE MACHINE
        const dist = Math.abs(p.x - b.x);
        const dir = (p.x > b.x) ? 1 : -1;
        b.facingRight = (dir > 0);

        // SPEED MULTIPLIER (Enraged < 150HP)
        const speedMult = (b.hp < 150) ? 1.5 : 1.0;

        switch (b.state) {
            case 'idle':
                // Regen timer or decide action
                if (b.timer <= 0) {
                    const r = Math.random();
                    if (r < 0.6) {
                        b.state = 'chase';
                        b.timer = 2000;
                    } else {
                        b.state = 'tell_smash';
                        b.timer = 1000; // 1s telegraph
                    }
                }
                break;

            case 'chase':
                b.x += dir * 2.5 * speedMult;
                b.walkCycle += 0.1;
                
                // Contact Damage
                if (Math.abs(p.x - b.x) < 50 && Math.abs(p.y - b.y) < 80) {
                    if (!p.isStunned) {
                        p.takeDamage(20, dir);
                        this.flashIntensity = 0.5;
                        this.shake = 10;
                    }
                }

                if (b.timer <= 0) {
                    b.state = 'idle';
                    b.timer = 1000;
                }
                break;

            case 'tell_smash':
                // Visual telegraph: stops moving, shakes
                if (b.timer <= 0) {
                    b.state = 'smash';
                    b.vy = -12; // Jump
                }
                break;

            case 'smash':
                // In air
                b.vy += 0.8; // Gravity
                b.y += b.vy;
                
                // Ground collision
                if (b.y >= 450) {
                    b.y = 450;
                    b.vy = 0;
                    b.state = 'idle';
                    b.timer = 1500;
                    
                    // SPAWN SHOCKWAVES
                    this.shake = 20;
                    this.playSound('boom');
                    // Left wave
                    this.obstacles.push({
                        type: 'shockwave', x: b.x - 40, y: b.y + 50, dir: -1, 
                        speed: 6 * speedMult, life: 100, w: 30, h: 40 
                    });
                    // Right wave
                    this.obstacles.push({
                        type: 'shockwave', x: b.x + 40, y: b.y + 50, dir: 1, 
                        speed: 6 * speedMult, life: 100, w: 30, h: 40 
                    });
                }
                break;
        }

        // Boss Particles (Smoke/Lava)
        if (Math.random() > 0.7) {
            b.particles.push({
                x: b.x + (Math.random() * 80 - 40),
                y: b.y + (Math.random() * 80 - 40),
                vx: (Math.random() - 0.5),
                vy: -Math.random() * 2,
                life: 1.0,
                color: (b.hp < 150) ? '#ff0000' : '#888'
            });
        }
    },

    updateObstacles: function(hitbox, pL, pR, pT, pB) {
        const cx = pL + (pR - pL)/2; 
        const cy = pT + (pB - pT)/2; 

        // Cleanup dead obstacles
        this.obstacles = this.obstacles.filter(o => !o.dead);

        for (let obs of this.obstacles) {
            // A. SWING BLADE
            if (obs.type === 'swing_blade') {
                const time = this.time * 20; 
                const currentAngle = Math.sin(time * obs.speed + obs.angle) * obs.range;
                const bx = obs.cx + Math.sin(currentAngle) * obs.length;
                const by = obs.cy + Math.cos(currentAngle) * obs.length;
                obs.bx = bx; obs.by = by; // Store for render

                // Collision Line
                if (Math.hypot(cx - bx, cy - by) < 30) {
                     if (!this.player.isStunned) {
                        this.player.takeDamage(30, (cx > bx ? 1 : -1));
                        this.playSound('clank');
                     }
                }
            }
            // B. LAVA JET
            else if (obs.type === 'lava_jet') {
                obs.timer++;
                if (obs.timer > obs.interval) obs.timer = 0;
                
                // Active phase: 80-120
                if (obs.timer > (obs.interval - 40)) {
                    // Check Hit
                    if (pR > obs.x && pL < obs.x + 30 && pB > (obs.y - obs.h)) {
                         if (!this.player.isStunned) {
                             this.player.takeDamage(40, (this.player.facingRight ? -1 : 1));
                             this.player.vy = -10; // Launch up
                         }
                    }
                }
            }
            // C. SHOCKWAVE (Boss Attack)
            else if (obs.type === 'shockwave') {
                obs.x += obs.dir * obs.speed;
                obs.life--;
                if (obs.life <= 0) obs.dead = true;

                // Collision
                if (Math.abs(cx - obs.x) < 20 && Math.abs(pB - obs.y) < 30) {
                     if (!this.player.isStunned) {
                        this.player.takeDamage(15, obs.dir);
                     }
                }
            }
            // D. ARMOR (Enemy)
            else if (obs.type === 'armor') {
                if (obs.hp <= 0) continue;
                // Patrol/Aggro Logic (Simplified copy from Ghost)
                const dist = Math.hypot(cx - obs.x, cy - obs.y);
                if (dist < obs.aggroRadius) {
                     const dir = (cx > obs.x) ? 1 : -1;
                     obs.x += dir * obs.aggroSpeed;
                } else {
                     obs.x += obs.dir * obs.baseSpeed;
                     if (Math.abs(obs.x - obs.startX) > obs.range) obs.dir *= -1;
                }

                // Collision
                if (Math.abs(cx - obs.x) < 25 && Math.abs(cy - obs.y) < 40) {
                    if (this.player.isAttacking) {
                        obs.hp = 0; // One hit kill
                        obs.dead = true;
                        this.playSound('hit');
                    } else if (!this.player.isStunned) {
                        this.player.takeDamage(10, (cx > obs.x ? 1 : -1));
                    }
                }
            }
        }
    },

    resetPlayer: function() {
        // RESPAWN AT CHECKPOINT OR START
        if (this.activeCheckpoint) {
            this.player.x = this.activeCheckpoint.x;
            this.player.y = this.activeCheckpoint.y - 60;
        } else {
            this.player.x = 100;
            this.player.y = 600;
        }
        
        // RESTORE HEALTH (Full Hearts)
        this.player.hp = this.player.maxHp;
        
        this.player.vy = 0;
        this.player.vx = 0;
        this.player.isStunned = false;
        this.flashIntensity = 0.5;
        this.shake = 5;
        
        // --- FIXED BOSS RESPAWN LOGIC ---
        // If died in arena, DO NOT regenerate boss health.
        if (this.bossArenaActive && !this.boss.dead) {
            // Keep HP
            // Reset position to avoid spawn-camping the player
            this.boss.x = 3500;
            this.boss.y = 450;
            this.boss.state = 'idle';
            this.boss.invulnTimer = 0; // Ensure he is hittable again immediately
            
            // Note: bossArenaActive remains true, so UI stays up and fight continues
        }
    },

    playSound: function(name) {
        // Placeholder for engine sound
        if (this.engine && this.engine.playSound) this.engine.playSound(name);
    },

    // --- RENDER ---
    render: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // 1. BACKGROUND (The Magma Keep)
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#110505"); 
        grd.addColorStop(0.5, "#220a0a"); 
        grd.addColorStop(1, "#441100"); // Lava glow at bottom
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        // 2. PARALLAX EMBERS
        ctx.save();
        this.updateAndRenderEmbers(ctx);
        ctx.restore();

        // 3. WORLD
        ctx.save();
        
        // Screen Shake
        let shakeX = 0, shakeY = 0;
        if (this.shake > 0) {
            shakeX = (Math.random() - 0.5) * this.shake;
            shakeY = (Math.random() - 0.5) * this.shake;
        }
        ctx.translate(-this.cameraX + shakeX, shakeY);

        // A. Torches
        this.torches.forEach(t => {
            // Glow
            const glow = ctx.createRadialGradient(t.x, t.y, 5, t.x, t.y, 60);
            glow.addColorStop(0, "rgba(255, 150, 0, 0.6)");
            glow.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = glow;
            ctx.fillRect(t.x - 60, t.y - 60, 120, 120);
            // Stand
            ctx.fillStyle = "#444";
            ctx.fillRect(t.x - 2, t.y, 4, 30);
            // Flame
            ctx.fillStyle = (Math.random() > 0.2) ? "#ffaa00" : "#ff4400";
            ctx.beginPath();
            ctx.arc(t.x, t.y - 5, 4 + Math.random()*2, 0, Math.PI*2);
            ctx.fill();
        });

        // B. Platforms
        for (let plat of this.platforms) {
            if (plat.type === 'arena_floor') {
                ctx.fillStyle = "#1a1010";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                // Runes on floor
                ctx.fillStyle = "#331111";
                ctx.fillRect(plat.x + 100, plat.y + 10, plat.w - 200, 5);
            } else if (plat.type === 'bridge') {
                ctx.fillStyle = "#3e2723";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                // Cracks
                ctx.fillStyle = "#110000";
                ctx.beginPath();
                ctx.moveTo(plat.x + 50, plat.y);
                ctx.lineTo(plat.x + 60, plat.y + 20);
                ctx.stroke();
            } else {
                ctx.fillStyle = "#262020"; // Dark Stone
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = "#4a3b3b";
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
            }
        }

        // --- NEW: RENDER EXIT GATE ---
        this.renderExitGate(ctx);

        // C. Checkpoints (Render Logic Restored)
        this.checkpoints.forEach(cp => {
            if (cp.active) {
                ctx.fillStyle = "#00ff00"; // Lit Green
                ctx.shadowBlur = 10;
                ctx.shadowColor = "lime";
            } else {
                ctx.fillStyle = "#555"; // Inactive Grey
                ctx.shadowBlur = 0;
            }
            ctx.fillRect(cp.x - 5, cp.y - 40, 10, 40); // Pole
            // Flag/Light
            ctx.beginPath();
            ctx.arc(cp.x, cp.y - 45, 6, 0, Math.PI*2); 
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // D. Obstacles
        this.renderObstacles(ctx);

        // D. Boss
        if (this.boss && this.boss.active && !this.boss.dead) {
            this.renderBoss(ctx);
        }

        // E. Player
        if (this.player) this.player.render(ctx);

        ctx.restore();

        // 4. UI / HUD
        // Flash Effect
        if (this.flashIntensity > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, w, h);
        }

        // --- PLAYER HEALTH BAR (HUD) ---
        if (this.player) {
            const maxHp = this.player.maxHp || 100;
            const curHp = Math.max(0, this.player.hp);
            const pct = curHp / maxHp;

            // Bar Container
            ctx.fillStyle = "#111";
            ctx.fillRect(20, 50, 204, 20);
            ctx.strokeStyle = "#555";
            ctx.strokeRect(20, 50, 204, 20);

            // Red Health
            ctx.fillStyle = "#d32f2f"; 
            ctx.fillRect(22, 52, 200 * pct, 16);

            // Text
            ctx.fillStyle = "#fff";
            ctx.font = "12px monospace";
            ctx.fillText(`HP: ${Math.ceil(curHp)}`, 230, 64);
        }

        // Boss Health Bar
        if (this.bossArenaActive && !this.boss.dead) {
            const barW = 400;
            const barX = (w - barW) / 2;
            const barY = h - 50;
            
            ctx.fillStyle = "black";
            ctx.fillRect(barX - 4, barY - 4, barW + 8, 28);
            ctx.fillStyle = "#400";
            ctx.fillRect(barX, barY, barW, 20);
            ctx.fillStyle = "#f00";
            const hpPct = Math.max(0, this.boss.hp / this.boss.maxHp);
            ctx.fillRect(barX, barY, barW * hpPct, 20);
            
            ctx.fillStyle = "white";
            ctx.font = "bold 14px sans-serif";
            ctx.fillText("MAGMA GOLEM", barX + 10, barY + 15);
        }

        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText("LEVEL 3: The Magma Keep (IRONMAN)", 20, 30);
    },

    renderExitGate: function(ctx) {
        // Position on the final platform (platform starts at 3900, w=400)
        const gateX = 4100;
        const gateY = 550; // Floor Y
        
        // Archway Frame
        ctx.fillStyle = "#222";
        ctx.fillRect(gateX - 60, gateY - 140, 120, 140);
        
        // Inner Doorway
        if (this.boss && this.boss.dead) {
            // OPEN (Victory)
            ctx.fillStyle = "#000"; // Void
            ctx.fillRect(gateX - 40, gateY - 120, 80, 120);
            
            // Magical Swirl
            const time = this.time * 5;
            ctx.strokeStyle = "#00ffff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(gateX, gateY - 60);
            for(let i=0; i<10; i++) {
                ctx.lineTo(
                    gateX + Math.sin(time + i)*30, 
                    gateY - 60 + Math.cos(time + i)*30
                );
            }
            ctx.stroke();

            // Sign
            ctx.fillStyle = "white";
            ctx.font = "bold 20px monospace";
            ctx.fillText("VICTORY this way > keep walking", gateX - 40, gateY - 160);
        } else {
            // CLOSED (Bars)
            ctx.fillStyle = "#422"; // Dark wood
            ctx.fillRect(gateX - 40, gateY - 120, 80, 120);
            ctx.strokeStyle = "#111";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(gateX, gateY - 120);
            ctx.lineTo(gateX, gateY);
            ctx.stroke();
            
            // Lock
            ctx.fillStyle = "#aa0000"; // Red magic lock
            ctx.beginPath();
            ctx.arc(gateX, gateY - 60, 10, 0, Math.PI*2);
            ctx.fill();
        }
    },

    updateAndRenderEmbers: function(ctx) {
        this.particles.forEach(p => {
            p.y += p.speedY;
            p.x += Math.sin(this.time + p.y * 0.01);
            if (p.y < 0) {
                p.y = ctx.canvas.height;
                p.x = this.cameraX + Math.random() * 800; // Reuse near camera
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        ctx.globalAlpha = 1.0;
    },

    renderObstacles: function(ctx) {
        for (let obs of this.obstacles) {
            if (obs.type === 'swing_blade') {
                // Rope
                ctx.strokeStyle = "#555";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(obs.cx, obs.cy);
                ctx.lineTo(obs.bx, obs.by);
                ctx.stroke();
                
                // Blade
                ctx.save();
                ctx.translate(obs.bx, obs.by);
                // Rotate based on angle (approx)
                const angle = Math.atan2(obs.bx - obs.cx, obs.by - obs.cy);
                ctx.rotate(-angle);
                
                ctx.fillStyle = "#aaa";
                ctx.beginPath();
                ctx.arc(0, 0, 30, 0, Math.PI, true); // Semicircle blade
                ctx.fill();
                ctx.restore();
            }
            else if (obs.type === 'lava_jet') {
                ctx.fillStyle = "#330000"; // Spout
                ctx.fillRect(obs.x, obs.y, 30, 10);
                
                if (obs.timer > (obs.interval - 40)) {
                    // Erupting
                    const height = obs.h * (Math.random() * 0.2 + 0.8);
                    const grad = ctx.createLinearGradient(0, obs.y, 0, obs.y - height);
                    grad.addColorStop(0, "#ffaa00");
                    grad.addColorStop(1, "#ff0000");
                    ctx.fillStyle = grad;
                    ctx.fillRect(obs.x + 5, obs.y - height, 20, height);
                } else if (obs.timer > (obs.interval - 60)) {
                    // Warning bubbles
                    ctx.fillStyle = "orange";
                    ctx.beginPath();
                    ctx.arc(obs.x + 15, obs.y - 5, Math.random() * 5, 0, Math.PI*2);
                    ctx.fill();
                }
            }
            else if (obs.type === 'shockwave') {
                ctx.fillStyle = "#ffaa00";
                ctx.fillRect(obs.x, obs.y - obs.h, obs.w, obs.h);
                ctx.fillStyle = "#ffff00";
                ctx.fillRect(obs.x + 5, obs.y - obs.h + 5, obs.w - 10, obs.h - 10);
            }
            else if (obs.type === 'armor') {
                if (obs.dead) return;
                ctx.fillStyle = "#555"; // Grey Armor
                // Body
                ctx.fillRect(obs.x - 10, obs.y - 20, 20, 40);
                // Head
                ctx.fillStyle = "#333";
                ctx.fillRect(obs.x - 8, obs.y - 35, 16, 15);
                // Eyes (Glowing purple)
                ctx.fillStyle = "#a0f";
                ctx.fillRect(obs.x - 4, obs.y - 30, 3, 3);
                ctx.fillRect(obs.x + 1, obs.y - 30, 3, 3);
                // Sword
                ctx.fillStyle = "#ccc";
                ctx.fillRect(obs.x + 10, obs.y - 10, 4, 30);
            }
        }
    },

    renderBoss: function(ctx) {
        const b = this.boss;
        const scale = 10; // 10x scale for pixel art
        
        ctx.save();
        
        // Translate to Center Bottom of Sprite
        // Sprite is 12x12 pixels @ 10x scale = 120x120
        ctx.translate(b.x, b.y - 60); // Adjust Y to center
        
        if (b.facingRight) {
            ctx.scale(-1, 1); // Flip
        }

        // Draw Logic Ported from Magma.html
        const bob = Math.sin(b.pulse) * 3;
        
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.ellipse(0, 60, 40, 10, 0, 0, Math.PI*2);
        ctx.fill();

        const w = 12 * scale;
        const h = 12 * scale;
        const startX = -w/2;
        const startY = -h/2;

        for (let r = 0; r < 12; r++) {
            for (let c = 0; c < 12; c++) {
                const type = b.grid[r][c];
                if (type === 0) continue;

                let color = b.colors.ROCK;
                let yOff = (r < 5) ? bob : 0; // Head bob

                // Leg Animation
                if (r >= 10 && b.state === 'chase') {
                     const isLeft = c < 6;
                     const lift = Math.sin(b.walkCycle + (isLeft ? 0 : Math.PI)) * 4;
                     yOff = Math.min(0, lift);
                }

                if (type === 2) { // Lava
                    // Pulse color
                    const p = (Math.sin(b.pulse * 2 + (r+c)*0.5) + 1) / 2;
                    color = (p > 0.5) ? b.colors.LAVA_MID : b.colors.LAVA_CORE;
                    if (b.hp < 150) color = b.colors.LAVA_HOT; // Enraged
                }
                else if (type === 3) { // Eyes
                    color = (b.state === 'chase' || b.hp < 150) ? b.colors.EYE_ANGRY : b.colors.EYE_IDLE;
                }

                ctx.fillStyle = color;
                ctx.fillRect(startX + c*scale, startY + r*scale + yOff, scale, scale);
            }
        }

        // Particles
        b.particles.forEach((p, i) => {
             ctx.fillStyle = p.color;
             ctx.globalAlpha = p.life;
             ctx.fillRect(startX + 60 + p.x, startY + 60 + p.y, 4, 4); // Relative to center
             p.x += p.vx;
             p.y += p.vy;
             p.life -= 0.05;
             if (p.life <= 0) b.particles.splice(i, 1);
        });
        ctx.globalAlpha = 1.0;

        ctx.restore();
    },

    lerpColor: function(a, b, amount) {
        // Simplified lerp for reference, managed via direct assignments above for performance
        return amount > 0.5 ? b : a;
    }
};