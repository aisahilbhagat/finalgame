window.SettingsScreen = {
    // --- STATE ---
    volume: 0.5, // 0.0 to 1.0
    isDragging: false,

    // --- UI ELEMENTS ---
    backBtn: { 
        x: 40, y: 40, w: 100, h: 40, label: "BACK",
        scale: 1, targetScale: 1, isHovered: false, isPressed: false
    },
    
    // Slider geometry
    slider: { x: 0, y: 0, w: 320, h: 24 }, // Slightly taller for better grip

    // --- AUDIO ---
    clickSound: new Audio('mouse-click.wav'),

    init: function() {
        console.log("Settings Screen initialized");
        this.backBtn.scale = 1;
        this.backBtn.targetScale = 1;
        this.backBtn.isHovered = false;
        this.backBtn.isPressed = false;
        this.isDragging = false;

        // Sync local volume with actual Menu volume
        if (window.GameMenu && window.GameMenu.menuMusic) {
            this.volume = window.GameMenu.menuMusic.volume;
        }
    },

    getMousePos: function(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    },

    // Update volume based on mouse X position relative to slider
    updateVolumeFromMouse: function(mouseX, cx) {
        // Effective width logic to keep knob inside bounds
        const startX = cx - this.slider.w / 2;
        let val = (mouseX - startX) / this.slider.w;
        
        // Clamp between 0 and 1
        val = Math.max(0, Math.min(1, val));
        this.volume = val;

        // Apply to GameMenu immediately
        if (window.GameMenu) {
            window.GameMenu.setMusicVolume(this.volume);
        }
    },

    handleMouseMove: function(e, canvas) {
        const pos = this.getMousePos(e, canvas);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const b = this.backBtn;

        // 1. Back Button Hover
        if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
            b.isHovered = true;
            b.targetScale = b.isPressed ? 0.95 : 1.1;
        } else {
            b.isHovered = false;
            b.targetScale = 1.0;
            b.isPressed = false;
        }

        // 2. Slider Logic
        const sliderX = cx - this.slider.w / 2;
        const sliderY = cy - 40;
        
        // Check hover with a bit of padding for easier grabbing
        const isOverSlider = (pos.x >= sliderX - 10 && pos.x <= sliderX + this.slider.w + 10 &&
                              pos.y >= sliderY - 15 && pos.y <= sliderY + this.slider.h + 15);

        // Dragging Logic
        if (this.isDragging) {
            this.updateVolumeFromMouse(pos.x, cx);
        }

        if (b.isHovered || isOverSlider || this.isDragging) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'default';
        }
    },

    handleMouseDown: function(e, canvas) {
        const pos = this.getMousePos(e, canvas);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const b = this.backBtn;
        
        // Back Button
        if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
            b.isPressed = true;
            b.targetScale = 0.95;
            this.playClick();
        }

        // Slider Interaction
        const sliderX = cx - this.slider.w / 2;
        const sliderY = cy - 40;
        
        // Expanded hitbox
        if (pos.x >= sliderX - 10 && pos.x <= sliderX + this.slider.w + 10 &&
            pos.y >= sliderY - 15 && pos.y <= sliderY + this.slider.h + 15) {
            
            this.isDragging = true;
            this.updateVolumeFromMouse(pos.x, cx);
        }
    },

    handleMouseUp: function(e) {
        this.isDragging = false;

        const b = this.backBtn;
        if (b.isPressed) {
            b.isPressed = false;
            b.targetScale = b.isHovered ? 1.1 : 1.0;
            
            if (b.isHovered) {
                if(window.GameMenu) window.GameMenu.closeSubScreen();
            }
        }
    },

    playClick: function() {
        this.clickSound.currentTime = 0;
        this.clickSound.play().catch(e => {});
    },

    // --- HELPER TO DRAW ROUNDED RECTANGLES ---
    drawRoundRect: function(ctx, x, y, w, h, radius) {
        if (w < 2 * radius) radius = w / 2;
        if (h < 2 * radius) radius = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    },

    render: function(ctx, canvas) {
        // --- RESTORED ORIGINAL BACKGROUND COLOR ---
        ctx.fillStyle = "#1a0a0a"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px monospace";
        ctx.shadowColor = "#000"; ctx.shadowBlur = 10;
        ctx.fillText("SYSTEM SETTINGS", cx, 100);
        ctx.shadowBlur = 0;

        // --- MUSIC VOLUME SLIDER UI ---
        const sY = cy - 40;
        const sX = cx - this.slider.w / 2;
        const sW = this.slider.w;
        const sH = this.slider.h;
        
        // Label
        ctx.textAlign = "center";
        ctx.fillStyle = "#ccc";
        ctx.font = "bold 20px monospace";
        ctx.fillText(`MUSIC VOLUME: ${Math.round(this.volume * 100)}%`, cx, sY - 25);

        // 1. Track Background (Dark rounded slot)
        ctx.save();
        this.drawRoundRect(ctx, sX, sY, sW, sH, sH / 2);
        ctx.fillStyle = "#0f0505"; // Slightly darker red/black for track to match theme
        ctx.fill();
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // 2. Filled Progress (Glowing Gradient)
        const progressW = sW * this.volume;
        if (progressW > sH) { // Only draw if wide enough
            ctx.save();
            // Draw gradient bar
            const grad = ctx.createLinearGradient(sX, sY, sX + progressW, sY);
            grad.addColorStop(0, "#2980b9"); // Darker Blue
            grad.addColorStop(1, "#3498db"); // Lighter Blue
            
            this.drawRoundRect(ctx, sX + 2, sY + 2, progressW - 4, sH - 4, (sH-4)/2);
            
            ctx.fillStyle = grad;
            ctx.shadowColor = "#3498db";
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.restore();
        }

        // 3. Knob (Handle)
        const knobX = sX + progressW;
        const knobY = sY + sH / 2;
        const knobSize = sH + 6; // Bigger than track

        ctx.save();
        ctx.beginPath();
        ctx.arc(knobX, knobY, knobSize / 2, 0, Math.PI * 2);
        
        ctx.fillStyle = "#fff";
        ctx.fill();

        // Knob Border / Glow
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.isDragging ? "#89cff0" : "#2980b9";
        ctx.shadowColor = this.isDragging ? "#fff" : "transparent";
        ctx.shadowBlur = this.isDragging ? 10 : 0;
        ctx.stroke();
        ctx.restore();


        // --- HARDCODED OPTIONS ---
        ctx.font = "18px monospace";
        ctx.fillStyle = "#555"; 
        ctx.fillText("Graphics: HIGH (Fixed)", cx, cy + 60);
        ctx.fillText("Controls: KEYBOARD (Fixed)", cx, cy + 100);

        // --- ANIMATED BACK BUTTON ---
        const b = this.backBtn;
        b.scale += (b.targetScale - b.scale) * 0.2;

        ctx.save();
        const bcx = b.x + b.w / 2;
        const bcy = b.y + b.h / 2;
        ctx.translate(bcx, bcy);
        ctx.scale(b.scale, b.scale);
        
        const drawX = -b.w / 2;
        const drawY = -b.h / 2;

        ctx.fillStyle = "#333";
        ctx.fillRect(drawX, drawY, b.w, b.h);
        ctx.strokeStyle = "#777";
        ctx.strokeRect(drawX, drawY, b.w, b.h);
        
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.label, 0, 0);

        ctx.restore();
    }
};