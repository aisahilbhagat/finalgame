(function() {
    /**
     * SECTION: ASSETS & CONFIG
     * DESIGN: Red Shirt Character with Fixed Attack Animation
     */
    const CHAR_PALETTE = { 
        ' ': null, 
        '.': '#000000', 
        's': '#ffccaa', // Skin
        'h': '#aaccff', // Hat/Hair highlight
        'm': '#666666', // Hat/Hair main
        'b': '#FF0000', // Shirt Main (Red)
        'd': '#990000', // Shirt Dark/Shading (Dark Red)
        'g': '#dddddd', // Weapon/Item (Grey/Silver)
        'w': '#8B4513'  // Wood/Handle (Brown)
    };

    const CHAR_FRAMES = {
        idle: [[ 
            "  mmmmmm    ", 
            " m.mhhmm.   ", 
            " m.mhhmm.   ", 
            " m.......   ", 
            "  .s.s.s.   ", 
            "  .......   ", 
            "  .bbbb.    ", 
            " .d.bb.d.   ", 
            " .d.bb.d.   ", 
            " ..bbbb..   ", 
            "  .m..m.    ", 
            "  ..  ..    " 
        ]],
        run: [
            [ 
                "  mmmmmm    ", 
                " m.mhhmm.   ", 
                " m.mhhmm.   ", 
                " m.......   ", 
                "  .s.s.s.   ", 
                "  .......   ", 
                "  .bbbb.    ", 
                "  d.bb.d    ", 
                "  d.bb.d    ", 
                "  .bbbb.    ", 
                "    ...m.   ", 
                "       ..   " 
            ],
            [ 
                "            ", 
                "  mmmmmm    ", 
                " m.mhhmm.   ", 
                " m.mhhmm.   ", 
                " m.......   ", 
                "  .s.s.s.   ", 
                "  .......   ", 
                "  .bbbb.    ", 
                " .d.bb.d.   ", 
                " .d.bb.d.   ", 
                " ..bbbb..   ", 
                "  .m..m.    " 
            ], // Bobbing effect
            [ 
                "  mmmmmm    ", 
                " m.mhhmm.   ", 
                " m.mhhmm.   ", 
                " m.......   ", 
                "  .s.s.s.   ", 
                "  .......   ", 
                "  .bbbb.    ", 
                "  d.bb.d    ", 
                "  d.bb.d    ", 
                "  .bbbb.    ", 
                "   .m...    ", 
                "   ..       " 
            ],
            [ 
                "            ", 
                "  mmmmmm    ", 
                " m.mhhmm.   ", 
                " m.mhhmm.   ", 
                " m.......   ", 
                "  .s.s.s.   ", 
                "  .......   ", 
                "  .bbbb.    ", 
                " .d.bb.d.   ", 
                " .d.bb.d.   ", 
                " ..bbbb..   ", 
                "  .m..m.    " 
            ]
        ],
        // FIXED ATTACK ANIMATION (Imported from character.js)
        attack: [
            [ 
                "   gg       ", // Sword Up
                "   gg       ", 
                "  mmmmmm    ", 
                " m.mhhmm.   ", 
                " m.......   ", 
                "  .s.s.s.   ", 
                "  .......   ", 
                "  wbbbb.    ", // Hilt visible
                " .w.bb.d.   ", 
                " ..bbbb..   ", 
                "  .m..m.    ", 
                "  ..  ..    " 
            ],
            [ 
                "            ", 
                "            ", 
                "  mmmmmm    ", 
                " m.mhhmm.   ", 
                " m.......   ", 
                "  .s.s.s.   ", 
                "  .......gww", // Sword Swing Forward
                "  .bbbb.gggg", // Blade extending
                " .d.bb.d.gww", 
                " ..bbbb..   ", 
                "  .m..m.    ", 
                "  ..  ..    " 
            ]
        ]
    };

    CHAR_FRAMES.hurt = [CHAR_FRAMES.idle[0]];      
    CHAR_FRAMES.death = [CHAR_FRAMES.idle[0]];     

    const CHAR_STATES = { IDLE: "idle", RUN: "run", ATTACK: "attack", HURT: "hurt", DEATH: "death" };
    const PIXEL_SIZE = 6; 
    const MOVEMENT_SPEED = 5; 
    const ANIM_SPEED = 8; 
    const SPRITE_OFFSET_Y = -6; 

    // --- STATIC INPUT HANDLING ---
    // Fixes issue where multiple listeners were attached on restart
    const INPUT_STATE = { 
        ArrowRight: false, ArrowLeft: false, ArrowUp: false, ArrowDown: false, 
        AttackPressed: false 
    };

    // Attach listeners once
    if (!window.characterInputsAttached) {
        window.addEventListener('keydown', (e) => {
            if(e.code === 'ArrowRight' || e.code === 'KeyD') INPUT_STATE.ArrowRight = true;
            if(e.code === 'ArrowLeft' || e.code === 'KeyA') INPUT_STATE.ArrowLeft = true;
            if(e.code === 'ArrowUp' || e.code === 'KeyW') INPUT_STATE.ArrowUp = true;
            if(e.code === 'ArrowDown' || e.code === 'KeyS') INPUT_STATE.ArrowDown = true;
            if(e.code === 'KeyE' || e.code === 'Space') INPUT_STATE.AttackPressed = true;
        });

        window.addEventListener('keyup', (e) => {
            if(e.code === 'ArrowRight' || e.code === 'KeyD') INPUT_STATE.ArrowRight = false;
            if(e.code === 'ArrowLeft' || e.code === 'KeyA') INPUT_STATE.ArrowLeft = false;
            if(e.code === 'ArrowDown' || e.code === 'KeyS') INPUT_STATE.ArrowDown = false;
            if(e.code === 'ArrowUp' || e.code === 'KeyW') INPUT_STATE.ArrowUp = false;
            if(e.code === 'KeyE' || e.code === 'Space') INPUT_STATE.AttackPressed = false;
        });
        window.characterInputsAttached = true;
    }

    class Character {
        constructor(startX, startY) {
            this.x = startX; 
            this.y = startY; 
            this.width = 36; 
            this.height = 60;
            this.vx = 0; 
            this.vy = 0; 
            this.facingRight = true;
            this.anim = CHAR_STATES.IDLE;
            this.frameIndex = 0; 
            this.frameTimer = 0;
            this.isAttacking = false; 
            this.canAttack = true; 
            this.isMoving = false; // Exposed for World.js Audio
            
            this.hitbox = { offsetX: 8, offsetY: 48, width: 20, height: 12 };
            
            this.minX = 0; 
            this.minY = 0; 
            this.worldLimitW = 800; 
            this.worldLimitH = 600;
        }

        triggerAttack() {
            if (this.isAttacking || !this.canAttack) return;
            this.isAttacking = true;
            this.canAttack = false;
            setTimeout(() => { this.isAttacking = false; }, 300);
            setTimeout(() => { this.canAttack = true; }, 500);
        }

        setState(newState) {
            if (this.anim === newState) return;
            this.anim = newState;
            this.frameIndex = 0;
            this.frameTimer = 0;
        }

        update(dt, obstacles) {
            this.vx = 0; 
            this.vy = 0;

            if (INPUT_STATE.AttackPressed) this.triggerAttack();

            if (!this.isAttacking) {
                if (INPUT_STATE.ArrowRight) { this.vx = MOVEMENT_SPEED; this.facingRight = true; }
                if (INPUT_STATE.ArrowLeft) { this.vx = -MOVEMENT_SPEED; this.facingRight = false; }
                if (INPUT_STATE.ArrowUp) { this.vy = -MOVEMENT_SPEED; }
                if (INPUT_STATE.ArrowDown) { this.vy = MOVEMENT_SPEED; }
            }
            
            if (this.vx !== 0 && this.vy !== 0) {
                this.vx *= 0.707;
                this.vy *= 0.707;
            }

            // Set Movement State (Used by World.js for Audio)
            this.isMoving = (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1);

            let newState = CHAR_STATES.IDLE;
            if (this.isAttacking) newState = CHAR_STATES.ATTACK;
            else if (this.isMoving) newState = CHAR_STATES.RUN;
            this.setState(newState);

            const nextX = this.x + this.vx;
            const nextY = this.y + this.vy;

            if (!this.checkCollision(nextX, this.y, obstacles)) this.x = nextX;
            if (!this.checkCollision(this.x, nextY, obstacles)) this.y = nextY;

            // Boundaries
            const hb = this.hitbox;
            if (this.x + hb.offsetX < this.minX) this.x = this.minX - hb.offsetX;
            if (this.x + hb.offsetX + hb.width > this.worldLimitW) this.x = this.worldLimitW - (hb.offsetX + hb.width);
            if (this.y + hb.offsetY < this.minY) this.y = this.minY - hb.offsetY;
            if (this.y + hb.offsetY + hb.height > this.worldLimitH) this.y = this.worldLimitH - (hb.offsetY + hb.height);

            // Animation
            this.frameTimer++;
            let spd = (this.anim === CHAR_STATES.ATTACK) ? 6 : ANIM_SPEED;
            if (this.frameTimer >= spd) {
                this.frameIndex++;
                this.frameTimer = 0;
                if (CHAR_FRAMES[this.anim]) {
                    if (this.frameIndex >= CHAR_FRAMES[this.anim].length) this.frameIndex = 0;
                }
            }
        }

        checkCollision(newX, newY, obstacles) {
            if (!obstacles || obstacles.length === 0) return false;
            const pLeft = newX + this.hitbox.offsetX;
            const pRight = pLeft + this.hitbox.width;
            const pTop = newY + this.hitbox.offsetY;
            const pBottom = pTop + this.hitbox.height;

            for (let obs of obstacles) {
                if (!obs.collision) continue;
                const o = obs.collision;
                if (pLeft < o.x + o.w && pRight > o.x && pTop < o.y + o.h && pBottom > o.y) return true; 
            }
            return false;
        }

        drawPixelSprite(ctx, frameData, x, y, scale, isFacingRight) {
            if (!frameData) return;
            ctx.save();
            const width = frameData[0].length * scale;
            
            // Flip Context if facing LEFT
            if (!isFacingRight) {
                ctx.translate(x + width, y);
                ctx.scale(-1, 1);
            } else {
                ctx.translate(x, y);
            }
            
            // Draw Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse((width/2)/scale * scale, 12 * scale, 4 * scale, 1.5 * scale, 0, 0, Math.PI * 2);
            ctx.fill();

            // Draw Pixels
            for (let r = 0; r < frameData.length; r++) {
                const row = frameData[r];
                for (let c = 0; c < row.length; c++) {
                    const char = row[c];
                    const color = CHAR_PALETTE[char];
                    if (color) {
                        ctx.fillStyle = color;
                        ctx.fillRect(c * scale, r * scale, scale, scale);
                    }
                }
            }
            ctx.restore();
        }

        render(ctx) {
            const set = CHAR_FRAMES[this.anim];
            if (!set) return;
            const i = this.frameIndex % set.length;
            this.drawPixelSprite(ctx, set[i], Math.floor(this.x), Math.floor(this.y + SPRITE_OFFSET_Y), PIXEL_SIZE, this.facingRight);
        }
    }

    window.Character = Character;
})();