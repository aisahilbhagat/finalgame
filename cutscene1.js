window.Cutscene1 = {
    engine: null,
    videoElement: null,
    skipButton: null,
    
    // Hold-to-skip variables
    holdOverlay: null,
    holdProgressBar: null,
    holdTimer: null,
    isHolding: false,
    holdDuration: 2500, // 2.5 seconds to skip

    handleKeyDown: null,
    handleKeyUp: null,

    init: function(engine) {
        this.engine = engine;
        console.log("Cutscene 1 Initialized");
    },

    load: function() {
        console.log("Playing Cutscene 1...");
        
        // 1. Create Video Element
        this.videoElement = document.createElement('video');
        this.videoElement.id = "cutscene_video";
        Object.assign(this.videoElement.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            zIndex: "10000",
            backgroundColor: "black",
            objectFit: "cover"
        });
        this.videoElement.muted = false;
        this.videoElement.playsInline = true;
        this.videoElement.preload = "auto";
        this.videoElement.src = "cut1.mp4"; 
        
        document.body.appendChild(this.videoElement);

        // 2. Create Skip Button (Aqua Theme)
        this.createSkipButton();

        // 3. Create Hold Animation UI (Hidden by default)
        this.createHoldOverlay();

        // 4. Input Handling (Spacebar Hold)
        this.handleKeyDown = (e) => {
            // Check !this.isHolding to prevent key-repeat from resetting the timer
            if (e.code === "Space" && !this.isHolding) {
                e.preventDefault(); 
                this.isHolding = true;
                this.startHold();
            }
        };

        this.handleKeyUp = (e) => {
            if (e.code === "Space") {
                e.preventDefault();
                this.isHolding = false;
                this.cancelHold();
            }
        };

        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);

        // 5. Video Events
        this.videoElement.load();

        this.videoElement.addEventListener("canplay", () => {
            console.log("Cutscene ready to play");
            this.videoElement.play().catch(e => console.error("Play failed:", e));
        }, { once: true });

        this.videoElement.addEventListener("ended", () => {
            console.log("Cutscene finished naturally");
            this.finish();
        });
        
        this.videoElement.onerror = () => {
            console.warn("Video failed to load, skipping.");
            this.finish();
        };
    },

    createSkipButton: function() {
        this.skipButton = document.createElement('button');
        this.skipButton.innerText = "SKIP >>";
        
        // Style the button - Aqua Light Theme
        Object.assign(this.skipButton.style, {
            position: "fixed",
            top: "20px",
            left: "20px",
            zIndex: "10001",
            padding: "10px 20px",
            backgroundColor: "rgba(0, 0, 0, 0.5)", // Dark semi-transparent background
            color: "#00FFFF", // Aqua Light Text
            border: "2px solid #00FFFF", // Aqua Light Border
            borderRadius: "5px",
            cursor: "pointer",
            fontFamily: "Arial, sans-serif",
            fontSize: "14px",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "1px",
            pointerEvents: "auto",
            transition: "all 0.2s ease"
        });

        // Hover glow effect
        this.skipButton.onmouseenter = () => {
            this.skipButton.style.backgroundColor = "rgba(0, 255, 255, 0.2)";
            this.skipButton.style.boxShadow = "0 0 15px #00FFFF";
        };
        this.skipButton.onmouseleave = () => {
            this.skipButton.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
            this.skipButton.style.boxShadow = "none";
        };

        this.skipButton.onclick = () => {
            console.log("Skip button clicked");
            this.finish(); // Instant skip on click
        };

        document.body.appendChild(this.skipButton);
    },

    createHoldOverlay: function() {
        // Container for the hold animation (Centered Bottom)
        this.holdOverlay = document.createElement('div');
        Object.assign(this.holdOverlay.style, {
            position: "fixed",
            bottom: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: "10001",
            opacity: "0", // Hidden initially
            transition: "opacity 0.2s",
            textAlign: "center",
            pointerEvents: "none"
        });

        // Text label
        const label = document.createElement('div');
        label.innerText = "HOLD SPACE TO SKIP";
        Object.assign(label.style, {
            color: "#00FFFF", // Aqua
            fontFamily: "Arial, sans-serif",
            fontSize: "12px",
            fontWeight: "bold",
            marginBottom: "8px",
            letterSpacing: "2px",
            textShadow: "0 0 5px black"
        });

        // Progress Bar Background
        const barContainer = document.createElement('div');
        Object.assign(barContainer.style, {
            width: "200px",
            height: "4px",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            borderRadius: "2px",
            overflow: "hidden"
        });

        // Actual Progress Bar (Fills up)
        this.holdProgressBar = document.createElement('div');
        Object.assign(this.holdProgressBar.style, {
            width: "0%",
            height: "100%",
            backgroundColor: "#00FFFF", // Aqua
            boxShadow: "0 0 10px #00FFFF",
            transition: "none" // Managed via JS
        });

        barContainer.appendChild(this.holdProgressBar);
        this.holdOverlay.appendChild(label);
        this.holdOverlay.appendChild(barContainer);
        document.body.appendChild(this.holdOverlay);
    },

    startHold: function() {
        if (!this.holdOverlay) return;
        
        // Show the UI
        this.holdOverlay.style.opacity = "1";
        
        // Force reflow to ensure the transition triggers from 0%
        this.holdProgressBar.getBoundingClientRect(); 
        
        // Animate width to 100% over the hold duration
        this.holdProgressBar.style.transition = `width ${this.holdDuration}ms linear`;
        this.holdProgressBar.style.width = "100%";

        // Set the timeout to trigger the actual skip
        this.holdTimer = setTimeout(() => {
            console.log("Hold complete: Skipping...");
            this.finish();
        }, this.holdDuration);
    },

    cancelHold: function() {
        // Clear the skip timer
        if (this.holdTimer) {
            clearTimeout(this.holdTimer);
            this.holdTimer = null;
        }

        if (this.holdOverlay) {
            // Hide UI
            this.holdOverlay.style.opacity = "0";
            
            // Snap bar back to 0 instantly
            this.holdProgressBar.style.transition = "none"; 
            this.holdProgressBar.style.width = "0%";
        }
    },

    finish: function() {
        this.cleanup();
        if (this.engine) {
            this.engine.handleContentComplete();
        }
    },
    
    cleanup: function() {
        // Remove Video
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.remove();
            this.videoElement = null;
        }

        // Remove Button
        if (this.skipButton) {
            this.skipButton.remove();
            this.skipButton = null;
        }

        // Remove Hold Overlay
        if (this.holdOverlay) {
            this.holdOverlay.remove();
            this.holdOverlay = null;
            this.holdProgressBar = null;
        }

        // Clear Timer
        if (this.holdTimer) {
            clearTimeout(this.holdTimer);
            this.holdTimer = null;
        }

        // Remove Event Listeners
        if (this.handleKeyDown) {
            window.removeEventListener("keydown", this.handleKeyDown);
            this.handleKeyDown = null;
        }
        if (this.handleKeyUp) {
            window.removeEventListener("keyup", this.handleKeyUp);
            this.handleKeyUp = null;
        }
    },

    update: function() { },
    render: function() { }
};