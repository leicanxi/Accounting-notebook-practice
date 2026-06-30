// 糖豆人角色：SVG加载、移动、状态机

const Character = {
  x: 0,
  y: 0,
  width: 80,
  height: 100,
  state: 'IDLE',        // IDLE | MOVING | EATING
  facingRight: true,
  paused: false,
  speed: 120,           // px/s

  // IDLE 行为
  idleDirection: { x: 0, y: 0 },
  idleTimer: 0,
  idleInterval: 0,      // 2-4秒随机换方向
  jumpTimer: 0,
  jumpCooldown: 3,      // 偶尔跳跃

  // 进食目标
  targetBall: null,
  eatingQueue: [],

  // SVG 素材
  normalImg: null,
  eatingImg: null,
  imagesLoaded: false,

  mouthOpen: false,     // 张嘴状态

  init() {
    this.x = GameLoop.width / 2;
    this.y = GameLoop.height * 0.6;

    this.loadImages();
    this.changeIdleDirection();
  },

  loadImages() {
    this.normalImg = new Image();
    this.eatingImg = new Image();
    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded === 2) this.imagesLoaded = true;
    };
    this.normalImg.onload = onLoad;
    this.eatingImg.onload = onLoad;
    this.normalImg.src = 'assets/sugar_runner.svg';
    this.eatingImg.src = 'assets/sugar_runner_eating.svg';
  },

  hitTest(mx, my) {
    const cx = this.x;
    const cy = this.y - this.height / 2 + 15;
    const dx = mx - cx;
    const dy = my - cy;
    return (dx * dx) / (45 * 45) + (dy * dy) / (65 * 65) < 1;
  },

  update(dt) {
    if (this.paused) return;

    switch (this.state) {
      case 'IDLE':
        this.updateIdle(dt);
        this.checkForConfiguredBalls();
        break;
      case 'MOVING':
        this.updateMoving(dt);
        break;
      case 'EATING':
        // 由 AnimationManager 控制
        break;
    }

    // 边界约束
    this.x = Math.max(40, Math.min(GameLoop.width - 40, this.x));
    this.y = Math.max(60, Math.min(GameLoop.height - 20, this.y));
  },

  updateIdle(dt) {
    this.idleTimer += dt;
    if (this.idleTimer >= this.idleInterval) {
      this.changeIdleDirection();
    }

    // 移动
    this.x += this.idleDirection.x * this.speed * 0.3 * dt;
    this.y += this.idleDirection.y * this.speed * 0.3 * dt;

    if (this.idleDirection.x !== 0) {
      this.facingRight = this.idleDirection.x > 0;
    }

    // 偶尔跳跃
    this.jumpTimer += dt;
    if (this.jumpTimer > this.jumpCooldown && Math.random() < 0.01) {
      this.jumpTimer = 0;
      this.jumpCooldown = 2 + Math.random() * 3;
    }
  },

  changeIdleDirection() {
    this.idleTimer = 0;
    this.idleInterval = 2 + Math.random() * 2;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random();
    this.idleDirection = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed * 0.5 };
  },

  checkForConfiguredBalls() {
    if (this.eatingQueue.length === 0) return;
    const next = this.eatingQueue[0];
    this.targetBall = next;
    this.state = 'MOVING';
  },

  updateMoving(dt) {
    if (!this.targetBall || this.targetBall.eaten) {
      this.eatingQueue.shift();
      this.state = 'IDLE';
      this.checkForConfiguredBalls();
      return;
    }

    const tx = this.targetBall.x;
    const ty = this.targetBall.y;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 60) {
      // 到达，开始进食
      this.state = 'EATING';
      AnimationManager.startEating(this, this.targetBall);
      return;
    }

    // 平滑移动
    const moveX = (dx / dist) * this.speed * dt;
    const moveY = (dy / dist) * this.speed * dt;
    this.x += moveX;
    this.y += moveY;
    this.facingRight = dx > 0;
  },

  addToQueue(ball) {
    this.eatingQueue.push(ball);
  },

  onEatingDone() {
    this.eatingQueue.shift();
    this.mouthOpen = false;
    this.state = 'IDLE';
    this.checkForConfiguredBalls();
  },

  draw(ctx) {
    if (!this.imagesLoaded) {
      // 占位几何图形
      this.drawPlaceholder(ctx);
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y - 15);

    const img = (this.state === 'EATING' || this.mouthOpen) ? this.eatingImg : this.normalImg;
    const scaleX = this.facingRight ? 1 : -1;

    ctx.scale(scaleX, 1);
    ctx.drawImage(img, -this.width / 2, -this.height, this.width, this.height);

    ctx.restore();
  },

  drawPlaceholder(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // 身体
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.ellipse(0, -20, 35, 45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E55A5A';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 腿
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(-18, 15, 12, 12);
    ctx.fillRect(6, 15, 12, 12);

    // 眼睛
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-10, -25, 4, 0, Math.PI * 2);
    ctx.arc(10, -25, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  onResize() {
    // 保持在屏幕范围内
    this.x = Math.max(40, Math.min(GameLoop.width - 40, this.x));
    this.y = Math.max(60, Math.min(GameLoop.height - 20, this.y));
  }
};

window.Character = Character;
