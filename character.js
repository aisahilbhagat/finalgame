/**
 * PIXEL ART DATA
 */
const PALETTE = {
    ' ': null, // Transparent
    '.': '#000000', // Outline/Black
    's': '#ffccaa', // Skin
    'h': '#aaccff', // Helmet highlight
    'm': '#666666', // Metal/Helmet
    'b': '#3366ff', // Body/Armor Blue
    'd': '#2244aa', // Dark Blue
    'g': '#dddddd', // Grey/Blade
    'w': '#8B4513'  // Wood/Hilt
};

// EXPOSE FRAMES TO WINDOW
window.FRAMES = {
    idle: [
        [
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
        ]
    ],
    // Added crouch frame (lowered head and body)
    crouch: [
        [
            "            ",
            "            ",
            "            ",
            "  mmmmmm    ",
            " m.mhhmm.   ",
            " m.mhhmm.   ",
            " m.......   ",
            "  .s.s.s.   ",
            "  .bbbb.    ",
            " .d.bb.d.   ",
            " ..bbbb..   ",
            "  .m..m.    "
        ]
    ],
    // Added crouch walking animation (shuffling feet)
    crouch_walk: [
        [
            "            ",
            "            ",
            "            ",
            "  mmmmmm    ",
            " m.mhhmm.   ",
            " m.mhhmm.   ",
            " m.......   ",
            "  .s.s.s.   ",
            "  .bbbb.    ",
            " .d.bb.d.   ",
            " ..bbbb..   ",
            "  .m..m.    " // Neutral
        ],
        [
            "            ",
            "            ",
            "            ",
            "  mmmmmm    ",
            " m.mhhmm.   ",
            " m.mhhmm.   ",
            " m.......   ",
            "  .s.s.s.   ",
            "  .bbbb.    ",
            " .d.bb.d.   ",
            " ..bbbb..   ",
            " m......m   " // Stretch legs
        ],
        [
            "            ",
            "            ",
            "            ",
            "  mmmmmm    ",
            " m.mhhmm.   ",
            " m.mhhmm.   ",
            " m.......   ",
            "  .s.s.s.   ",
            "  .bbbb.    ",
            " .d.bb.d.   ",
            " ..bbbb..   ",
            "  .m..m.    " // Neutral
        ],
        [
            "            ",
            "            ",
            "            ",
            "  mmmmmm    ",
            " m.mhhmm.   ",
            " m.mhhmm.   ",
            " m.......   ",
            "  .s.s.s.   ",
            "  .bbbb.    ",
            " .d.bb.d.   ",
            " ..bbbb..   ",
            "   .mm.     " // Gather legs
        ]
    ],
    run: [
        [ "  mmmmmm    ", " m.mhhmm.   ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  .bbbb.    ", "  d.bb.d    ", "  d.bb.d    ", "  .bbbb.    ", "    ...m.   ", "       ..   " ],
        [ "            ", "  mmmmmm    ", " m.mhhmm.   ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  .bbbb.    ", " .d.bb.d.   ", " .d.bb.d.   ", " ..bbbb..   ", "  .m..m.    " ],
        [ "  mmmmmm    ", " m.mhhmm.   ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  .bbbb.    ", "  d.bb.d    ", "  d.bb.d    ", "  .bbbb.    ", "   .m...    ", "   ..       " ],
        [ "            ", "  mmmmmm    ", " m.mhhmm.   ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  .bbbb.    ", " .d.bb.d.   ", " .d.bb.d.   ", " ..bbbb..   ", "  .m..m.    " ]
    ],
    attack: [
        [ "   gg       ", "   gg       ", "  mmmmmm    ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  wbbbb.    ", " .w.bb.d.   ", " ..bbbb..   ", "  .m..m.    ", "  ..  ..    " ],
        [ "            ", "            ", "  mmmmmm    ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......gww", "  .bbbb.gggg", " .d.bb.d.gww", " ..bbbb..   ", "  .m..m.    ", "  ..  ..    " ]
    ]
};

// PLACEHOLDERS
window.FRAMES.jump_start = [window.FRAMES.run[0]]; 
window.FRAMES.midair = [window.FRAMES.run[2]];     
window.FRAMES.land = [window.FRAMES.idle[0]];      
window.FRAMES.attack_jump = window.FRAMES.attack;  
window.FRAMES.hurt = [window.FRAMES.idle[0]];      
window.FRAMES.death = [window.FRAMES.idle[0]];     

// STATES
// Added CROUCH state
window.STATES = {
    IDLE: "idle", RUN: "run", JUMP_START: "jump_start", MIDAIR: "midair",
    LAND: "land", ATTACK: "attack", ATTACK_JUMP: "attack_jump", HURT: "hurt", DEATH: "death",
    CROUCH: "crouch", CROUCH_WALK: "crouch_walk"
};

// GAME SETUP
const canvas = document.getElementById('gameCanvas');
window.ctx = canvas.getContext('2d');
const ctx = window.ctx;

// Configuration
window.SPRITE_OFFSET_Y = -6; 
const PIXEL_SIZE = 6; 
const MOVEMENT_SPEED = 4;
const CROUCH_SPEED = 2; // Slower speed for crouching
const JUMP_FORCE = -14;  
const GRAVITY = 0.6;
const ANIM_SPEED = 10; 
const IDLE_SPEED = 45; 

// EXPOSE STATE TO WINDOW
window.state = {
    x: 100, y: 300, width: 36, height: 60,
    vx: 0, vy: 0, groundY: 0, facingRight: true,
    anim: window.STATES.IDLE,
    frameIndex: 0, frameTimer: 0,
    isAttacking: false, isGrounded: false, justLanded: false, wasGrounded: false,
    isHurt: false, health: 100,
    hitbox: { offsetX: 18, offsetY: 6, width: 36, height: 60 }
};
const state = window.state;

// INPUTS
// Added ArrowDown to keys
const keys = { ArrowRight: false, ArrowLeft: false, ArrowUp: false, ArrowDown: false, Space: false, jumpLocked: false };

// RESIZE
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    state.groundY = canvas.height - 50; 
    
    // Safety check for simple ground logic
    const hb = state.hitbox;
    if (state.y + hb.offsetY + hb.height >= state.groundY - 12) { 
        state.y = state.groundY - (hb.offsetY + hb.height);
        state.vy = 0;
        state.isGrounded = true;
    }
}
window.addEventListener('resize', resize);
resize();

// EVENT LISTENERS
window.addEventListener('keydown', (e) => {
    if(e.code === 'ArrowRight' || e.code === 'KeyD') keys.ArrowRight = true;
    if(e.code === 'ArrowLeft' || e.code === 'KeyA') keys.ArrowLeft = true;
    if(e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.ArrowUp = true;
    // Added 'S' and 'ArrowDown' support
    if(e.code === 'ArrowDown' || e.code === 'KeyS') keys.ArrowDown = true;
    if(e.code === 'KeyE' && !state.isAttacking) triggerAttack();
});

window.addEventListener('keyup', (e) => {
    if(e.code === 'ArrowRight' || e.code === 'KeyD') keys.ArrowRight = false;
    if(e.code === 'ArrowLeft' || e.code === 'KeyA') keys.ArrowLeft = false;
    // Added 'S' and 'ArrowDown' support
    if(e.code === 'ArrowDown' || e.code === 'KeyS') keys.ArrowDown = false;
    if(e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        keys.ArrowUp = false;
        keys.jumpLocked = false;
    }
});

// MOBILE CONTROLS
const handleMobilePress = (key, val) => {
    keys[key] = val;
    if (key === 'ArrowUp' && !val) {
        keys.jumpLocked = false;
    }
};

const addTouch = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', (e) => { e.preventDefault(); handleMobilePress(key, true); }, {passive:false});
    el.addEventListener('touchend', (e) => { e.preventDefault(); handleMobilePress(key, false); }, {passive:false});
    el.addEventListener('mousedown', () => handleMobilePress(key, true));
    el.addEventListener('mouseup', () => handleMobilePress(key, false));
};
addTouch('btn-left', 'ArrowLeft');
addTouch('btn-right', 'ArrowRight');
addTouch('btn-jump', 'ArrowUp');
const btnAtk = document.getElementById('btn-atk');
if (btnAtk) {
    btnAtk.addEventListener('touchstart', (e) => { e.preventDefault(); triggerAttack(); }, {passive: false});
    btnAtk.addEventListener('mousedown', triggerAttack);
}

// LOGIC
function triggerAttack() {
    if (state.isAttacking) return;
    state.isAttacking = true;
    setTimeout(() => { state.isAttacking = false; }, 300);
}

function setState(newState) {
    if (state.anim === newState) return;
    state.anim = newState;
    state.frameIndex = 0;
    state.frameTimer = 0;
}

window.updateAnimationState = function() {
    const s = window.STATES; 
    if (state.health <= 0) return setState(s.DEATH);
    if (state.isHurt) return setState(s.HURT);
    if (state.isAttacking && state.isGrounded) return setState(s.ATTACK);
    if (state.isAttacking && !state.isGrounded) return setState(s.ATTACK_JUMP);
    
    // Check for crouch and crouch walking
    if (state.isGrounded && keys.ArrowDown && !state.isAttacking) {
        if (Math.abs(state.vx) > 0) return setState(s.CROUCH_WALK);
        return setState(s.CROUCH);
    }

    if (!state.isGrounded && state.vy < 0) return setState(s.JUMP_START);
    if (!state.isGrounded && state.vy > 0) return setState(s.MIDAIR);

    if (state.isGrounded && state.justLanded) {
        state.justLanded = false; 
        return setState(s.LAND);
    }

    if (state.isGrounded && Math.abs(state.vx) > 0) return setState(s.RUN);
    return setState(s.IDLE);
}

window.update = function() {
    if (!state.wasGrounded && state.isGrounded) state.justLanded = true;
    state.wasGrounded = state.isGrounded;

    // Movement Logic
    if (!state.isAttacking) {
        // Determine speed: Slower if crouching, normal otherwise
        let speed = MOVEMENT_SPEED;
        if (keys.ArrowDown && state.isGrounded) {
            speed = CROUCH_SPEED;
        }

        if (keys.ArrowRight) { state.vx = speed; state.facingRight = true; }
        else if (keys.ArrowLeft) { state.vx = -speed; state.facingRight = false; }
        else { state.vx = 0; }
    } else { state.vx = 0; }
    
    // Call animation update *after* determining intent but *before* applying movement helps
    // But we need to ensure the animation state reflects the 'vx=0' from crouching.
    window.updateAnimationState();

    // Jump logic
    if (keys.ArrowUp && !keys.jumpLocked && state.isGrounded && !state.isAttacking && !keys.ArrowDown) {
        state.vy = JUMP_FORCE;
        state.isGrounded = false;
        keys.jumpLocked = true;
    }

    state.vy += GRAVITY; 
    state.x += state.vx;
    state.y += state.vy;

    // DEFAULT GROUND CHECK
    const hb = state.hitbox;
    if (state.y + hb.offsetY + hb.height >= state.groundY - 2) {
        state.y = state.groundY - (hb.offsetY + hb.height);
        state.vy = 0;
        state.isGrounded = true;
    } else {
        state.isGrounded = false;
    }

    // Boundaries
    if (state.x + hb.offsetX < 0) state.x = -hb.offsetX;
    if (state.x + hb.offsetX + hb.width > canvas.width) {
        state.x = canvas.width - (hb.offsetX + hb.width);
    }

    state.frameTimer++;
    let spd = ANIM_SPEED;
    if (state.anim === window.STATES.ATTACK || state.anim === window.STATES.ATTACK_JUMP) spd = 8;
    // Crouch walk uses a slightly slower speed than run to feel like a shuffle
    if (state.anim === window.STATES.CROUCH_WALK) spd = 14;
    // Crouch walk uses default ANIM_SPEED (10), Static crouch uses IDLE_SPEED
    if (state.anim === window.STATES.IDLE || state.anim === window.STATES.CROUCH) spd = IDLE_SPEED;
    
    if (state.frameTimer >= spd) {
        state.frameIndex++;
        state.frameTimer = 0;
        if (window.FRAMES[state.anim]) {
            if (state.frameIndex >= window.FRAMES[state.anim].length) state.frameIndex = 0;
        }
    }
}

// EXPOSE RENDERER
window.drawPixelSprite = function(ctx, frameData, x, y, scale, flip) {
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
            const color = PALETTE[char];
            if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(c * scale, r * scale, scale, scale);
            }
        }
    }
    ctx.restore();
}

window.render = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const set = window.FRAMES[state.anim];
    if (!set) return;
    const i = state.frameIndex % set.length;
    window.drawPixelSprite(ctx, set[i], state.x, state.y + window.SPRITE_OFFSET_Y, PIXEL_SIZE, state.facingRight);
}

function loop() {
    if (window.update) window.update();
    if (window.render) window.render();
    requestAnimationFrame(loop);
}

loop();