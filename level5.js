window.Level5 = {
    id: "Level5",
    engine: null,
    player: null,
    cameraX: -600, 
    time: 0,
    deathCount: 0, 
    
    // Level Data
    platforms: [], 
    projectiles: [],
    explosions: [],
    particles: [],
    
    // Boss State
    boss: null,
    bossArenaActive: false, 
    
    // State
    inputBlocked: false,
    flashIntensity: 0,
    shake: 0,
    levelComplete: false,
    respawnInvulnTimer: 0,

    init: function(engine) {
        this.engine = engine;
        console.log("Level 5 Initialized: The Solar Throne (Endurance Mode)");
        this.projectiles = [];
        this.explosions = [];
        this.particles = [];
        this.bossArenaActive = false; 
        this.respawnInvulnTimer = 0;
    },

    load: function() {
        this.loadCharacterScript(() => {
            if (window.LevelCharacter) {
                this.player = new window.LevelCharacter(-600, 500);
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
        this.platforms = [
            { x: -1000, y: 600, w: 2600, h: 400, type: 'ground' },
            { x: -1000, y: 0, w: 100, h: 800, type: 'wall' },
            { x: 1200, y: 0, w: 100, h: 800, type: 'wall' },
            { x: 200, y: 400, w: 120, h: 20, type: 'floating' },
            { x: 680, y: 400, w: 120, h: 20, type: 'floating' },
            { x: 440, y: 250, w: 120, h: 20, type: 'floating' } 
        ];
    },

    setupBoss: function() {
        this.boss = {
            active: true,
            dead: false,
            x: 800,
            y: 400,
            vx: 0, 
            vy: 0,
            hp: 3000, 
            maxHp: 3000,
            phase: 1,
            
            invulnTimer: 0, 
            state: 'dormant',
            timer: 0,
            facingRight: false,
            
            width: 140, 
            height: 140,
            
            // Visuals
            pulse: 0,
            walkCycle: 0,
            targetX: 800,
            targetY: 400,

            matrix: [
                [0,0,0,4,6,6,6,6,4,0,0,0], 
                [0,0,0,4,1,3,3,1,4,0,0,0], 
                [0,0,0,0,1,1,1,1,0,0,0,0], 
                [4,4,1,1,4,5,5,4,1,1,4,4], 
                [4,5,1,6,6,6,6,6,6,1,5,4], 
                [1,4,1,1,6,6,6,6,1,1,4,1], 
                [4,1,0,4,4,6,6,4,4,0,1,4], 
                [0,0,0,4,1,4,4,1,4,0,0,0], 
                [0,0,0,4,4,0,0,4,4,0,0,0], 
                [0,0,0,1,1,0,0,1,1,0,0,0], 
                [0,0,0,4,4,0,0,4,4,0,0,0], 
                [0,0,1,4,4,0,0,4,4,1,0,0]  
            ],
            
            colors: {
                ARMOR: "#111111", ROCK: "#333333", CORE: "#ff4400", 
                PLASMA: "#ffdd00", EYE: "#ffffff", PHASE2: "#00ffff"
            }
        };
    },

    update: function() {
        this.time += 0.05;
        if (this.flashIntensity > 0) this.flashIntensity -= 0.05;
        if (this.shake > 0) this.shake--;
        if (this.respawnInvulnTimer > 0) this.respawnInvulnTimer -= 16;

        if (!this.player) return;

        this.player.update();

        if (!this.bossArenaActive && this.player.x > 100) {
            this.startFight();
        }

        this.updateBoss();
        this.updateProjectiles();
        this.updateEffects();

        const hitbox = this.player.hitbox || { offsetX: 0, offsetY: 0, width: 36, height: 60 };
        let pLeft = this.player.x + hitbox.offsetX;
        let pRight = pLeft + hitbox.width;
        let pTop = this.player.y + hitbox.offsetY;
        let pBottom = pTop + hitbox.height;
        
        // Floor
        let groundLevel = 1000; 
        for (let plat of this.platforms) {
            if (plat.type === 'wall') continue; 
            if (pRight > plat.x && pLeft < plat.x + plat.w) {
                if (pBottom <= plat.y + 35) {
                    if (plat.y < groundLevel) groundLevel = plat.y;
                }
            }
        }
        this.player.groundY = groundLevel;

        // Wall
        for (let plat of this.platforms) {
            if (plat.type === 'wall') {
                 if (pRight > plat.x && pLeft < plat.x + plat.w &&
                     pBottom > plat.y && pTop < plat.y + plat.h) {
                     const mid = plat.x + plat.w/2;
                     if (this.player.x < mid) {
                         this.player.x = plat.x - (hitbox.offsetX + hitbox.width) - 1;
                     } else {
                         this.player.x = plat.x + plat.w - hitbox.offsetX + 1;
                     }
                     this.player.vx = 0;
                 }
            }
        }

        if (this.bossArenaActive) {
            const target = 200; 
            this.cameraX += (target - this.cameraX) * 0.05;
        } else {
            const target = this.player.x - 300;
            this.cameraX += (target - this.cameraX) * 0.1;
        }

        if (this.player.hp <= 0 && !this.levelComplete) {
            this.handlePlayerDeath();
        }
        if (this.boss.dead && !this.levelComplete) {
             this.levelComplete = true;
             setTimeout(() => {
                 if (this.engine && this.engine.handleContentComplete) {
                     this.engine.handleContentComplete();
                 }
             }, 4000);
        }
    },

    startFight: function() {
        console.log("ARENA LOCKED. FIGHT BEGINS.");
        this.bossArenaActive = true;
        this.boss.state = 'chase'; 
        this.boss.timer = 1000;
        this.shake = 10;
        this.playSound('slam');
        this.platforms.push({ x: -100, y: 0, w: 100, h: 800, type: 'wall' });
    },

    updateBoss: function() {
        if (!this.boss || this.boss.dead) return;
        const b = this.boss;
        const p = this.player;
        
        b.pulse += 0.05;
        b.timer -= 16; 

        if (b.state === 'dormant') {
            b.y = 400 + Math.sin(this.time) * 10;
            return;
        }

        // PHASE 2 TRANSITION: Turn Blue
        if (b.hp < b.maxHp * 0.5 && b.phase === 1) {
            b.phase = 2; // BLUE PHASE START
            this.shake = 30;
            this.flashIntensity = 0.8;
            this.playSound('roar');
            // Knockback
            p.vx = (p.x < b.x) ? -15 : 15;
            p.vy = -10;
            b.timer = 0;
            b.state = 'hover_smash'; 
        }

        const dx = p.x - b.x;
        b.facingRight = dx > 0;
        
        // AGGRESSION SCALING: Phase 2 is much faster
        const moveSpeed = b.phase === 2 ? 9.0 : 3.5;

        switch(b.state) {
            case 'chase':
                const targetY = p.y - 100; 
                b.x += (dx > 0 ? 1 : -1) * moveSpeed;
                b.y += (targetY - b.y) * 0.05; 

                if (b.timer <= 0) {
                    const r = Math.random();
                    if (r < 0.4) {
                        b.state = 'hover_smash';
                        b.timer = b.phase === 2 ? 400 : 800; // Less warning in blue
                    } else if (r < 0.7) {
                        b.state = 'casting';
                        this.triggerBossAttack('salvo');
                    } else {
                        b.state = 'casting';
                        this.triggerBossAttack('meteor');
                    }
                }
                break;

            case 'hover_smash':
                const targetX = p.x;
                b.x += (targetX - b.x) * (b.phase === 2 ? 0.2 : 0.1); // Tracks faster in blue
                b.y += (150 - b.y) * 0.1; 
                
                if (b.timer <= 0) {
                    b.state = 'slam_down';
                    b.vy = b.phase === 2 ? 35 : 25; // Falls faster in blue
                    this.playSound('fall');
                }
                break;

            case 'slam_down':
                b.y += b.vy;
                if (b.y >= 530) {
                    b.y = 530;
                    b.vy = 0;
                    b.state = 'impact_recovery';
                    b.timer = b.phase === 2 ? 400 : 1000; // Less recovery time in blue
                    
                    this.shake = 20;
                    this.playSound('boom');
                    this.createExplosion(b.x, b.y + 60, 60);
                    
                    // SHOCKWAVES: Blue Phase = High Damage & Speed
                    const swSpeed = b.phase === 2 ? 12 : 8;
                    const swDmg = b.phase === 2 ? 50 : 20; // 50 DMG!
                    const swColor = b.phase === 2 ? '#00ffff' : '#ffaa00';
                    
                    this.projectiles.push({
                        type: 'shockwave', x: b.x - 40, y: 580, vx: -swSpeed, vy: 0, w: 30, h: 40, life: 100, color: swColor, damage: swDmg
                    });
                    this.projectiles.push({
                        type: 'shockwave', x: b.x + 40, y: 580, vx: swSpeed, vy: 0, w: 30, h: 40, life: 100, color: swColor, damage: swDmg
                    });
                }
                break;

            case 'impact_recovery':
                if (b.timer <= 0) {
                    b.state = 'chase';
                    // Almost NO downtime in Phase 2
                    b.timer = b.phase === 2 ? 300 : 2000; 
                    b.vy = -5;
                }
                break;

            case 'casting':
                if (b.timer <= 0) {
                    b.state = 'chase';
                    b.timer = b.phase === 2 ? 300 : 1500;
                }
                break;
        }

        // HITBOX
        const bRect = { x: b.x - 70, y: b.y - 70, w: 140, h: 140 };
        const pRect = { x: p.x + 18, y: p.y + 6, w: 36, h: 60 };

        if (p.isAttacking && b.invulnTimer <= 0) {
             if (this.checkRectOverlap(pRect, bRect)) {
                 b.hp -= 40; 
                 b.invulnTimer = 20;
                 this.playSound('hit');
                 for(let k=0; k<5; k++) {
                     this.particles.push({
                         x: bRect.x + Math.random()*bRect.w, y: bRect.y + Math.random()*bRect.h,
                         vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
                         life: 1.0, color: '#fff'
                     });
                 }
                 if (b.hp <= 0) {
                     b.dead = true;
                     this.explodeBoss();
                 }
             }
        }
        if (b.invulnTimer > 0) b.invulnTimer--;

        // CONTACT DAMAGE: Blue Phase = 30 Damage
        if (this.checkRectOverlap(pRect, bRect)) {
            if (!p.isStunned && p.invulnTimer <= 0 && this.respawnInvulnTimer <= 0) {
                const contactDmg = b.phase === 2 ? 30 : 10;
                p.takeDamage(contactDmg, (p.x < b.x ? -1 : 1));
                p.vy = -5;
            }
        }
    },

    triggerBossAttack: function(type) {
        const b = this.boss;
        // RELENTLESS: 300ms delay in Phase 2
        b.timer = (b.phase === 2) ? 300 : 1000; 
        
        this.particles.push({
            x: b.x, y: b.y, vx: 0, vy: -1, life: 1, color: '#fff', scale: 50
        });

        if (type === 'meteor') {
            const count = (b.phase === 2) ? 25 : 8; // 25 Meteors!
            const metDmg = (b.phase === 2) ? 45 : 20;
            const metColor = (b.phase === 2) ? '#00ffff' : '#ffaa00';
            
            for(let i=0; i<count; i++) {
                setTimeout(() => {
                    const tx = (Math.random() * 1200); 
                    this.projectiles.push({
                        type: 'meteor',
                        x: tx, y: -100,
                        vx: (Math.random() - 0.5) * 4,
                        vy: (b.phase === 2) ? 16 : 12, 
                        w: 24, h: 48,
                        color: metColor,
                        damage: metDmg
                    });
                }, i * (b.phase === 2 ? 60 : 150));
            }
        } else if (type === 'salvo') {
            const spreadCount = (b.phase === 2) ? 6 : 2; // HUGE Spread
            const orbDmg = (b.phase === 2) ? 40 : 20;
            const orbSpeed = (b.phase === 2) ? 13 : 9;
            const orbColor = (b.phase === 2) ? '#00ffff' : b.colors.CORE;

            for (let i = -spreadCount; i <= spreadCount; i++) {
                const angle = Math.atan2(this.player.y - b.y, this.player.x - b.x);
                const spread = i * 0.15;
                this.projectiles.push({
                    type: 'orb',
                    x: b.x, y: b.y,
                    vx: Math.cos(angle + spread) * orbSpeed,
                    vy: Math.sin(angle + spread) * orbSpeed,
                    w: 20, h: 20, 
                    color: orbColor,
                    damage: orbDmg
                });
            }
        }
    },

    updateProjectiles: function() {
        const pRect = { x: this.player.x + 18, y: this.player.y + 6, w: 36, h: 60 };

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.life !== undefined) {
                p.life--;
                if (p.life <= 0) { this.projectiles.splice(i, 1); continue; }
            }
            if (p.y > 800 || p.x < -200 || p.x > 1400) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Shockwave Logic
            if (p.type === 'shockwave') {
                 this.particles.push({
                     x: p.x, y: p.y + Math.random()*20, vx: 0, vy: -Math.random(), life: 0.5, color: p.color
                 });
                 if (this.checkRectOverlap(pRect, {x:p.x, y:p.y-40, w:p.w, h:p.h})) { 
                     if (!this.player.isStunned && this.respawnInvulnTimer <= 0) {
                        const dmg = p.damage || 20;
                        this.player.takeDamage(dmg, (p.vx > 0 ? 1 : -1));
                        this.player.vy = -8; 
                     }
                 }
                 continue; 
            }

            // Impact
            if (p.y > 580) { 
                this.createExplosion(p.x, p.y, 40);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Player Hit
            if (this.checkRectOverlap(pRect, {x: p.x-p.w/2, y: p.y-p.h/2, w: p.w, h: p.h})) {
                if (!this.player.isStunned && this.respawnInvulnTimer <= 0) {
                    const dmg = p.damage || 20;
                    this.player.takeDamage(dmg, (p.vx > 0 ? 1 : -1));
                    this.createExplosion(p.x, p.y, 20);
                    this.projectiles.splice(i, 1);
                }
            }
        }
    },

    updateEffects: function() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            let e = this.explosions[i];
            e.life -= 0.05;
            e.r += 1;
            if (e.life <= 0) this.explosions.splice(i, 1);
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let part = this.particles[i];
            part.x += part.vx;
            part.y += part.vy;
            part.life -= 0.02;
            if (part.life <= 0) this.particles.splice(i, 1);
        }
    },

    createExplosion: function(x, y, radius) {
        this.explosions.push({x: x, y: y, r: 10, maxR: radius, life: 1.0});
        this.shake = 5;
    },

    explodeBoss: function() {
        this.shake = 100;
        this.flashIntensity = 1.0;
        for(let i=0; i<50; i++) {
            this.particles.push({
                x: this.boss.x, y: this.boss.y,
                vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20,
                life: 2.0, color: '#ffaa00'
            });
        }
    },

    handlePlayerDeath: function() {
        this.deathCount++;
        console.log(`Player Died. Death Count: ${this.deathCount}`);
        
        this.player.hp = this.player.maxHp;
        this.player.isStunned = false;
        this.player.vx = 0; 
        this.player.vy = 0;
        
        this.respawnInvulnTimer = 3000;

        if (this.bossArenaActive) {
            this.player.x = 600; 
            this.player.y = 500;
        } else {
            this.player.x = -600;
            this.player.y = 500;
        }

        if (this.deathCount < 3) {
            this.boss.hp = this.boss.maxHp;
            this.boss.phase = 1;
            this.boss.x = 800; 
            this.boss.y = 400;
            this.boss.state = this.bossArenaActive ? 'chase' : 'dormant';
            this.flashIntensity = 0.5; 
        } else {
            this.boss.x = 800;
            this.boss.y = 400;
            this.boss.state = this.bossArenaActive ? 'chase' : 'dormant';
            this.boss.timer = 1000;
            this.flashIntensity = 0.5; 
        }
        
        this.projectiles = [];
    },

    checkRectOverlap: function(r1, r2) {
        return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
                r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
    },

    playSound: function(name) {
        if (this.engine && this.engine.playSound) this.engine.playSound(name);
    },

    render: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#050505"); 
        grd.addColorStop(1, "#1a0505"); 
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.translate(-this.cameraX, 0);
        
        ctx.fillStyle = "#111";
        for(let i=-6; i<12; i++) {
            ctx.fillRect(i * 200, 100, 40, 500); 
        }

        for (let plat of this.platforms) {
            if (plat.type === 'ground') {
                ctx.fillStyle = "#1a1010"; 
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = "#500";
                ctx.fillRect(plat.x, plat.y, plat.w, 4); 
            } else if (plat.type === 'floating') {
                ctx.fillStyle = "#333";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = "#555";
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
            } else if (plat.type === 'wall') {
                ctx.fillStyle = "#080808";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            }
        }

        if (this.boss && !this.boss.dead) {
            this.renderBoss(ctx);
        }

        for (let p of this.projectiles) {
            if (p.type === 'shockwave') {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y - p.h, p.w, p.h);
                ctx.fillStyle = "#ffff00";
                ctx.fillRect(p.x + 5, p.y - p.h + 5, p.w - 10, p.h - 10);
            } else {
                ctx.fillStyle = p.color || '#fff';
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
                ctx.fillRect(p.x - p.w/2, p.y - p.h/2, p.w, p.h);
                ctx.shadowBlur = 0;
            }
        }

        for (let e of this.explosions) {
            ctx.fillStyle = `rgba(255, 100, 0, ${e.life})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
            ctx.fill();
        }
        for (let part of this.particles) {
            ctx.fillStyle = part.color;
            ctx.globalAlpha = part.life;
            const s = part.scale || 4;
            ctx.fillRect(part.x, part.y, s, s);
        }
        ctx.globalAlpha = 1.0;

        if (this.player) {
            if (this.respawnInvulnTimer > 0) {
                if (Math.floor(this.time * 20) % 2 === 0) {
                    ctx.globalAlpha = 0.5;
                }
            }
            this.player.render(ctx);
            ctx.globalAlpha = 1.0;
        }

        ctx.restore();

        if (this.flashIntensity > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, w, h);
        }

        if (this.boss && !this.boss.dead && this.player && this.player.x > -200) {
            const barW = 600;
            const barX = (w - barW) / 2;
            const barY = 40;
            
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.fillRect(barX - 4, barY - 4, barW + 8, 20);
            
            const pct = Math.max(0, this.boss.hp / this.boss.maxHp);
            let hpColor = "#ff0000"; 
            if (this.deathCount >= 3) hpColor = "#ffaa00"; 

            ctx.fillStyle = hpColor;
            ctx.fillRect(barX, barY, barW * pct, 12);
            
            ctx.font = "bold 16px sans-serif";
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.fillText("SOLARIS, THE SUN-EATER", w/2, barY - 10);
            ctx.textAlign = "left";
        }
        
        if (this.player) {
            ctx.fillStyle = "red";
            ctx.fillRect(20, 20, 200 * (this.player.hp / this.player.maxHp), 10);
            ctx.strokeStyle = "#fff";
            ctx.strokeRect(20, 20, 200, 10);
        }

        if (this.levelComplete) {
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 50px sans-serif";
            ctx.textAlign = "center";
            ctx.shadowBlur = 20;
            ctx.shadowColor = "gold";
            ctx.fillText("LEGEND CONQUERED", w/2, h/2);
            ctx.shadowBlur = 0;
            ctx.textAlign = "left";
        }
    },

    renderBoss: function(ctx) {
        const b = this.boss;
        const scale = 12;
        
        ctx.save();
        ctx.translate(b.x, b.y);
        
        const shake = (b.state === 'casting') ? (Math.random()-0.5)*5 : 0;
        ctx.translate(shake, Math.sin(b.pulse)*5);

        if (b.facingRight) ctx.scale(-1, 1);

        const grid = b.matrix;
        const startX = -(grid[0].length * scale) / 2;
        const startY = -(grid.length * scale) / 2;

        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                const val = grid[r][c];
                if (val === 0) continue;

                let color = "#000";
                if (val === 1) color = b.colors.ROCK;
                if (val === 4) color = b.colors.ARMOR;
                
                if (val === 6) {
                    const p = (Math.sin(b.pulse * 5) + 1) / 2;
                    color = (b.phase === 2) ? b.colors.PHASE2 : b.colors.CORE;
                }
                
                if (val === 3) {
                    color = (b.phase === 2) ? "#ff0000" : b.colors.EYE;
                }

                ctx.fillStyle = color;
                ctx.fillRect(startX + c*scale, startY + r*scale, scale, scale);
            }
        }
        ctx.restore();
    }
};