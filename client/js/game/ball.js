const DOT_COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#74c0fc', '#da77f2'];
const GOLD_COLOR = '#ffd93d';

function drawPixelBlock(ctx, px, py, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(px * size, py * size, size, size);
}

function drawPattern(ctx, pattern, palette, pixelSize) {
  pattern.forEach((row, y) => {
    row.split('').forEach((cell, x) => {
      if (cell === '.') return;
      drawPixelBlock(ctx, x, y, pixelSize, palette[cell] || '#ffffff');
    });
  });
}

class Ball {
  constructor(x, y, color, isGold = false) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.configuredRadius = 16;
    this.color = color;
    this.isGold = isGold;
    this.configured = false;
    this.amount = 0;
    this.categoryId = null;
    this.categoryIcon = '';
    this.categoryName = '';
    this.type = isGold ? 'income' : 'expense';
    this.eaten = false;
    this.savedBill = false;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.eatTimer = 0;
    this.eatDuration = 0.15;
    this.flashIntensity = 0;
  }

  configure(amount, categoryId, categoryIcon, categoryName) {
    this.amount = amount;
    this.categoryId = categoryId;
    this.categoryIcon = categoryIcon;
    this.configured = true;
    if (!this.isGold) {
      this.categoryName = categoryName;
    }
  }

  hitTest(mx, my) {
    if (this.eaten) return false;
    const dx = mx - this.x;
    const dy = my - this.y;
    const r = (this.configured ? this.configuredRadius : this.radius) + 5;
    return (dx * dx + dy * dy) <= (r * r);
  }

  update(dt) {
    if (this.eaten) return;
    this.pulsePhase += dt * 4;
  }

  startEatAnim() {
    this.eatTimer = 0;
    this.flashIntensity = 1;
  }

  updateEatAnim(dt) {
    this.eatTimer += dt;
    if (this.eatTimer >= this.eatDuration) {
      this.eaten = true;
      return true;
    }
    this.flashIntensity = 1 - this.eatTimer / this.eatDuration;
    return false;
  }

  drawGlow(ctx, size) {
    if (!this.flashIntensity && !this.isGold) return;
    const glowRadius = size * (this.isGold ? 1.1 : 0.85) + this.flashIntensity * 8;
    const glow = ctx.createRadialGradient(0, 0, size * 0.3, 0, 0, glowRadius);
    glow.addColorStop(0, this.isGold ? 'rgba(255,240,140,0.75)' : this.getGlowColor());
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawDot(ctx, size) {
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.08;
    const pixelSize = Math.max(2, Math.round((size * pulse) / 5));
    const half = (5 * pixelSize) / 2;
    ctx.save();
    ctx.translate(-half, -half);
    drawPattern(
      ctx,
      [
        '..a..',
        '.aaa.',
        'aaaaa',
        '.aaa.',
        '..a..'
      ],
      { a: this.getConfiguredColor() },
      pixelSize
    );
    ctx.restore();
  }

  drawPowerPellet(ctx, size) {
    const pulse = 1 + Math.sin(this.pulsePhase * 1.5) * 0.12;
    const pixelSize = Math.max(2, Math.round((size * pulse) / 6));
    const half = (6 * pixelSize) / 2;
    ctx.save();
    ctx.translate(-half, -half);
    drawPattern(
      ctx,
      [
        '..yy..',
        '.yyyy.',
        'yywwyy',
        'yywwyy',
        '.yyyy.',
        '..yy..'
      ],
      { y: GOLD_COLOR, w: '#fff7bf' },
      pixelSize
    );
    ctx.restore();
  }

  drawAmountTag(ctx, size) {
    if (!this.configured) return;
    const text = this.isGold ? `+${this.amount}` : `${this.amount}`;
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const width = ctx.measureText(text).width + 14;
    const tagY = size + 12;

    ctx.fillStyle = 'rgba(4, 8, 28, 0.88)';
    ctx.strokeStyle = this.isGold ? '#ffd93d' : '#3ddcff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-width / 2, tagY - 11, width, 22, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.isGold ? '#fff1a8' : '#eef4ff';
    ctx.fillText(text, 0, tagY);
  }

  draw(ctx) {
    if (this.eaten) return;

    const size = this.configured ? this.configuredRadius : this.radius;
    ctx.save();
    ctx.translate(this.x, this.y);
    this.drawGlow(ctx, size);

    if (this.isGold) {
      this.drawPowerPellet(ctx, size);
    } else {
      this.drawDot(ctx, size);
    }

    this.drawAmountTag(ctx, size);
    ctx.restore();
  }

  getConfiguredColor() {
    if (!this.configured || this.isGold) return this.color;
    const hex = this.color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const factor = 0.78;
    return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
  }

  getGlowColor() {
    if (this.isGold) return 'rgba(255,217,61,0.65)';
    const hex = this.color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},0.55)`;
  }
}

const BallManager = {
  balls: [],

  init(ballDataList) {
    this.balls = ballDataList;
  },

  add(ball) {
    this.balls.push(ball);
  },

  getActiveCount() {
    return this.balls.filter((ball) => !ball.eaten).length;
  },

  getConfigured() {
    return this.balls.filter((ball) => ball.configured && !ball.eaten);
  },

  onClick(x, y) {
    for (let i = this.balls.length - 1; i >= 0; i -= 1) {
      const ball = this.balls[i];
      if (ball.hitTest(x, y) && !ball.configured && !ball.eaten) {
        Panel.open(ball, x, y);
        return;
      }
    }
  },

  updateAll(dt) {
    this.balls.forEach((ball) => ball.update(dt));
    this.balls = this.balls.filter((ball) => !ball.eaten);
  },

  drawAll(ctx) {
    this.balls.forEach((ball) => ball.draw(ctx));
  }
};

window.Ball = Ball;
window.BallManager = BallManager;
