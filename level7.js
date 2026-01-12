window.Level7 = {
    engine: null,
    targetX: 8000,
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

    // --- SPRITE ASSETS (From Reference) ---
    demonSprite: [
        [0,0,0,3,0,0,0,0,3,0,0,0],
        [0,0,3,1,3,0,0,3,1,3,0,0],
        [0,3,1,1,1,3,3,1,1,1,3,0],
        [0,3,1,1,1,1,1,1,1,1,3,0],
        [0,1,1,2,1,1,1,1,2,1,1,0], // Row 4 (Eyes at index 3 and 8)
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [3,1,1,4,4,4,4,4,4,1,1,3],
        [3,1,1,1,1,1,1,1,1,1,1,3],
        [0,3,1,1,1,1,1,1,1,1,3,0],
        [0,0,3,1,1,1,1,1,1,3,0,0],
        [0,0,0,3,1,3,3,1,3,0,0,0],
        [0,0,0,0,3,0,0,3,0,0,0,0]
    ],
    
    // Ethereal Palette
    spriteColors: {
        1: '#1a2a4a', // Spiritual Navy
        2: '#ffffff', // Glowing Soul White
        3: '#001a33', // Deep Void
        4: '#00f2ff'  // Spirit Cyan
    },

    init: function(engine) {
        this.engine = engine;
        console.log("Level 7 Initialized: The Bridge of Souls");
        this.generateAtmosphere();
    },

    load: function() {
        this.loadCharacterScript(() => {
            if (window.LevelCharacter) {
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

        // --- SECTION 1: The Gate (Safe Zone) ---
        this.platforms.push({ x: 0, y: 700, w: 400, h: 200, type: 'ground' });

        // --- SECTION 2: The Broken Span ---
        this.platforms.push({ x: 500, y: 700, w: 150, h: 20, type: 'bridge' });
        this.platforms.push({ x: 750, y: 700, w: 150, h: 20, type: 'bridge' });
        this.platforms.push({ x: 1000, y: 680, w: 150, h: 20, type: 'bridge' });

        this.platforms.push({ x: 1300, y: 700, w: 200, h: 400, type: 'stone' });
        this.obstacles.push({ 
            type: 'armor', x: 1400, y: 650, range: 60, baseSpeed: 1, 
            aggroRadius: 200, aggroSpeed: 3, cooldown: 0, 
            startX: 1400, dir: 1, state: 'patrol', hp: 3 
        });

        // --- SECTION 3: The Spirit Gap ---
        this.platforms.push({ x: 1600, y: 600, w: 80, h: 20, type: 'floating' });
        this.platforms.push({ x: 1800, y: 550, w: 80, h: 20, type: 'floating' });
        this.platforms.push({ x: 2000, y: 500, w: 80, h: 20, type: 'floating' });

        // Spirit 1 (Original)
        this.spawnSpirit(1800, 300, 500);
        // Spirit 2 (Added: Pressures the jumps)
        this.spawnSpirit(2050, 250, 500);

        // --- SECTION 4: The High Bridge ---
        this.platforms.push({ x: 2200, y: 500, w: 1000, h: 20, type: 'bridge' });
        this.obstacles.push({ type: 'swing_blade', cx: 2400, cy: 220, length: 250, speed: 0.04, angle: 0, range: 0.8 });
        this.obstacles.push({ type: 'swing_blade', cx: 2700, cy: 220, length: 250, speed: 0.05, angle: 1.0, range: 0.8 });
        this.obstacles.push({ type: 'swing_blade', cx: 3000, cy: 220, length: 250, speed: 0.04, angle: 2.0, range: 0.8 });

        // Spirit 3 (Original)
        this.spawnSpirit(2600, 200, 600);
        
        // Spirit 4 & 5 (Added: Creates a swarm while dodging blades)
        this.spawnSpirit(2300, 150, 600); 
        this.spawnSpirit(2900, 150, 600);

        // --- CHECKPOINT 1 ---
        this.platforms.push({ x: 3300, y: 500, w: 300, h: 400, type: 'stone' });
        this.checkpoints.push({ x: 3400, y: 500, active: false, id: 1 });
        this.torches.push({ x: 3450, y: 450 });

        // --- SECTION 5: The Crumbling Stairs ---
        this.platforms.push({ x: 3700, y: 450, w: 100, h: 20, type: 'floating' });
        this.platforms.push({ x: 3900, y: 350, w: 100, h: 20, type: 'floating' });
        this.platforms.push({ x: 4100, y: 250, w: 100, h: 20, type: 'floating' });
        
        this.spawnSpirit(3800, 100, 500);
        this.spawnSpirit(4200, 100, 500);

        // --- SECTION 6: The Long Void ---
        for(let i=0; i<8; i++) {
            this.platforms.push({ 
                x: 4400 + (i * 250), 
                y: 300 + (Math.sin(i)*50), 
                w: 60, h: 20, 
                type: 'bridge' 
            });
        }
        this.obstacles.push({ type: 'lava_jet', x: 4900, y: 600, h: 400, timer: 0, interval: 150, state: 'idle' });
        this.obstacles.push({ type: 'lava_jet', x: 5400, y: 600, h: 400, timer: 75, interval: 150, state: 'idle' });

        // --- CHECKPOINT 2 ---
        this.platforms.push({ x: 6400, y: 400, w: 400, h: 500, type: 'stone' });
        this.checkpoints.push({ x: 6500, y: 400, active: false, id: 2 });
        this.banners.push({ x: 6500, y: 200, color: '#00ccff' }); 

        // --- SECTION 7: The Final Siege ---
        this.platforms.push({ x: 6900, y: 400, w: 800, h: 50, type: 'bridge' });
        this.obstacles.push({ 
            type: 'armor', x: 7100, y: 350, range: 100, baseSpeed: 2, 
            aggroRadius: 300, aggroSpeed: 4, cooldown: 0, 
            startX: 7100, dir: 1, state: 'patrol', hp: 5 
        });
        
        this.spawnSpirit(7300, 100, 800, 40);
        this.spawnSpirit(7500, 100, 800, 40);

        // EXIT
        this.platforms.push({ x: 7900, y: 350, w: 400, h: 200, type: 'ground' });
        this.banners.push({ x: 1350, y: 550, color: '#222' });
        this.banners.push({ x: 3400, y: 300, color: '#222' });
    },

    spawnSpirit: function(x, y, aggroRange, hp = 30) {
        this.spirits.push({
            x: x, y: y, 
            startY: y,
            state: 'idle', 
            timer: 0, 
            hp: hp,
            aggroRange: aggroRange,
            trail: [], // For after-image effect
            frameOffset: Math.random() * 1000
        });
    },

    generateAtmosphere: function() {
        this.particles = [];
        for(let i=0; i<80; i++) {
            this.particles.push({
                x: Math.random() * 2000, 
                y: Math.random() * 800, 
                size: Math.random() * 2,
                speedX: -(Math.random() * 3 + 1), 
                speedY: Math.random() * 0.5 - 0.25,
                color: '#aaccff', 
                alpha: Math.random() * 0.5
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
                if (this.player.hp < this.player.maxHp) {
                    this.player.hp = Math.min(this.player.hp + 40, this.player.maxHp);
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
             console.log("Level 7 Complete!");
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
        let camY = 0;
        if (this.player.y < 300) camY = (this.player.y - 300) * 0.8;
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
                if (obs.timer > (obs.interval - 40)) {
                    if (pR > obs.x && pL < obs.x + 30 && pB > (obs.y - obs.h)) {
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

            // --- TRAIL LOGIC (Visuals) ---
            // Push trail if moving fast or charging
            if (s.state === 'chasing' || s.state === 'charging') {
                 s.trail.unshift({ x: s.x, y: s.y, opacity: 0.5 });
                 if (s.trail.length > 5) s.trail.pop();
            }
            // Fade trails
            s.trail.forEach(t => t.opacity -= 0.05);
            s.trail = s.trail.filter(t => t.opacity > 0);

            // --- STATE MACHINE ---
            if (s.state === 'idle') {
                s.y = s.startY + Math.sin(this.time * 2 + s.frameOffset * 0.01) * 10;
                if (dist < s.aggroRange) s.state = 'chasing';
            } 
            else if (s.state === 'chasing') {
                const targetX = cx + (s.x > cx ? 200 : -200);
                const targetY = cy - 100;
                s.x += (targetX - s.x) * 0.03;
                s.y += (targetY - s.y) * 0.03;

                s.timer++;
                if (s.timer > 80) { 
                    s.state = 'charging';
                    s.timer = 0;
                }
            }
            else if (s.state === 'charging') {
                s.timer++; // Charge up (telegraph)
                if (s.timer > 40) { 
                    s.state = 'firing';
                    s.timer = 0;
                }
            }
            else if (s.state === 'firing') {
                this.projectiles.push({
                    x: s.x, y: s.y,
                    vx: (cx - s.x) * 0.04, 
                    vy: (cy - s.y) * 0.04,
                    life: 150,
                    trail: [] // Projectiles have trails too
                });
                this.playSound('shoot');
                s.state = 'cooldown';
                s.timer = 0;
            }
            else if (s.state === 'cooldown') {
                s.timer++;
                if (s.timer > 100) {
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
            // Trail
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

        // Background
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#000510"); 
        grd.addColorStop(0.5, "#0a0a20"); 
        grd.addColorStop(1, "#000000"); 
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

        let camY = 0;
        if (this.player && this.player.y < 300) camY = (300 - this.player.y) * 0.5;
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
        });

        // Platforms
        for (let plat of this.platforms) {
            if (plat.type === 'bridge') {
                ctx.fillStyle = "#3e2723"; 
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = "#5d4037";
                ctx.fillRect(plat.x, plat.y, plat.w, 4); 
                ctx.fillStyle = "#281a16";
                for(let i=0; i<plat.w; i+=15) ctx.fillRect(plat.x + i, plat.y, 2, plat.h);
            } else if (plat.type === 'floating') {
                ctx.fillStyle = "#37474f";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.shadowColor = "#00e5ff";
                ctx.shadowBlur = 10;
                ctx.strokeStyle = "#00e5ff"; 
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = "#212121";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            }
        }

        // Torches
        this.torches.forEach(t => {
            const glow = ctx.createRadialGradient(t.x, t.y, 5, t.x, t.y, 60);
            glow.addColorStop(0, "rgba(0, 229, 255, 0.5)"); 
            glow.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = glow;
            ctx.fillRect(t.x - 60, t.y - 60, 120, 120);
            ctx.fillStyle = "#00e5ff";
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
            ctx.fillStyle = `rgba(0, 200, 255, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, w, h);
        }

        if (this.player) {
            const maxHp = this.player.maxHp || 100;
            const curHp = Math.max(0, this.player.hp);
            const pct = curHp / maxHp;

            ctx.fillStyle = "#000";
            ctx.fillRect(20, 50, 204, 20);
            ctx.strokeStyle = "#00e5ff"; 
            ctx.strokeRect(20, 50, 204, 20);

            ctx.fillStyle = pct > 0.5 ? "#00e5ff" : (pct > 0.25 ? "#aa00ff" : "#ff0055"); 
            ctx.fillRect(22, 52, 200 * pct, 16);

            ctx.fillStyle = "#fff";
            ctx.font = "12px monospace";
            ctx.fillText(`SOUL: ${Math.ceil(curHp)}`, 230, 64);
        }

        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText("LEVEL 7: The Bridge", 20, 30);
    },
    
    renderExitGate: function(ctx) {
        // Door location matches end of platform
        const doorX = 8000;
        const doorY = 350; // On top of the ground platform
        
        // Door Archway
        ctx.fillStyle = "#111";
        ctx.fillRect(doorX, doorY - 140, 100, 140);
        
        // Inner Portal
        const pulse = Math.sin(this.time * 2) * 0.2 + 0.8;
        const grad = ctx.createLinearGradient(0, doorY, 0, doorY - 120);
        grad.addColorStop(0, `rgba(0, 242, 255, ${pulse})`);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(doorX + 10, doorY - 130, 80, 130);
        
        // Text Message
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = "#00f2ff";
        ctx.shadowBlur = 10;
        ctx.fillText("You still have a long way ahead", doorX + 50, doorY - 160);
        ctx.fillText("keep walking >", doorX + 50, doorY - 140);
        ctx.restore();
    },

    renderAtmosphere: function(ctx) {
        this.particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            if (p.x < 0) {
                p.x = ctx.canvas.width + Math.random() * 200;
                p.y = Math.random() * ctx.canvas.height;
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fillRect(p.x, p.y, p.size * 4, p.size);
        });
        ctx.globalAlpha = 1.0;
    },

    renderObstacles: function(ctx) {
        for (let obs of this.obstacles) {
            if (obs.type === 'swing_blade') {
                ctx.strokeStyle = "#888";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(obs.cx, obs.cy);
                ctx.lineTo(obs.bx, obs.by);
                ctx.stroke();
                
                ctx.save();
                ctx.translate(obs.bx, obs.by);
                const angle = Math.atan2(obs.bx - obs.cx, obs.by - obs.cy);
                ctx.rotate(-angle);
                ctx.fillStyle = "#eee"; 
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
                    grad.addColorStop(0.5, "rgba(100, 0, 255, 0.6)");
                    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                    ctx.fillStyle = grad;
                    ctx.fillRect(obs.x, obs.y - h, 30, h);
                 }
            } else if (obs.type === 'armor') {
                if (obs.dead) return;
                ctx.fillStyle = "#444";
                ctx.fillRect(obs.x - 12, obs.y - 25, 24, 45); 
                ctx.fillStyle = "#00e5ff"; 
                ctx.fillRect(obs.x - 5, obs.y - 35, 4, 4);
                ctx.fillRect(obs.x + 2, obs.y - 35, 4, 4);
            }
        }
    },

    renderSpirits: function(ctx) {
        const SCALE = 3; // Pixel scale for the game world
        
        for (let s of this.spirits) {
            // Logic for shaking during charge
            let sx = 0, sy = 0;
            if (s.state === 'charging') {
                const intensity = (s.timer / 40) * 6; // Ramp up shake
                sx = (Math.random() - 0.5) * intensity;
                sy = (Math.random() - 0.5) * intensity;
            }

            // Draw Trails
            s.trail.forEach(t => {
                this.drawPixelSprite(ctx, t.x + sx, t.y + sy, SCALE, t.opacity * 0.4, true); // ghostMode=true
            });

            // Draw Main Spirit
            this.drawPixelSprite(ctx, s.x + sx, s.y + sy, SCALE, 1.0, false, s.state === 'charging');
        }
    },

    drawPixelSprite: function(ctx, x, y, scale, opacity, ghostMode, isCharging) {
        ctx.save();
        ctx.translate(x - (12 * scale)/2, y - (12 * scale)/2); // Center sprite
        ctx.globalAlpha = opacity;

        // Visual telegraph for charging (Rotation effect)
        if (isCharging) {
            // Simple flash or slight rotate logic could go here
            // But we already have shake. Let's add a glow.
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00f2ff';
        }

        const colors = this.spriteColors;
        const sprite = this.demonSprite;

        for (let r = 0; r < 12; r++) {
            for (let c = 0; c < 12; c++) {
                const val = sprite[r][c];
                if (val !== 0) {
                    if (ghostMode) {
                        ctx.fillStyle = colors[4]; // Cyan for ghost/trails
                    } else {
                        ctx.fillStyle = colors[val];
                    }
                    
                    // Specific glow for eyes if charging
                    if (val === 2 && isCharging) {
                         ctx.fillStyle = '#fff';
                         ctx.shadowBlur = 15;
                         ctx.shadowColor = '#00f2ff';
                    }

                    ctx.fillRect(c * scale, r * scale, scale, scale);
                    ctx.shadowBlur = 0; // Reset
                }
            }
        }
        ctx.restore();
    },

    renderProjectiles: function(ctx) {
        for (let p of this.projectiles) {
            // Trail
            p.trail.forEach((t, i) => {
                 ctx.fillStyle = `rgba(0, 242, 255, ${0.4 - i * 0.1})`;
                 ctx.fillRect(t.x - 4, t.y - 4, 8, 8);
            });

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.fillStyle = "#fff";
            ctx.shadowColor = "#00e5ff";
            ctx.shadowBlur = 10;
            ctx.fillRect(-5, -5, 10, 10);
            ctx.restore();
        }
    }
};