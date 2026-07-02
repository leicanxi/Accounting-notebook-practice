function drawCharacterPattern(ctx, pattern, palette, pixelSize) {
  pattern.forEach((row, y) => {
    row.split('').forEach((cell, x) => {
      if (cell === '.') return;
      ctx.fillStyle = palette[cell] || '#ffffff';
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    });
  });
}

const Character = {
  x: 0,
  y: 0,
  radius: 32,
  state: 'IDLE',
  paused: false,
  speed: 150,
  directionAngle: 0,
  targetAngle: 0,
  mouthOpen: 0,
  mouthSpeed: 6,
  moveDir: { x: 0, y: 0 },
  idleTimer: 0,
  idleInterval: 0,
  targetBall: null,
  eatingQueue: [],
  eyeDir: { x: 0, y: 0 },

  init() {
    this.x = GameLoop.width / 2;
    this.y = GameLoop.height / 2;
    this.changeIdleDirection();
  },

  hitTest(mx, my) {
    const dx = mx - this.x;
    const dy = my - this.y;
    return (dx * dx + dy * dy) <= this.radius * this.radius * 1.5;
  },

  update(dt) {
    if (this.paused) return;

    this.mouthOpen = 0.5 + 0.5 * Math.sin(Date.now() / 150);

    let diff = this.targetAngle - this.directionAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.directionAngle += diff * Math.min(dt * 15, 1);

    switch (this.state) {
      case 'IDLE':
        this.updateIdle(dt);
        this.checkForConfiguredBalls();
        break;
      case 'MOVING':
        this.updateMoving(dt);
        break;
      default:
        break;
    }

    this.x = Math.max(this.radius, Math.min(GameLoop.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(GameLoop.height - this.radius, this.y));
  },

  updateIdle(dt) {
    this.idleTimer += dt;
    if (this.idleTimer >= this.idleInterval) {
      this.changeIdleDirection();
    }
    this.x += this.moveDir.x * this.speed * 0.3 * dt;
    this.y += this.moveDir.y * this.speed * 0.3 * dt;
  },

  changeIdleDirection() {
    this.idleTimer = 0;
    this.idleInterval = 2 + Math.random() * 2;
    const angle = Math.random() * Math.PI * 2;
    this.moveDir = { x: Math.cos(angle), y: Math.sin(angle) };
    this.targetAngle = angle;
  },

  checkForConfiguredBalls() {
    if (this.eatingQueue.length === 0) return;
    this.targetBall = this.eatingQueue[0];
    this.state = 'MOVING';
  },

  updateMoving(dt) {
    if (!this.targetBall || this.targetBall.eaten) {
      this.eatingQueue.shift();
      this.state = 'IDLE';
      this.checkForConfiguredBalls();
      return;
    }

    const dx = this.targetBall.x - this.x;
    const dy = this.targetBall.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.radius + this.targetBall.radius + 2) {
      this.state = 'EATING';
      AnimationManager.startEating(this, this.targetBall);
      return;
    }

    this.targetAngle = Math.atan2(dy, dx);

    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt;
  },

  addToQueue(ball) {
    this.eatingQueue.push(ball);
  },

  onEatingDone() {
    this.eatingQueue.shift();
    this.state = 'IDLE';
    this.checkForConfiguredBalls();
  },

  getCurrentPattern() {
    const mouthWide = this.mouthOpen > 0.7;
    if (mouthWide) {
      return [
        '..yyyyyy..',
        '.yyyyyyyy.',
        'yyyyyyyyyy',
        'yyyyyy....',
        'yyyy......',
        'yyyyyy....',
        'yyyyyyyyyy',
        '.yyyyyyyy.',
        '..yyyyyy..'
      ];
    }

    return [
      '..yyyyyy..',
      '.yyyyyyyy.',
      'yyyyyyyyyy',
      'yyyyyyyy..',
      'yyyyyy....',
      'yyyyyyyy..',
      'yyyyyyyyyy',
      '.yyyyyyyy.',
      '..yyyyyy..'
    ];
  },

  draw(ctx) {
    const pixelSize = 5;
    const pattern = this.getCurrentPattern();
    const width = pattern[0].length * pixelSize;
    const height = pattern.length * pixelSize;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.directionAngle);
    ctx.translate(-width / 2, -height / 2);

    drawCharacterPattern(
      ctx,
      pattern,
      {
        y: '#ffd93d'
      },
      pixelSize
    );

    ctx.fillStyle = '#fff4b3';
    ctx.fillRect(pixelSize * 3, pixelSize * 1, pixelSize * 2, pixelSize);
    ctx.fillRect(pixelSize * 2, pixelSize * 2, pixelSize * 2, pixelSize);

    ctx.fillStyle = '#111827';
    ctx.fillRect(pixelSize * 6, pixelSize * 2, pixelSize, pixelSize);
    ctx.fillRect(pixelSize * 7, pixelSize * 2, pixelSize, pixelSize);
    ctx.fillStyle = '#3ddcff';
    ctx.fillRect(pixelSize * 7, pixelSize * 2, pixelSize, pixelSize);

    ctx.restore();
  },

  onResize() {
    this.x = Math.max(this.radius, Math.min(GameLoop.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(GameLoop.height - this.radius, this.y));
  }
};

window.Character = Character;
