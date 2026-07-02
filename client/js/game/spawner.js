// 豆子生成器：随机位置、颜色、补充逻辑、避开吃豆人

const Spawner = {
  minBalls: 5,
  maxBalls: 8,
  maxGoldBalls: 2,
  goldProbability: 0.2,
  spawnCooldown: 0,     // 冷却防止同一帧大量生成

  initialSpawn() {
    const balls = [];
    const count = this.minBalls + Math.floor(Math.random() * (this.maxBalls - this.minBalls + 1));
    const goldCount = Math.floor(count * this.goldProbability);

    for (let i = 0; i < count; i++) {
      const isGold = i < goldCount;
      const ball = this.createRandomBall(isGold);
      balls.push(ball);
    }

    BallManager.init(balls);
  },

  createRandomBall(isGold = false) {
    const margin = 50;
    const x = margin + Math.random() * (GameLoop.width - margin * 2);
    const y = margin + Math.random() * (GameLoop.height - margin * 2);
    const color = isGold ? GOLD_COLOR : DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)];
    return new Ball(x, y, color, isGold);
  },

  checkAndSpawn() {
    const activeCount = BallManager.getActiveCount();

    // 允许手动触发（但避开短时间内大量生成）
    if (activeCount >= this.minBalls) {
      this.spawnCooldown = 0;
      return;
    }

    this.spawnCooldown += 1;
    // 确保间隔至少 30 帧才生成一批（避免同一帧大量创建）
    if (this.spawnCooldown < 30 && activeCount > 0) return;
    this.spawnCooldown = 0;

    const need = this.maxBalls - activeCount;
    for (let i = 0; i < need; i++) {
      const isGold = Math.random() < this.goldProbability && this.getGoldCount() < this.maxGoldBalls;
      const ball = this.createRandomBallAwayFromCharacter(isGold);
      BallManager.add(ball);
    }
  },

  // 外部可调用：强制立即补充
  forceSpawn(minCount) {
    const activeCount = BallManager.getActiveCount();
    const toSpawn = Math.max(minCount - activeCount, this.minBalls - activeCount);
    for (let i = 0; i < toSpawn; i++) {
      const isGold = Math.random() < this.goldProbability && this.getGoldCount() < this.maxGoldBalls;
      BallManager.add(this.createRandomBallAwayFromCharacter(isGold));
    }
  },

  createRandomBallAwayFromCharacter(isGold = false) {
    let attempts = 0;
    let x, y;
    do {
      const margin = 50;
      x = margin + Math.random() * (GameLoop.width - margin * 2);
      y = margin + Math.random() * (GameLoop.height - margin * 2);
      attempts++;
    } while (
      attempts < 80 &&
      Math.hypot(x - Character.x, y - Character.y) < 80
    );

    const color = isGold ? GOLD_COLOR : DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)];
    return new Ball(x, y, color, isGold);
  },

  getGoldCount() {
    return BallManager.balls.filter(b => b.isGold && !b.eaten).length;
  },

  respawnOnResize() {
    BallManager.balls = BallManager.balls.filter(b => {
      return b.x >= 10 && b.x <= GameLoop.width - 10 && b.y >= 10 && b.y <= GameLoop.height - 10;
    });
    if (BallManager.getActiveCount() < this.minBalls) {
      this.forceSpawn(this.minBalls);
    }
  }
};

window.Spawner = Spawner;
