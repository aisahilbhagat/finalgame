window.GameEnd = {
    engine: null,
    videoElement: null,

    init: function(engine) {
        this.engine = engine;
        console.log("End Scene Initialized");
    },

    load: function() {
        console.log("Playing Ending Sequence...");
        
        // 1. Create Video Element
        this.videoElement = document.createElement('video');
        this.videoElement.id = "ending_video";
        this.videoElement.src = "ending.mp4"; // Ensure this file exists
        this.videoElement.style.position = "fixed";
        this.videoElement.style.top = "0";
        this.videoElement.style.left = "0";
        this.videoElement.style.width = "100%";
        this.videoElement.style.height = "100%";
        this.videoElement.style.objectFit = "cover";
        this.videoElement.style.zIndex = "20000"; // Topmost layer
        this.videoElement.style.backgroundColor = "black";
        this.videoElement.autoplay = true;
        this.videoElement.controls = false;
        this.videoElement.playsInline = true;
        
        document.body.appendChild(this.videoElement);

        // 2. Play Video
        this.videoElement.play().catch(e => {
            console.warn("Autoplay blocked, waiting for interaction", e);
            this.addPlayOverlay();
        });

        // 3. Handle Completion
        this.videoElement.addEventListener("ended", () => {
            console.log("Ending video finished.");
            this.showEndScreen();
        });

        this.videoElement.onerror = () => {
            console.warn("Ending video missing or failed.");
            this.showEndScreen();
        };
    },

    addPlayOverlay: function() {
        const overlay = document.createElement('div');
        overlay.id = "play-overlay";
        overlay.style.position = 'fixed';
        overlay.style.top = '0'; overlay.style.left = '0';
        overlay.style.width = '100%'; overlay.style.height = '100%';
        overlay.style.zIndex = '20001';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.cursor = 'pointer';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        
        const text = document.createElement('h1');
        text.innerText = "CLICK TO START ENDING";
        text.style.color = 'white';
        text.style.fontFamily = 'monospace';
        text.style.textShadow = '0 0 10px black';
        
        overlay.appendChild(text);
        document.body.appendChild(overlay);
        
        overlay.onclick = () => {
            if(this.videoElement) this.videoElement.play();
            overlay.remove();
        };
    },

    showEndScreen: function() {
        // Remove video to clear resources
        this.cleanup();

        // Create Final UI
        const container = document.createElement('div');
        container.id = 'end-screen-overlay';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.backgroundColor = 'black'; // Fade to black
        container.style.color = 'white';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.zIndex = '20002';
        container.style.fontFamily = 'monospace';
        container.style.opacity = '0';
        container.style.transition = 'opacity 2s ease-in';

        const title = document.createElement('h1');
        title.innerText = "THE END";
        title.style.fontSize = '80px';
        title.style.marginBottom = '20px';
        title.style.color = '#fff';
        title.style.textShadow = '0 0 20px #fff';

        const sub = document.createElement('p');
        sub.innerText = "Thanks for playing.";
        sub.style.fontSize = '24px';
        sub.style.marginBottom = '60px';
        sub.style.color = '#888';

        const btn = document.createElement('button');
        btn.innerText = "EXIT TO MAIN MENU";
        btn.style.padding = '15px 30px';
        btn.style.fontSize = '20px';
        btn.style.fontFamily = 'monospace';
        btn.style.backgroundColor = 'transparent';
        btn.style.color = 'white';
        btn.style.border = '2px solid white';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.3s ease';
        
        btn.onmouseover = () => { 
            btn.style.backgroundColor = 'white'; 
            btn.style.color = 'black'; 
            btn.style.boxShadow = '0 0 15px white';
        };
        btn.onmouseout = () => { 
            btn.style.backgroundColor = 'transparent'; 
            btn.style.color = 'white'; 
            btn.style.boxShadow = 'none';
        };
        
        // --- REDIRECT LOGIC ---
        btn.onclick = () => {
            // Reloading the page is the cleanest way to reset the Engine, 
            // clear memory, and load menu.js fresh.
            location.reload(); 
        };

        container.appendChild(title);
        container.appendChild(sub);
        container.appendChild(btn);
        document.body.appendChild(container);

        // Trigger Fade In
        requestAnimationFrame(() => {
            container.style.opacity = '1';
        });
    },

    cleanup: function() {
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.remove();
            this.videoElement = null;
        }
        const playOverlay = document.getElementById('play-overlay');
        if (playOverlay) playOverlay.remove();
    },

    update: function() { /* No logic needed */ },
    render: function(ctx) { /* No canvas rendering needed */ }
};