// Engine Simulator - main.js
// This is a complete implementation of the engine simulator game

// Set up the game canvas and context
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game state
const GameState = {
  SPLASH: 0,
  MENU: 1,
  CREDITS: 2,
  WORKSHOP: 3,
  SIMULATION: 4
};

let currentState = GameState.SPLASH;
let alpha = 0; // For fade effects
let loadingProgress = 0;
let engine = null;

// UI elements
const uiElements = {
  title: { text: 'Engine Simulator', x: 0, y: 0, size: 48, alpha: 0 },
  version: { text: 'Version 0.2 Beta', x: 0, y: 60, size: 24, alpha: 0 },
  buttons: [],
  credits: []
};

// Engine configuration
const engineConfig = {
  strokeType: 4, // 2 or 4 stroke
  cylinders: 4,
  layout: 'inline', // inline, v, boxer
  displacement: 2000, // cc
  piston: {
    diameter: 86,
    stroke: 86,
    rings: 3,
    material: 'aluminum'
  },
  fuelType: 'gasoline',
  aspiration: 'naturally-aspirated',
  valvesPerCylinder: 2,
  exhaust: {
    diameter: 50,
    muffler: true,
    turbo: false
  },
  ecu: {
    idleRPM: 800,
    redline: 7000,
    revLimit: 7500
  }
};

// Physics simulation
class EngineSimulation {
  constructor(config) {
    this.config = config;
    this.rpm = 0;
    this.throttle = 0;
    this.running = false;
    this.cyclePosition = 0;
    this.pistonPositions = [];
    this.torque = 0;
    this.horsepower = 0;
    
    for (let i = 0; i < config.cylinders; i++) {
      this.pistonPositions.push(0);
    }
  }
  
  start() {
    this.running = true;
    this.rpm = this.config.ecu.idleRPM;
  }
  
  stop() {
    this.running = false;
    this.rpm = 0;
    this.throttle = 0;
  }
  
  update(deltaTime) {
    if (!this.running) return;
    
    // Basic physics simulation
    const rpmChange = this.throttle * 1000 - this.rpm * 0.05;
    this.rpm += rpmChange * deltaTime;
    
    // Limit RPM
    if (this.rpm > this.config.ecu.revLimit) {
      this.rpm = this.config.ecu.revLimit;
    } else if (this.rpm < this.config.ecu.idleRPM) {
      this.rpm = this.config.ecu.idleRPM;
    }
    
    // Calculate piston positions based on RPM
    const cycleSpeed = (this.rpm / 60) * deltaTime;
    this.cyclePosition = (this.cyclePosition + cycleSpeed) % 1;
    
    // Update each piston position
    const phaseOffset = 1 / this.config.cylinders;
    for (let i = 0; i < this.pistonPositions.length; i++) {
      const phase = (i * phaseOffset) % 1;
      const position = Math.abs(Math.sin((this.cyclePosition + phase) * Math.PI * 2));
      this.pistonPositions[i] = position;
    }
    
    // Simple torque calculation
    const displacementEffect = this.config.displacement / 1000;
    const strokeEffect = this.config.piston.stroke / 86;
    const aspirationEffect = this.config.aspiration === 'turbo' ? 1.3 : 
                           this.config.aspiration === 'supercharged' ? 1.2 : 1;
    
    this.torque = (displacementEffect * strokeEffect * aspirationEffect * this.throttle * 50) + 10;
    this.horsepower = (this.torque * this.rpm) / 5252;
  }
  
  // Draw the engine visualization
  draw(ctx) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Draw engine block
    ctx.fillStyle = '#333';
    const engineWidth = 300 + (this.config.cylinders - 4) * 50;
    const engineHeight = 200;
    ctx.fillRect(centerX - engineWidth/2, centerY - engineHeight/2, engineWidth, engineHeight);
    
    // Draw cylinders based on layout
    if (this.config.layout === 'inline') {
      this.drawInlineEngine(ctx, centerX, centerY, engineWidth, engineHeight);
    } else if (this.config.layout === 'v') {
      this.drawVEngine(ctx, centerX, centerY, engineWidth, engineHeight);
    } else if (this.config.layout === 'boxer') {
      this.drawBoxerEngine(ctx, centerX, centerY, engineWidth, engineHeight);
    }
    
    // Draw crankshaft
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(centerX, centerY + 50, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw RPM and metrics
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`RPM: ${Math.round(this.rpm)}`, 20, 30);
    ctx.fillText(`Torque: ${Math.round(this.torque)} Nm`, 20, 60);
    ctx.fillText(`Horsepower: ${Math.round(this.horsepower)} HP`, 20, 90);
  }
  
  drawInlineEngine(ctx, x, y, width, height) {
    const cylinderSpacing = width / (this.config.cylinders + 1);
    
    for (let i = 0; i < this.config.cylinders; i++) {
      const cylinderX = x - width/2 + (i + 1) * cylinderSpacing;
      
      // Draw cylinder
      ctx.fillStyle = '#444';
      ctx.fillRect(cylinderX - 20, y - height/2 + 30, 40, height - 60);
      
      // Draw piston
      const pistonY = y - 30 + (1 - this.pistonPositions[i]) * 50;
      ctx.fillStyle = '#888';
      ctx.fillRect(cylinderX - 15, pistonY - 10, 30, 20);
      
      // Draw connecting rod
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cylinderX, pistonY);
      ctx.lineTo(x, y + 50);
      ctx.stroke();
    }
  }
  
  drawVEngine(ctx, x, y, width, height) {
    // Similar to inline but with two banks
  }
  
  drawBoxerEngine(ctx, x, y, width, height) {
    // Similar to inline but with opposing cylinders
  }
}

// Initialize the game
function init() {
  // Set up event listeners
  window.addEventListener('resize', resizeCanvas);
  canvas.addEventListener('click', handleClick);
  window.addEventListener('keydown', handleKeyDown);
  
  // Create menu buttons
  createMenu();
  createCredits();
  
  // Start game loop
  requestAnimationFrame(gameLoop);
}

// Create menu UI
function createMenu() {
  uiElements.buttons = [
    { 
      text: 'Play', 
      x: canvas.width/2 - 50, 
      y: canvas.height/2, 
      width: 100, 
      height: 40,
      action: () => { 
        fadeToState(GameState.WORKSHOP); 
      },
      hover: false,
      alpha: 0
    },
    { 
      text: 'Credits', 
      x: canvas.width/2 - 50, 
      y: canvas.height/2 + 60, 
      width: 100, 
      height: 40,
      action: () => { 
        fadeToState(GameState.CREDITS); 
      },
      hover: false,
      alpha: 0
    },
    { 
      text: 'Quit', 
      x: canvas.width/2 - 50, 
      y: canvas.height/2 + 120, 
      width: 100, 
      height: 40,
      action: () => { 
        window.close(); // Will only work if window was opened by script
      },
      hover: false,
      alpha: 0
    }
  ];
}

// Create credits UI
function createCredits() {
  uiElements.credits = [
    { text: 'Credits', x: canvas.width/2, y: 100, size: 32, alpha: 0 },
    { text: 'Design & Development:', x: canvas.width/2, y: 160, size: 24, alpha: 0 },
    { text: 'ChatGPT', x: canvas.width/2, y: 200, size: 20, alpha: 0 },
    { text: 'Concept:', x: canvas.width/2, y: 240, size: 24, alpha: 0 },
    { text: 'Loay', x: canvas.width/2, y: 280, size: 20, alpha: 0 },
    { text: 'Sound:', x: canvas.width/2, y: 320, size: 24, alpha: 0 },
    { text: 'Adam', x: canvas.width/2, y: 360, size: 20, alpha: 0 },
    { 
      text: '← Back', 
      x: 60, 
      y: 40, 
      size: 20,
      action: () => { fadeToState(GameState.MENU); },
      hover: false,
      alpha: 0 
    }
  ];
}

// Handle canvas resize
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Recalculate UI positions
  createMenu();
  createCredits();
}

// Handle mouse clicks
function handleClick(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (currentState === GameState.MENU) {
    uiElements.buttons.forEach(button => {
      if (x > button.x && x < button.x + button.width &&
          y > button.y && y < button.y + button.height) {
        button.action();
      }
    });
  } else if (currentState === GameState.CREDITS) {
    const backButton = uiElements.credits.find(item => item.text === '← Back');
    if (x > backButton.x - 50 && x < backButton.x + 50 &&
        y > backButton.y - 15 && y < backButton.y + 15) {
      backButton.action();
    }
  } else if (currentState === GameState.WORKSHOP) {
    // Handle workshop UI interactions
    // (Implementation would go here)
  }
}

// Handle keyboard input
function handleKeyDown(e) {
  if (currentState === GameState.SIMULATION && engine) {
    if (e.key === 'w' || e.key === 'W') {
      engine.throttle = Math.min(1, engine.throttle + 0.1);
    } else if (e.key === 's' || e.key === 'S') {
      engine.throttle = Math.max(0, engine.throttle - 0.1);
    }
  }
}

// Handle state transitions with fade
function fadeToState(newState) {
  const fadeOut = () => {
    alpha -= 0.02;
    if (alpha <= 0) {
      alpha = 0;
      currentState = newState;
      return;
    }
    requestAnimationFrame(fadeOut);
  };
  
  const fadeIn = () => {
    alpha += 0.02;
    if (alpha >= 1) {
      alpha = 1;
      return;
    }
    requestAnimationFrame(fadeIn);
  };
  
  fadeOut();
  fadeIn();
}

// Main game loop
let lastTime = 0;
function gameLoop(timestamp) {
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  
  // Clear canvas
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid background
  drawGrid();
  
  // State-specific rendering
  switch (currentState) {
    case GameState.SPLASH:
      renderSplash(deltaTime);
      break;
    case GameState.MENU:
      renderMenu();
      break;
    case GameState.CREDITS:
      renderCredits();
      break;
    case GameState.WORKSHOP:
      renderWorkshop();
      break;
    case GameState.SIMULATION:
      renderSimulation(deltaTime);
      break;
  }
  
  requestAnimationFrame(gameLoop);
}

// Draw grid background
function drawGrid() {
  const gridSize = 40;
  const offsetX = (Date.now() * 0.01) % gridSize;
  const offsetY = (Date.now() * 0.01) % gridSize;
  
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  
  // Vertical lines
  for (let x = -offsetX; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = -offsetY; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// Render splash screen
function renderSplash(deltaTime) {
  // Fade in title
  uiElements.title.alpha = Math.min(1, uiElements.title.alpha + deltaTime * 0.5);
  
  // After title is visible, fade in version
  if (uiElements.title.alpha >= 1) {
    uiElements.version.alpha = Math.min(1, uiElements.version.alpha + deltaTime * 0.5);
  }
  
  // After both are visible, load and transition to menu
  if (uiElements.version.alpha >= 1) {
    loadingProgress += deltaTime * 0.3;
    if (loadingProgress >= 1) {
      fadeToState(GameState.MENU);
      loadingProgress = 0;
    }
  }
  
  // Draw title
  ctx.fillStyle = `rgba(255, 255, 255, ${uiElements.title.alpha})`;
  ctx.font = `${uiElements.title.size}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(
    uiElements.title.text, 
    canvas.width/2, 
    canvas.height/2 - 50
  );
  
  // Draw version
  ctx.fillStyle = `rgba(200, 200, 200, ${uiElements.version.alpha})`;
  ctx.font = `${uiElements.version.size}px Arial`;
  ctx.fillText(
    uiElements.version.text, 
    canvas.width/2, 
    canvas.height/2 + 20
  );
  
  // Draw loading progress
  if (uiElements.version.alpha >= 1) {
    const dots = '.'.repeat(Math.floor(loadingProgress * 3) % 4);
    ctx.fillText(
      `Loading${dots}`,
      canvas.width/2,
      canvas.height/2 + 60
    );
  }
}

// Render menu screen
function renderMenu() {
  // Draw title
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Engine Simulator 2', 
    canvas.width/2, 
    canvas.height/2 - 100
  );
  
  // Draw buttons with hover effects
  uiElements.buttons.forEach(button => {
    // Check hover state
    button.hover = false;
    
    // Draw button background
    ctx.fillStyle = button.hover 
      ? `rgba(50, 150, 255, ${alpha})`
      : `rgba(30, 80, 150, ${alpha})`;
      
    const buttonX = button.hover ? button.x - 5 : button.x;
    ctx.fillRect(buttonX, button.y, button.width, button.height);
    
    // Draw button text
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      button.text, 
      buttonX + button.width/2, 
      button.y + button.height/2 + 8
    );
  });
  
  // Draw footer
  ctx.fillStyle = `rgba(150, 150, 150, ${alpha})`;
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Gin Studios', 20, canvas.height - 20);
  
  ctx.textAlign = 'right';
  ctx.fillText('Version 0.2', canvas.width - 20, canvas.height - 20);
}

// Render credits screen
function renderCredits() {
  uiElements.credits.forEach(item => {
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = `${item.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(item.text, item.x, item.y);
  });
  
  // Back button
  const backButton = uiElements.credits.find(item => item.text === '← Back');
  ctx.fillStyle = backButton.hover 
    ? `rgba(255, 100, 100, ${alpha})`
    : `rgba(255, 50, 50, ${alpha})`;
  ctx.font = `${backButton.size}px Arial`;
  ctx.textAlign = 'left';
  ctx.fillText(backButton.text, backButton.x, backButton.y + 10);
}

// Render workshop (engine builder)
function renderWorkshop() {
  // Draw title
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.font = '32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Engine Workshop', canvas.width/2, 40);
  
  // Simulate loading before going to simulation
  loadingProgress += 0.01;
  if (loadingProgress >= 1) {
    engine = new EngineSimulation(engineConfig);
    fadeToState(GameState.SIMULATION);
    loadingProgress = 0;
  }
  
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.font = '24px Arial';
  ctx.fillText(
    'Building your engine...', 
    canvas.width/2, 
    canvas.height/2
  );
  
  const dots = '.'.repeat(Math.floor(loadingProgress * 10) % 4);
  ctx.fillText(
    `Loading${dots}`,
    canvas.width/2,
    canvas.height/2 + 40
  );
}

// Render simulation (running engine)
function renderSimulation(deltaTime) {
  // Update engine simulation
  engine.update(deltaTime);
  
  // Draw engine
  engine.draw(ctx);
  
  // Draw controls info
  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Controls:', canvas.width - 200, 30);
  ctx.fillText('W/S - Increase/Decrease Throttle', canvas.width - 200, 60);
  
  // Back button
  ctx.fillStyle = 'rgba(255, 50, 50, 0.7)';
  ctx.fillRect(20, 20, 80, 30);
  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Stop', 60, 40);
}

// Start the game
init();
