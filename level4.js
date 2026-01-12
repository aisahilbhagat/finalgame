window.Level4 = {
    engine: null,
    targetX: 4800, // Level completion trigger moved further back
    player: null,
    cameraX: 0,
    time: 0,
    
    // Level Data
    platforms: [], 
    obstacles: [], 
    checkpoints: [], 
    activeCheckpoint: null, 
    
    // Visuals
    particles: [],
    torches: [],
    banners: [], // New visual element for castle vibe
    
    // State for control suppression
    inputBlocked: false,
    flashIntensity: 0,
    shake: 0,

    init: function(engine) {
        this.engine = engine;
        console.log("Level 4 Initialized: The High Halls (Endurance Mode)");
        this.generateDust();
    },

    load: function() {
        this.loadCharacterScript(() => {
            if (window.LevelCharacter) {
                // Spawn Player at start
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
        // --- 1. PLATFORMS (Difficulty: 8.5) ---
        // Theme: Cold Stone, High Halls. 
        // Logic: Rooms are separated by "Pillars" (visual walls).
        
        this.platforms = [
            // ROOM 1: The Entry (Safe)
            { x: 0, y: 700, w: 400, h: 200, type: 'ground' },

            // ROOM 2: The Guillotine Corridor
            // Low ceiling effect created by obstacles, requires timing.
            { x: 450, y: 700, w: 150, h: 200, type: 'stone' },
            { x: 700, y: 700, w: 150, h: 200, type: 'stone' },
            { x: 950, y: 650, w: 150, h: 250, type: 'stone' }, // Slight rise

            // ROOM 3: The Grand Staircase (Verticality test)
            // Simulating a tower climb
            { x: 1200, y: 550, w: 100, h: 20, type: 'floating' },
            { x: 1350, y: 450, w: 80, h: 20, type: 'floating' },
            { x: 1200, y: 350, w: 80, h: 20, type: 'floating' }, // Backtracking jump
            { x: 1400, y: 250, w: 200, h: 20, type: 'stone' },   // High ledge
            
            // ROOM 4: The Upper Walkway (High risk, fall = death or heavy damage loop)
            { x: 1700, y: 250, w: 100, h: 20, type: 'bridge' },
            { x: 1900, y: 250, w: 100, h: 20, type: 'bridge' },
            { x: 2100, y: 250, w: 100, h: 20, type: 'bridge' },

            // Checkpoint Platform (The Balcony)
            { x: 2300, y: 400, w: 300, h: 400, type: 'stone' },

            // ROOM 5: The Armory (Combat focused)
            // Wide spaces, but patrolled
            { x: 2700, y: 500, w: 500, h: 40, type: 'stone' },
            { x: 2800, y: 350, w: 300, h: 20, type: 'floating' }, // Upper shelf

            // ROOM 6: The Crumbling Depths (Precision & Hazards)
            { x: 3300, y: 600, w: 80, h: 200, type: 'stone' },
            { x: 3500, y: 650, w: 80, h: 200, type: 'stone' },
            { x: 3700, y: 600, w: 80, h: 200, type: 'stone' },
            { x: 3900, y: 550, w: 80, h: 250, type: 'stone' },

            // EXIT GATES (Extended platform length to reach new door position)
            { x: 4100, y: 550, w: 800, h: 250, type: 'ground' }
        ];

        // --- CHECKPOINTS ---
        // Fewer checkpoints than L3 to increase tension
        this.checkpoints = [
            { x: 1450, y: 250, active: false, id: 1 }, // Top of stairs
            { x: 2400, y: 400, active: false, id: 2 }, // The Balcony
            { x: 3320, y: 600, active: false, id: 3 }  // Before the depths
        ];

        // --- 2. OBSTACLES (High Density) ---
        this.obstacles = [
            // Room 2: Blades. Faster than L3.
            { type: 'swing_blade', cx: 525, cy: 100, length: 400, speed: 0.05, angle: 0, range: 0.7 },
            { type: 'swing_blade', cx: 775, cy: 100, length: 400, speed: 0.06, angle: 1.5, range: 0.7 },
            { type: 'swing_blade', cx: 1025, cy: 100, length: 350, speed: 0.05, angle: 0.5, range: 0.7 },

            // Room 3: Vertical Hazards (Lava Jets reskinned as Steam Vents logic-wise)
            // Timing jump helper or hindrance
            { type: 'lava_jet', x: 1250, y: 800, h: 400, timer: 0, interval: 140, state: 'idle' },

            // Room 4: The Upper Walkway (Ghost Patrols)
            // Aggressive Armor enemies on narrow bridges
            { 
                type: 'armor', x: 1750, y: 200, range: 50, baseSpeed: 1.5, 
                aggroRadius: 200, aggroSpeed: 3.5, cooldown: 0, 
                startX: 1750, dir: 1, state: 'patrol', hp: 2 // Beefier
            },
            { 
                type: 'armor', x: 2150, y: 200, range: 50, baseSpeed: 1.5, 
                aggroRadius: 200, aggroSpeed: 3.5, cooldown: 0, 
                startX: 2150, dir: -1, state: 'patrol', hp: 2 
            },

            // Room 5: The Armory (Combat Arena)
            { 
                type: 'armor', x: 2900, y: 450, range: 200, baseSpeed: 2, 
                aggroRadius: 300, aggroSpeed: 4.5, cooldown: 0, 
                startX: 2900, dir: 1, state: 'patrol', hp: 3 // Elite guard
            },
            { 
                type: 'armor', x: 2900, y: 300, range: 150, baseSpeed: 2, 
                aggroRadius: 250, aggroSpeed: 4.0, cooldown: 0, 
                startX: 2900, dir: -1, state: 'patrol', hp: 2
            },

            // Room 6: The Depths (Jets + Blades combined)
            { type: 'lava_jet', x: 3400, y: 800, h: 200, timer: 30, interval: 100, state: 'idle' },
            { type: 'lava_jet', x: 3600, y: 800, h: 200, timer: 70, interval: 100, state: 'idle' },
            // Adjusted Guillotine: Moved UP (cy 150) and SLOWER (speed 0.04) to clear the path to the exit
            { type: 'swing_blade', cx: 3800, cy: 150, length: 300, speed: 0.04, angle: 0, range: 0.8 },
        ];

        // --- 3. DECORATIONS ---
        this.torches = [
            { x: 200, y: 650 }, 
            { x: 1400, y: 200 }, 
            { x: 2400, y: 350 },
            { x: 4200, y: 500 }
        ];

        this.banners = [
            { x: 600, y: 200, color: '#331111' },
            { x: 2500, y: 200, color: '#111133' },
            { x: 4300, y: 200, color: '#331111' }
        ];
    },

    generateDust: function() {
        this.particles = [];
        for(let i=0; i<40; i++) {
            this.particles.push({
                x: Math.random() * 2000, 
                y: Math.random() * 800, 
                size: Math.random() * 2 + 0.5,
                speedY: Math.random() * 0.5 + 0.1, // Falling dust
                speedX: Math.random() * 0.4 - 0.2,
                life: Math.random() * 100,
                color: '#aaccff' // Blueish dust
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
                this.playSound('checkpoint'); // Auditory feedback
                // Minor heal at checkpoint (Endurance logic: not full heal)
                if (this.player.hp < this.player.maxHp) {
                    this.player.hp = Math.min(this.player.hp + 30, this.player.maxHp);
                }
            }
        }

        // --- DEATH CHECK ---
        if (this.player.hp <= 0) {
            this.resetPlayer();
        }

        // --- PHYSICS & COLLISION (HARDCODED FROM L3) ---
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
                
                // One-way platforms logic (Bridge/Floating)
                // Solid stone blocks are usually full collision, but for platformer flow
                // we often treat top collision primarily unless it's a wall.
                // Here we copy L3's "pop up" logic which acts like floor.
                
                const floorThreshold = plat.y + Math.max(15, pVelY + 5);
                if (pBottom > floorThreshold) {
                    const overlapL = pRight - plat.x;
                    const overlapR = (plat.x + plat.w) - pLeft;
                    if (overlapL < overlapR) this.player.x -= overlapL;
                    else this.player.x += overlapR;
                    this.player.vx = 0;
                    // Update hitboxes after shift
                    pLeft = this.player.x + hitbox.offsetX;
                    pRight = pLeft + hitbox.width;
                }
            }
        }

        // 2. Vertical
        let groundLevel = 1000; // Pit death
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
        // Dynamic camera that respects verticality slightly better than L3
        // Look ahead 300px, but clamp to level bounds
        let targetCam = this.player.x - 300;
        
        // Vertical Camera Bias: If player climbs high (y < 300), pan up
        // Base Y is roughly 600.
        let verticalOffset = 0;
        if (this.player.y < 300) verticalOffset = (this.player.y - 300) * 0.5;
        
        // Apply smooth follow
        this.cameraX += (targetCam - this.cameraX) * 0.1;
        
        // Clamp start
        if (this.cameraX < 0) this.cameraX = 0;

        // --- DEATH & WIN ---
        if (this.player.y > 900) {
            this.playSound('fall');
            this.player.hp = 0; 
            this.resetPlayer();
        }

        if (this.player.x >= this.targetX) {
             console.log("Level 4 Complete!");
             if (this.engine && this.engine.handleContentComplete) {
                 this.engine.handleContentComplete();
             }
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
                
                // Original Anchor Calculation
                const bx = obs.cx + Math.sin(currentAngle) * obs.length;
                const by = obs.cy + Math.cos(currentAngle) * obs.length;
                obs.bx = bx; obs.by = by;

                // FIX: Collision matches the new longer blade visual
                // The visual extends 60px down from bx/by. We target the center (30px down).
                const bladeCenterX = obs.cx + Math.sin(currentAngle) * (obs.length + 30);
                const bladeCenterY = obs.cy + Math.cos(currentAngle) * (obs.length + 30);

                // Check distance to center of blade with larger radius (45px)
                if (Math.hypot(cx - bladeCenterX, cy - bladeCenterY) < 45) {
                     if (!this.player.isStunned) {
                        this.player.takeDamage(25, (cx > bx ? 1 : -1));
                        this.playSound('clank');
                        this.shake = 5;
                     }
                }
            }
            // B. LAVA JET (Now Steam/Fire Jet)
            else if (obs.type === 'lava_jet') {
                obs.timer++;
                if (obs.timer > obs.interval) obs.timer = 0;
                
                if (obs.timer > (obs.interval - 40)) {
                    if (pR > obs.x && pL < obs.x + 30 && pB > (obs.y - obs.h)) {
                         if (!this.player.isStunned) {
                             this.player.takeDamage(35, (this.player.facingRight ? -1 : 1));
                             this.player.vy = -12; // High knockback
                         }
                    }
                }
            }
            // C. ARMOR (Enemies)
            else if (obs.type === 'armor') {
                if (obs.hp <= 0) continue;
                
                const dist = Math.hypot(cx - obs.x, cy - obs.y);
                
                // Aggro Logic
                if (dist < obs.aggroRadius) {
                     const dir = (cx > obs.x) ? 1 : -1;
                     obs.x += dir * obs.aggroSpeed;
                     // Face player
                     obs.dir = dir;
                } else {
                     obs.x += obs.dir * obs.baseSpeed;
                     if (Math.abs(obs.x - obs.startX) > obs.range) obs.dir *= -1;
                }

                // Collision
                // Player hits Enemy
                if (Math.abs(cx - obs.x) < 30 && Math.abs(cy - obs.y) < 50) {
                    if (this.player.isAttacking) {
                        obs.hp--;
                        this.playSound('hit');
                        // Knockback enemy
                        obs.x += (this.player.facingRight ? 10 : -10);
                        
                        if (obs.hp <= 0) {
                            obs.dead = true;
                            // Chance to drop "soul" (heal)
                            if (Math.random() > 0.7) {
                                this.player.hp = Math.min(this.player.hp + 20, this.player.maxHp);
                            }
                        }
                    } else if (!this.player.isStunned) {
                        this.player.takeDamage(15, (cx > obs.x ? 1 : -1));
                    }
                }
            }
        }
    },

    resetPlayer: function() {
        if (this.activeCheckpoint) {
            this.player.x = this.activeCheckpoint.x;
            this.player.y = this.activeCheckpoint.y - 60;
        } else {
            this.player.x = 100;
            this.player.y = 600;
        }
        
        // Penalty for death: 70% health instead of 100%
        // This maintains the "Attrition/Pressure" theme of Level 4
        this.player.hp = this.player.maxHp * 0.7;
        
        this.player.vy = 0;
        this.player.vx = 0;
        this.player.isStunned = false;
        this.flashIntensity = 0.5;
        this.shake = 5;
    },

    playSound: function(name) {
        if (this.engine && this.engine.playSound) this.engine.playSound(name);
    },

    // --- RENDER ---
    render: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // 1. BACKGROUND (The High Halls)
        // Dark blue/grey gradient for castle interior
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#050510"); // Deep blue top
        grd.addColorStop(0.6, "#1a1a2e"); 
        grd.addColorStop(1, "#0a0a14"); 
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        // 2. PARALLAX DUST
        ctx.save();
        this.updateAndRenderDust(ctx);
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

        // A. Background Pillars (Decorative)
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        for (let x = 200; x < 4500; x += 600) {
            ctx.fillRect(x, 0, 100, h + 200);
        }

        // B. Banners
        this.banners.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x + 40, b.y);
            ctx.lineTo(b.x + 40, b.y + 100);
            ctx.lineTo(b.x + 20, b.y + 80); // Cutout
            ctx.lineTo(b.x, b.y + 100);
            ctx.fill();
        });

        // C. Torches
        this.torches.forEach(t => {
            const glow = ctx.createRadialGradient(t.x, t.y, 5, t.x, t.y, 80);
            glow.addColorStop(0, "rgba(255, 200, 100, 0.4)");
            glow.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = glow;
            ctx.fillRect(t.x - 80, t.y - 80, 160, 160);
            
            ctx.fillStyle = "#333"; // Holder
            ctx.fillRect(t.x - 2, t.y, 4, 20);
            
            // Flame
            const flicker = Math.random() * 5;
            ctx.fillStyle = "#ffcc00";
            ctx.beginPath();
            ctx.arc(t.x, t.y - 5, 4 + flicker, 0, Math.PI*2);
            ctx.fill();
        });

        // D. Platforms
        for (let plat of this.platforms) {
            if (plat.type === 'bridge') {
                ctx.fillStyle = "#5d4037"; // Wood
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                // Planks
                ctx.fillStyle = "#3e2723";
                for(let i=0; i<plat.w; i+=20) ctx.fillRect(plat.x + i, plat.y, 2, plat.h);
            } else if (plat.type === 'floating') {
                ctx.fillStyle = "#37474f"; // Dark Slate
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = "#546e7a"; // Light trim
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
            } else {
                ctx.fillStyle = "#212121"; // Dark Stone
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = "#424242"; // Texture details
                ctx.fillRect(plat.x, plat.y, plat.w, 5); // Top trim
            }
        }

        // E. Exit Gate
        this.renderExitGate(ctx);

        // F. Checkpoints
        this.checkpoints.forEach(cp => {
            ctx.fillStyle = cp.active ? "#00ffff" : "#444"; // Cyan for active
            ctx.fillRect(cp.x - 2, cp.y - 50, 4, 50); // Pole
            ctx.beginPath();
            ctx.moveTo(cp.x, cp.y - 50);
            ctx.lineTo(cp.x + 30, cp.y - 40);
            ctx.lineTo(cp.x, cp.y - 30);
            ctx.fill();
        });

        // G. Obstacles
        this.renderObstacles(ctx);

        // H. Player
        if (this.player) this.player.render(ctx);

        ctx.restore();

        // 4. UI / HUD
        if (this.flashIntensity > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Health Bar
        if (this.player) {
            const maxHp = this.player.maxHp || 100;
            const curHp = Math.max(0, this.player.hp);
            const pct = curHp / maxHp;

            ctx.fillStyle = "#111";
            ctx.fillRect(20, 50, 204, 20);
            ctx.strokeStyle = "#aaa";
            ctx.strokeRect(20, 50, 204, 20);

            // Health color changes based on status
            ctx.fillStyle = pct > 0.5 ? "#00e676" : (pct > 0.25 ? "#ffea00" : "#d50000"); 
            ctx.fillRect(22, 52, 200 * pct, 16);

            ctx.fillStyle = "#fff";
            ctx.font = "12px monospace";
            ctx.fillText(`HP: ${Math.ceil(curHp)}`, 230, 64);
        }

        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText("LEVEL 4: The High Halls", 20, 30);
    },

    renderExitGate: function(ctx) {
        // Moved visual gate position to 4700 (was 4300)
        const gateX = 4700;
        const gateY = 550;
        
        // Stone Arch
        ctx.fillStyle = "#333";
        ctx.fillRect(gateX - 50, gateY - 100, 100, 100);
        ctx.fillStyle = "#000";
        ctx.fillRect(gateX - 30, gateY - 100, 60, 100); // Doorway

        // Light
        const time = this.time * 2;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(time)) * 0.5})`;
        ctx.fillRect(gateX - 30, gateY - 100, 60, 100);

        // Inscription
        ctx.save();
        ctx.fillStyle = "#bbb"; // Faded stone text color
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText("DON'T LOOK BACK keep walking >", gateX, gateY - 110);
        ctx.restore();
    },

    updateAndRenderDust: function(ctx) {
        this.particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            if (p.y > ctx.canvas.height) {
                p.y = 0;
                p.x = this.cameraX + Math.random() * window.innerWidth;
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    },

    renderObstacles: function(ctx) {
        for (let obs of this.obstacles) {
            if (obs.type === 'swing_blade') {
                // Chain
                ctx.strokeStyle = "#888";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(obs.cx, obs.cy);
                ctx.lineTo(obs.bx, obs.by);
                ctx.stroke();
                
                // Blade visuals (Sharper than L3)
                ctx.save();
                ctx.translate(obs.bx, obs.by);
                const angle = Math.atan2(obs.bx - obs.cx, obs.by - obs.cy);
                ctx.rotate(-angle);
                
                ctx.fillStyle = "#ddd"; // Shiny steel
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-20, 40);
                ctx.lineTo(0, 60);
                ctx.lineTo(20, 40);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            else if (obs.type === 'lava_jet') {
                ctx.fillStyle = "#444"; // Vent
                ctx.fillRect(obs.x, obs.y, 30, 10);
                
                // Steam/Fire effect
                if (obs.timer > (obs.interval - 40)) {
                    const height = obs.h * (Math.random() * 0.2 + 0.8);
                    const grad = ctx.createLinearGradient(0, obs.y, 0, obs.y - height);
                    grad.addColorStop(0, "rgba(255, 200, 0, 0.8)");
                    grad.addColorStop(1, "rgba(255, 50, 0, 0)");
                    ctx.fillStyle = grad;
                    ctx.fillRect(obs.x + 5, obs.y - height, 20, height);
                } else if (obs.timer > (obs.interval - 60)) {
                    ctx.fillStyle = "rgba(200, 200, 200, 0.5)";
                    ctx.beginPath();
                    ctx.arc(obs.x + 15, obs.y - 5, Math.random() * 5, 0, Math.PI*2);
                    ctx.fill();
                }
            }
            else if (obs.type === 'armor') {
                if (obs.dead) return;
                // Knight visuals
                ctx.fillStyle = obs.hp > 1 ? "#aaa" : "#844"; // Damaged tint
                ctx.fillRect(obs.x - 12, obs.y - 25, 24, 45); // Body
                
                ctx.fillStyle = "#666"; // Helm
                ctx.fillRect(obs.x - 10, obs.y - 40, 20, 15);
                
                ctx.fillStyle = "#0ff"; // Eyes (Ghostly Blue)
                ctx.fillRect(obs.x - 5, obs.y - 35, 4, 4);
                ctx.fillRect(obs.x + 2, obs.y - 35, 4, 4);
                
                // Weapon
                ctx.fillStyle = "#eee";
                ctx.fillRect(obs.x + 12, obs.y - 20, 4, 35);
            }
        }
    }
};