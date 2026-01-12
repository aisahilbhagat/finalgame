/**
 * LEVEL CHARACTER (Class Implementation)
 * Follows the "Set calls Actor" pattern.
 * Attaches to window.LevelCharacter so Level1 can instantiate it.
 * * UPDATE: Added climbing, health, and stun mechanics (Opt-in).
 * * UPDATE: Added Web Audio API Sound Manager (Synthesized SFX).
 */

// --- 1. Sound Manager (Synthesizer) ---
class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return; // Browser doesn't support audio
        
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Keep volume reasonable
        this.masterGain.connect(this.ctx.destination);
        this.initialized = true;
    }

    playTone(freq, type, duration, slideTo = null) {
        if (!this.initialized) this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type; // 'square', 'sawtooth', 'triangle', 'sine'
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playNoise(duration) {
        if (!this.initialized) this.init();
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 1000;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.connect(noiseFilter);
        noiseFilter.connect(gain);
        gain.connect(this.masterGain);

        noise.start();
    }

    // --- SFX Presets ---
    jump()   { this.playTone(150, 'square', 0.1, 600); }      // Rising square wave
    attack() { this.playTone(400, 'sawtooth', 0.1, 100); }    // Quick saw drop
    damage() { this.playTone(200, 'sawtooth', 0.3, 50); }     // Low slide
    step()   { this.playNoise(0.05); }                        // Short noise burst
}

window.SoundManager = new SoundManager();


// --- 2. Input Handling ---
if (!window.playerKeys) {
    window.playerKeys = { 
        ArrowRight: false, ArrowLeft: false, ArrowUp: false, ArrowDown: false, 
        Space: false, jumpLocked: false, 
        KeyD: false, KeyA: false, KeyW: false, KeyS: false, KeyE: false
    };

    window.addEventListener('keydown', (e) => {
        // Init audio on first interaction if needed
        if (window.SoundManager && !window.SoundManager.initialized) window.SoundManager.init();

        if(window.playerKeys.hasOwnProperty(e.code)) window.playerKeys[e.code] = true;
        if(e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') window.playerKeys.ArrowUp = true;
    });

    window.addEventListener('keyup', (e) => {
        if(window.playerKeys.hasOwnProperty(e.code)) window.playerKeys[e.code] = false;
        if(e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') {
            window.playerKeys.ArrowUp = false;
            window.playerKeys.jumpLocked = false;
        }
    });

    const handleMobile = (key, val) => {
        // Init audio on touch
        if (window.SoundManager && !window.SoundManager.initialized) window.SoundManager.init();
        
        window.playerKeys[key] = val;
        if (key === 'ArrowUp' && !val) window.playerKeys.jumpLocked = false;
    };
    
    const addTouch = (id, key) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', (e) => { e.preventDefault(); handleMobile(key, true); }, {passive:false});
        el.addEventListener('touchend', (e) => { e.preventDefault(); handleMobile(key, false); }, {passive:false});
        el.addEventListener('mousedown', () => handleMobile(key, true));
        el.addEventListener('mouseup', () => handleMobile(key, false));
    };
    
    setTimeout(() => {
        addTouch('btn-left', 'ArrowLeft');
        addTouch('btn-right', 'ArrowRight');
        addTouch('btn-jump', 'ArrowUp');
        const btnAtk = document.getElementById('btn-atk');
        if (btnAtk) {
            btnAtk.addEventListener('touchstart', (e) => { 
                e.preventDefault(); 
                window.playerKeys.KeyE = true; 
                setTimeout(() => window.playerKeys.KeyE = false, 100);
            }, {passive: false});
        }
    }, 500);
}

window.LevelCharacter = class LevelCharacter {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 36;
        this.height = 60;
        
        // Physics
        this.vx = 0;
        this.vy = 0;
        this.groundY = 500;
        this.gravity = 0.6;
        this.jumpForce = -14;
        this.speed = 4;
        
        // State
        this.facingRight = true;
        this.isGrounded = false;
        this.isAttacking = false;
        this.anim = "idle";
        
        // -- NEW OPTIONAL FIELDS --
        this.hp = 100;
        this.maxHp = 100;
        this.isStunned = false;
        this.stunTimer = 0;
        
        // Climbing
        this.isClimbing = false;
        this.climbSpeed = 3;

        // Animation
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.stepTimer = 0; // New timer for footstep sounds
        this.pixelSize = 6;
        this.spriteOffsetY = -6;

        this.hitbox = { offsetX: 18, offsetY: 6, width: 36, height: 60 };
        this.setupAssets();
    }

    setupAssets() {
        this.PALETTE = {
            ' ': null, '.': '#000000', 's': '#ffccaa', 'h': '#aaccff',
            'm': '#666666', 'b': '#3366ff', 'd': '#2244aa', 'g': '#dddddd', 'w': '#8B4513'
        };

        const idle = [[
            "  mmmmmm    ", " m.mhhmm.   ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ",
            "  .bbbb.    ", " .d.bb.d.   ", " .d.bb.d.   ", " ..bbbb..   ", "  .m..m.    ", "  ..  ..    "
        ]];
        
        const run = [
            [ "  mmmmmm    ", " m.mhhmm.   ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  .bbbb.    ", "  d.bb.d    ", "  d.bb.d    ", "  .bbbb.    ", "    ...m.   ", "       ..   " ],
            [ "            ", "  mmmmmm    ", " m.mhhmm.   ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  .bbbb.    ", " .d.bb.d.   ", " .d.bb.d.   ", " ..bbbb..   ", "  .m..m.    " ],
            [ "  mmmmmm    ", " m.mhhmm.   ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  .bbbb.    ", "  d.bb.d    ", "  d.bb.d    ", "  .bbbb.    ", "   .m...    ", "   ..       " ],
            [ "            ", "  mmmmmm    ", " m.mhhmm.   ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  .bbbb.    ", " .d.bb.d.   ", " .d.bb.d.   ", " ..bbbb..   ", "  .m..m.    " ]
        ];

        const attack = [
            [ "   gg       ", "   gg       ", "  mmmmmm    ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  wbbbb.    ", " .w.bb.d.   ", " ..bbbb..   ", "  .m..m.    ", "  ..  ..    " ],
            [ "            ", "            ", "  mmmmmm    ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......gww", "  .bbbb.gggg", " .d.bb.d.gww", " ..bbbb..   ", "  .m..m.    ", "  ..  ..    " ]
        ];

        this.FRAMES = {
            idle: idle,
            run: run,
            jump: [run[2]],
            fall: [run[1]],
            attack: attack,
            climb: [idle[0]] // Reuse idle for climb for now
        };
    }

    // -- NEW API METHODS --

    enterClimb(centerX) {
        if (!this.isClimbing) {
            this.isClimbing = true;
            this.vx = 0;
            this.vy = 0;
            // Snap to ladder center visually
            if (centerX !== undefined) {
                this.x = centerX - (this.width / 2) - 10; // Simple center adjustment
            }
        }
    }

    exitClimb() {
        if (this.isClimbing) {
            this.isClimbing = false;
            // Preserves momentum or resets it depending on need
        }
    }

    takeDamage(amount, knockbackDir = 0) {
        if (this.hp <= 0) return; // Already dead

        this.hp -= amount;
        
        // SFX: Damage
        if (window.SoundManager) window.SoundManager.damage();

        // Optional hook for levels (Easter Egg support)
        if (this.hp < 0 && window.Level2 && window.Level2.onLowHealth) {
             window.Level2.onLowHealth(this);
        }

        // Stun logic
        this.isStunned = true;
        this.stunTimer = 15; // Frames
        this.vx = knockbackDir * 8;
        this.vy = -4;
        this.anim = "fall";
    }

    wallSlide() {
        // Simple friction
        if (this.vy > 2) this.vy = 2;
    }

    update() {
        const keys = window.playerKeys;

        // 0. Handle Stun
        if (this.isStunned) {
            this.stunTimer--;
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;
            if (this.stunTimer <= 0) {
                this.isStunned = false;
                this.vx = 0;
            }
            // Ground collision during stun
            const bottomY = this.y + this.hitbox.offsetY + this.hitbox.height;
            if (bottomY >= this.groundY) {
                this.y = this.groundY - (this.hitbox.offsetY + this.hitbox.height);
                this.vy = 0;
                this.isGrounded = true;
            }
            return;
        }

        // 1. Movement logic modified for Climbing
        if (this.isClimbing) {
            this.isGrounded = false;
            this.anim = "climb";
            
            // Vertical Movement
            if (keys.ArrowUp || keys.KeyW) this.vy = -this.climbSpeed;
            else if (keys.ArrowDown || keys.KeyS) this.vy = this.climbSpeed;
            else this.vy = 0;

            // SFX: Climbing steps (quieter/faster than running)
            if (this.vy !== 0) {
                this.stepTimer++;
                if (this.stepTimer > 12) { // Play every 12 frames
                    if (window.SoundManager) window.SoundManager.step();
                    this.stepTimer = 0;
                }
            }

            this.x += this.vx;
            this.y += this.vy;

            // Jump out of ladder
            if ((keys.Space || keys.ArrowUp) && keys.jumpLocked === false && !keys.KeyW && !keys.ArrowUp) {
                // If pressing Jump but not holding UP explicitly
            }
            
            // Lock horizontal
            this.vx = 0;

        } else {
            // Standard Movement
            if (!this.isAttacking) {
                if (keys.ArrowRight || keys.KeyD) {
                    this.vx = this.speed;
                    this.facingRight = true;
                    this.anim = "run";
                } else if (keys.ArrowLeft || keys.KeyA) {
                    this.vx = -this.speed;
                    this.facingRight = false;
                    this.anim = "run";
                } else {
                    this.vx = 0;
                    this.anim = "idle";
                }

                // SFX: Running Steps
                if (this.vx !== 0 && this.isGrounded) {
                    this.stepTimer++;
                    if (this.stepTimer > 15) { // Play every 15 frames
                        if (window.SoundManager) window.SoundManager.step();
                        this.stepTimer = 0;
                    }
                } else {
                    this.stepTimer = 10; // Reset so next step is quick
                }

            } else {
                this.vx = 0;
            }

            // Jump
            if ((keys.ArrowUp || keys.Space || keys.KeyW) && !keys.jumpLocked && this.isGrounded && !this.isAttacking) {
                this.vy = this.jumpForce;
                this.isGrounded = false;
                keys.jumpLocked = true;
                
                // SFX: Jump
                if (window.SoundManager) window.SoundManager.jump();
            }

            // Attack
            if ((keys.KeyE) && !this.isAttacking) {
                this.isAttacking = true;
                this.anim = "attack";
                this.frameIndex = 0;
                
                // SFX: Attack
                if (window.SoundManager) window.SoundManager.attack();

                setTimeout(() => { this.isAttacking = false; }, 300);
            }

            // Physics
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;

            // Ground Collision
            const bottomY = this.y + this.hitbox.offsetY + this.hitbox.height;
            if (bottomY >= this.groundY) {
                this.y = this.groundY - (this.hitbox.offsetY + this.hitbox.height);
                this.vy = 0;
                this.isGrounded = true;
            } else {
                this.isGrounded = false;
            }

            // Animation State
            if (this.isAttacking) this.anim = "attack";
            else if (!this.isGrounded) {
                if (this.vy < 0) this.anim = "jump";
                else this.anim = "fall";
            }
        }

        // 7. Advance Frames
        this.frameTimer++;
        const animSpeed = (this.anim === "attack") ? 8 : 10;
        
        if (this.frameTimer >= animSpeed) {
            this.frameIndex++;
            this.frameTimer = 0;
        }
    }

    render(ctx) {
        if (!ctx) return;
        
        const set = this.FRAMES[this.anim] || this.FRAMES.idle;
        const frameData = set[this.frameIndex % set.length];
        
        this.drawPixelSprite(ctx, frameData, this.x, this.y + this.spriteOffsetY, this.pixelSize, this.facingRight);
        
        // Debug HP bar if damaged
        if (this.hp < this.maxHp) {
            ctx.fillStyle = "red";
            ctx.fillRect(this.x, this.y - 10, 36, 4);
            ctx.fillStyle = "lime";
            ctx.fillRect(this.x, this.y - 10, 36 * (this.hp / this.maxHp), 4);
        }
    }

    drawPixelSprite(ctx, frameData, x, y, scale, flip) {
        if (!frameData) return;
        ctx.save();
        
        const width = frameData[0].length * scale;
        
        if (!flip) {
            ctx.translate(x + width, y);
            ctx.scale(-1, 1);
        } else {
            ctx.translate(x, y);
        }

        for (let r = 0; r < frameData.length; r++) {
            const row = frameData[r];
            for (let c = 0; c < row.length; c++) {
                const char = row[c];
                const color = this.PALETTE[char];
                if (color) {
                    ctx.fillStyle = color;
                    ctx.fillRect(c * scale, r * scale, scale, scale);
                }
            }
        }
        ctx.restore();
    }
};