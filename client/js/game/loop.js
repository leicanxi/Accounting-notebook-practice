// 游戏主循环 + Canvas 初始化 + 渲染调度

const GameLoop = {
  canvas: null,
  ctx: null,
  running: false,
  lastTime: 0,
  animFrameId: null,
  width: 0,
  height: 0,

  // 年度花费金额（存储在 CNY，由后端累积维护）
  annualExpense: 0,

  // 用户币种偏好
  currency: 'CNY',

  // resize debounce
  resizeTimer: null,
  needsRelayout: false,

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.bindEvents();
  },

  resize() {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      if (Spawner) Spawner.respawnOnResize();
      if (Character) Character.onResize();
      this.needsRelayout = false;
    }, 200);
    this.needsRelayout = true;
  },

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    // Canvas click 事件 - 用于小球点击 / 糖豆人点击
    this.canvas.addEventListener('click', (e) => {
      if (this.needsRelayout) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 先检查侧边面板是否打开
      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('open')) {
        const sidebarRect = sidebar.getBoundingClientRect();
        if (e.clientX >= sidebarRect.left) return; // 点击在侧边面板区域
        // 点击游戏区域关闭面板
        Sidebar.close();
        return;
      }

      // 检查面板是否打开 → 关闭面板
      const panel = document.getElementById('config-panel');
      if (panel && panel.style.display === 'block') {
        const panelRect = panel.getBoundingClientRect();
        if (e.clientX >= panelRect.left && e.clientX <= panelRect.right &&
            e.clientY >= panelRect.top && e.clientY <= panelRect.bottom) {
          return; // 点击面板内部
        }
        Panel.close();
        return;
      }

      // hitTest 糖豆人
      if (Character && Character.hitTest(x, y)) {
        Sidebar.open();
        return;
      }

      // hitTest 小球
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

  loop(timestamp) {
    if (!this.running) return;

    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1); // 防止时间跳跃
    this.lastTime = timestamp;

    const ctx = this.ctx;

    // 1. 绘制暖色渐变背景
    const grad = ctx.createLinearGradient(0, 0, this.width, this.height);
    grad.addColorStop(0, '#FFF3E0');
    grad.addColorStop(0.5, '#FFE0B2');
    grad.addColorStop(1, '#FFCC80');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. 更新和渲染
    if (Character) Character.update(deltaTime);
    if (BallManager) BallManager.updateAll(deltaTime);
    if (AnimationManager) AnimationManager.update(deltaTime);

    // 3. 渲染层
    if (BallManager) BallManager.drawAll(ctx);
    if (Character) Character.draw(ctx);
    if (AnimationManager) AnimationManager.draw(ctx);

    // 4. HUD - 右上角年度花费
    this.drawHUD(ctx);

    // 5. 小球补充逻辑
    if (Spawner) Spawner.checkAndSpawn();

    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  },

  drawHUD(ctx) {
    const padding = 20;
    const x = this.width - padding;
    const y = padding + 20;

    // 背景
    const displayAmount = this.getDisplayAmount();
    ctx.font = 'bold 22px "Segoe UI","PingFang SC",sans-serif';
    const textWidth = ctx.measureText(displayAmount).width + 30;

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.roundRect(x - textWidth, y - 22, textWidth, 44, 12);
    ctx.fill();

    // 文字
    ctx.fillStyle = '#4A3728';
    ctx.textAlign = 'right';
    ctx.fillText(displayAmount, x - 10, y + 8);
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
  }
};

// Canvas roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
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
