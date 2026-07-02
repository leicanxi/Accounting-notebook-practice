const GameLoop = {
  canvas: null,
  ctx: null,
  running: false,
  lastTime: 0,
  animFrameId: null,
  width: 0,
  height: 0,
  annualExpense: 0,
  currency: 'CNY',
  resizeTimer: null,
  needsRelayout: false,
  bgStars: [],

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.applyResize();
    this.initBgStars();
    this.bindEvents();
  },

  initBgStars() {
    this.bgStars = [];
    for (let i = 0; i < 50; i += 1) {
      this.bgStars.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        size: 0.5 + Math.random() * 2,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  },

  applyResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    if (Spawner) Spawner.respawnOnResize();
    if (Character) Character.onResize();
    this.needsRelayout = false;
  },

  resize() {
    this.needsRelayout = true;
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.applyResize();
    }, 120);
  },

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('click', (event) => {
      if (this.needsRelayout) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('open')) {
        const sidebarRect = sidebar.getBoundingClientRect();
        if (event.clientX >= sidebarRect.left) return;
        Sidebar.close();
        return;
      }

      const panel = document.getElementById('config-panel');
      if (panel && panel.style.display === 'block') {
        const panelRect = panel.getBoundingClientRect();
        if (
          event.clientX >= panelRect.left &&
          event.clientX <= panelRect.right &&
          event.clientY >= panelRect.top &&
          event.clientY <= panelRect.bottom
        ) {
          return;
        }
        Panel.close();
        return;
      }

      if (Character && Character.hitTest(x, y)) {
        Sidebar.open();
        return;
      }

      if (BallManager) BallManager.onClick(x, y);
    });
  },

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  },

  stop() {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  },

  drawPacManBackground(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0a1030');
    grad.addColorStop(0.55, '#091126');
    grad.addColorStop(1, '#050813');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = 'rgba(42, 99, 255, 0.14)';
    ctx.lineWidth = 1;
    for (let x = 40; x < this.width; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    const time = Date.now() / 1000;
    ctx.fillStyle = '#ffffff';
    this.bgStars.forEach((star) => {
      const alpha = 0.25 + 0.35 * Math.sin(time * 2 + star.twinkle);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(
        (star.x + time * 5) % this.width,
        (star.y + time * 3) % this.height,
        star.size,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  },

  drawHUD(ctx) {
    const padding = 22;
    const x = this.width - padding;
    const y = padding + 16;
    const displayAmount = this.getDisplayAmount();

    ctx.font = 'bold 24px "Courier New", "Press Start 2P", monospace';
    const textWidth = ctx.measureText(displayAmount).width + 40;

    ctx.fillStyle = 'rgba(7, 13, 43, 0.94)';
    ctx.strokeStyle = '#3ddcff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - textWidth, y - 28, textWidth, 56, 12);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 217, 61, 0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - textWidth + 8, y - 20, textWidth - 16, 40);

    ctx.fillStyle = '#3ddcff';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(displayAmount, x - 10, y + 10);

    ctx.fillStyle = '#ffd93d';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('SCORE', x - 10, y - 10);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff5b9a';
    ctx.fillText('LEVEL 1', padding, 28);
    ctx.fillStyle = '#72f06a';
    ctx.fillText('PELLETS', padding, 48);
  },

  getDisplayAmount() {
    const symbol = getCurrencySymbol(this.currency);
    const converted = convertFromCNY(this.annualExpense, this.currency);
    if (this.currency === 'JPY') {
      return `${symbol}${Math.round(converted)}`;
    }
    return `${symbol}${converted.toFixed(2)}`;
  },

  setAnnualExpense(amountCNY) {
    this.annualExpense = amountCNY;
  },

  addExpense(amountCNY) {
    this.annualExpense += amountCNY;
  },

  setCurrency(code) {
    this.currency = code;
  },

  loop(timestamp) {
    if (!this.running) return;

    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    const ctx = this.ctx;
    this.drawPacManBackground(ctx);

    if (Character) Character.update(deltaTime);
    if (BallManager) BallManager.updateAll(deltaTime);
    if (AnimationManager) AnimationManager.update(deltaTime);

    if (BallManager) BallManager.drawAll(ctx);
    if (Character) Character.draw(ctx);
    if (AnimationManager) AnimationManager.draw(ctx);

    this.drawHUD(ctx);

    if (Spawner) Spawner.checkAndSpawn();

    this.animFrameId = requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
  }
};

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h, r) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    this.lineTo(x + r.bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    this.lineTo(x, y + r.tl);
    this.quadraticCurveTo(x, y, x + r.tl, y);
    this.closePath();
    return this;
  };
}

window.GameLoop = GameLoop;
