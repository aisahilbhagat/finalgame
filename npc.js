(function() {
    // --- CONFIGURATION ---
    const CONFIG = {
        PIXEL_SCALE: 6,
        WALK_SPEED: 1.8,
        ANIM_SPEED: 10,
        DETECT_RANGE: 450, 
        STOP_RANGE: 90     
    };

    // --- PALETTE ---
    const NPC_PALETTE = {
        ' ': null, '.': '#1a1a1a', 's': '#f0c0a0', 'S': '#8d5524',
        'g': '#3e4a38', 'G': '#5b6e54', 'b': '#4a3b32',
        'r': '#8a3324', 'd': '#2f2f2f', 'h': '#c0c0c0',
        'H': '#2a1d15', 'K': '#5c4033', 'k': '#8b5a2b'
    };

    // --- FRAMES ---
    const NPC_FRAMES = {
        elder: {
            idle: [[ "   hhhh     ", "  hhsshh    ", "  h....h    ", "  .gggg.    ", " .GggggG.   ", " sGggggGs   ", "  gggggg    ", "  gggggg    ", "  gggggg    ", " .bb..bb.   ", " .bb..bb.   ", "  ..  ..    " ]],
            walk: [
                [ "   hhhh     ", "  hhsshh    ", "  h....h    ", "  .gggg.    ", " .GggggG.   ", " sGggggGs   ", "  gggggg    ", "  gggggg    ", "  gggggg    ", " .bb....    ", " .bb....    ", "  ..        " ],
                [ "   hhhh     ", "  hhsshh    ", "  h....h    ", "  .gggg.    ", " .GggggG.   ", " sGggggGs   ", "  gggggg    ", "  gggggg    ", "  gggggg    ", " .bb..bb.   ", " .bb..bb.   ", "  ..  ..    " ],
                [ "   hhhh     ", "  hhsshh    ", "  h....h    ", "  .gggg.    ", " .GggggG.   ", " sGggggGs   ", "  gggggg    ", "  gggggg    ", "  gggggg    ", "    ..bb.   ", "    ..bb.   ", "      ..    " ],
                [ "   hhhh     ", "  hhsshh    ", "  h....h    ", "  .gggg.    ", " .GggggG.   ", " sGggggGs   ", "  gggggg    ", "  gggggg    ", "  gggggg    ", " .bb..bb.   ", " .bb..bb.   ", "  ..  ..    " ]
            ]
        },
        scavenger: {
            idle: [[ "   HHHH     ", "  HHSSHH    ", " KH....HK   ", " K.rrrr.K   ", " .drrrrd.   ", " Sd....dS   ", "  dddddd    ", "  dddddd    ", "  .bbbb.    ", " .bb..bb.   ", " .dd..dd.   ", "  ..  ..    " ]],
            walk: [
                [ "   HHHH     ", "  HHSSHH    ", " KH....HK   ", " K.rrrr.K   ", " .drrrrd.   ", " Sd....dS   ", "  dddddd    ", "  dddddd    ", "  .bbbb.    ", " .bb..bb.   ", " .dd...d.   ", "  ..   .    " ],
                [ "   HHHH     ", "  HHSSHH    ", " KH....HK   ", " K.rrrr.K   ", " .drrrrd.   ", " Sd....dS   ", "  dddddd    ", "  dddddd    ", "  .bbbb.    ", " .bb..bb.   ", " .dd..dd.   ", "  ..  ..    " ],
                [ "   HHHH     ", "  HHSSHH    ", " KH....HK   ", " K.rrrr.K   ", " .drrrrd.   ", " Sd....dS   ", "  dddddd    ", "  dddddd    ", "  .bbbb.    ", " .bb..bb.   ", " .d...dd.   ", "  .   ..    " ],
                [ "   HHHH     ", "  HHSSHH    ", " KH....HK   ", " K.rrrr.K   ", " .drrrrd.   ", " Sd....dS   ", "  dddddd    ", "  dddddd    ", "  .bbbb.    ", " .bb..bb.   ", " .dd..dd.   ", "  ..  ..    " ]
            ]
        }
    };

    class NPC {
        constructor(x, y, type) {
            this.x = x; this.y = y;
            this.type = type;
            this.width = 12 * CONFIG.PIXEL_SCALE;
            this.height = 12 * CONFIG.PIXEL_SCALE;
            this.hitbox = { offsetX: 10, offsetY: 40, width: 50, height: 30 };
            this.vx = 0;
            this.facingRight = (type === 'elder'); 
            this.state = 'idle'; 
            this.frameIndex = 0; this.frameTimer = 0;
        }

        update(dt, player, otherNPCs) {
            this.vx = 0;
            this.state = 'idle';

            if (player) {
                const dx = (player.x + player.width/2) - (this.x + this.width/2);
                if (Math.abs(dx) < CONFIG.DETECT_RANGE) {
                    this.facingRight = (dx > 0);
                    if (Math.abs(dx) > CONFIG.STOP_RANGE) {
                        this.vx = (dx > 0 ? 1 : -1) * CONFIG.WALK_SPEED;
                        this.state = 'walk';
                    }
                }
            }

            const nextX = this.x + this.vx;
            let hit = false;
            
            // Collision Checks
            if (player && this.checkCollision(nextX, this.y, player)) hit = true;
            if (!hit && otherNPCs) {
                for (let other of otherNPCs) {
                    if (other !== this && this.checkCollision(nextX, this.y, other)) {
                        hit = true; break;
                    }
                }
            }

            if (!hit) this.x = nextX;
            else { this.vx = 0; this.state = 'idle'; }

            this.animate();
        }

        // --- DIRECTOR MODE METHOD (Added for cutscene) ---
        moveTo(targetX) {
            const dx = targetX - this.x;
            if (Math.abs(dx) > 2) {
                this.x += Math.sign(dx) * CONFIG.WALK_SPEED;
                this.state = 'walk';
                this.facingRight = (dx > 0);
                this.animate();
            } else {
                this.x = targetX;
                this.state = 'idle';
            }
        }

        checkCollision(newX, newY, entity) {
            const myLeft = newX + this.hitbox.offsetX;
            const myRight = myLeft + this.hitbox.width;
            const myTop = newY + this.hitbox.offsetY;
            const myBottom = myTop + this.hitbox.height;

            let eL, eR, eT, eB;
            if (entity.hitbox) {
                eL = entity.x + entity.hitbox.offsetX;
                eR = eL + entity.hitbox.width;
                eT = entity.y + entity.hitbox.offsetY;
                eB = eT + entity.hitbox.height;
            } else {
                eL = entity.x; eR = entity.x + entity.width;
                eT = entity.y; eB = entity.y + entity.height;
            }

            return (myLeft < eR && myRight > eL && myTop < eB && myBottom > eT);
        }

        animate() {
            if (this.state === 'walk') {
                this.frameTimer++;
                if (this.frameTimer > CONFIG.ANIM_SPEED) {
                    this.frameIndex = (this.frameIndex + 1) % 4;
                    this.frameTimer = 0;
                }
            } else {
                this.frameIndex = 0;
            }
        }

        render(ctx) {
            const frames = (this.state === 'walk') ? NPC_FRAMES[this.type].walk : NPC_FRAMES[this.type].idle;
            this.drawSprite(ctx, frames[this.frameIndex || 0]);
        }

        drawSprite(ctx, frameData) {
            if (!frameData) return;
            ctx.save();
            const scale = CONFIG.PIXEL_SCALE;
            
            if (!this.facingRight) {
                ctx.translate(this.x + this.width, this.y);
                ctx.scale(-1, 1);
                ctx.translate(-this.x, -this.y);
                ctx.translate(this.x, this.y);
            } else {
                ctx.translate(this.x, this.y);
            }

            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(this.width/2/scale*scale, 11*scale, 4*scale, 1.5*scale, 0, 0, Math.PI*2);
            ctx.fill();

            for (let r = 0; r < frameData.length; r++) {
                const row = frameData[r];
                for (let c = 0; c < row.length; c++) {
                    const char = row[c];
                    const color = NPC_PALETTE[char];
                    if (color) {
                        ctx.fillStyle = color;
                        ctx.fillRect(c * scale, r * scale, scale, scale);
                    }
                }
            }
            ctx.restore();
        }
    }

    window.NPC = NPC;
})();