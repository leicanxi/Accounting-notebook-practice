// 配置面板：分类选择、金额选择(快捷+自定义)、确认

const Panel = {
  panelEl: null,
  currentBall: null,
  categories: [],
  selectedCategory: null,
  selectedAmount: null,
  presetAmounts: [10, 20, 50, 100, 200],

  async init() {
    this.panelEl = document.getElementById('config-panel');

    // 点击面板外部关闭（由 loop.js 全局 click 处理）

    try {
      const cats = await api.getCategories();
      this.categories = cats;
    } catch (e) {
      console.warn('加载分类失败:', e);
    }
  },

  async refreshCategories() {
    try {
      const cats = await api.getCategories();
      this.categories = cats;
    } catch (e) { /* ignore */ }
  },

  open(ball, clickX, clickY) {
    this.currentBall = ball;
    this.selectedCategory = null;
    this.selectedAmount = null;

    if (ball.isGold) {
      this.renderIncomePanel();
    } else {
      this.renderExpensePanel();
    }

    // 定位面板
    const panelWidth = this.panelEl.offsetWidth;
    const panelHeight = this.panelEl.offsetHeight;
    let px = clickX - panelWidth / 2;
    let py = clickY - panelHeight - 20;

    // 边界修正
    px = Math.max(10, Math.min(GameLoop.width - panelWidth - 10, px));
    if (py < 10) py = clickY + 30;

    this.panelEl.style.left = px + 'px';
    this.panelEl.style.top = py + 'px';
    this.panelEl.style.display = 'block';
  },

  close() {
    this.panelEl.style.display = 'none';
    this.currentBall = null;
    this.selectedCategory = null;
    this.selectedAmount = null;
  },

  renderExpensePanel() {
    const catIcons = this.categories
      .map(cat => {
        const sel = this.selectedCategory && this.selectedCategory.id === cat.id ? ' selected' : '';
        return `<div class="category-icon${sel}" data-cat-id="${cat.id}" title="${cat.name}">${cat.icon}</div>`;
      }).join('');

    const amountBtns = this.presetAmounts
      .map(a => {
        const sel = this.selectedAmount === a ? ' selected' : '';
        return `<button class="amount-btn${sel}" data-amount="${a}">${a}</button>`;
      }).join('');

    this.panelEl.innerHTML = `
      <div class="category-row">${catIcons}</div>
      <div class="amount-row">
        ${amountBtns}
        <input type="number" class="amount-custom" id="amount-custom" placeholder="其他" min="0.01" max="999999.99" step="0.01">
      </div>
      <button class="confirm-btn" id="panel-confirm" disabled>确认记录</button>
    `;

    this.bindExpenseEvents();
  },

  renderIncomePanel() {
    const amountBtns = this.presetAmounts
      .map(a => {
        const sel = this.selectedAmount === a ? ' selected' : '';
        return `<button class="amount-btn${sel}" data-amount="${a}">${a}</button>`;
      }).join('');

    this.panelEl.innerHTML = `
      <div class="amount-row">
        ${amountBtns}
        <input type="number" class="amount-custom" id="amount-custom" placeholder="其他" min="0.01" max="999999.99" step="0.01">
      </div>
      <button class="confirm-btn" id="panel-confirm" disabled>确认收入</button>
    `;

    this.bindIncomeEvents();
  },

  bindExpenseEvents() {
    const confirmBtn = document.getElementById('panel-confirm');
    const customInput = document.getElementById('amount-custom');

    // 分类选择
    this.panelEl.querySelectorAll('.category-icon').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedCategory = this.categories.find(c => c.id === parseInt(el.dataset.catId));
        this.panelEl.querySelectorAll('.category-icon').forEach(icon => icon.classList.remove('selected'));
        el.classList.add('selected');
        this.updateConfirmState(confirmBtn);
      });
    });

    // 快捷金额选择
    this.panelEl.querySelectorAll('.amount-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedAmount = parseFloat(btn.dataset.amount);
        this.panelEl.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (customInput) customInput.value = '';
        this.updateConfirmState(confirmBtn);
      });
    });

    // 自定义金额
    customInput.addEventListener('focus', () => {
      this.selectedAmount = null;
      this.panelEl.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
    });
    customInput.addEventListener('input', () => {
      this.updateConfirmState(confirmBtn);
    });
    customInput.addEventListener('click', (e) => e.stopPropagation());

    // 确认按钮
    confirmBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.confirm();
    });
  },

  bindIncomeEvents() {
    const confirmBtn = document.getElementById('panel-confirm');
    const customInput = document.getElementById('amount-custom');

    // 快捷金额选择
    this.panelEl.querySelectorAll('.amount-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedAmount = parseFloat(btn.dataset.amount);
        this.panelEl.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        if (customInput) customInput.value = '';
        this.updateConfirmState(confirmBtn);
      });
    });

    customInput.addEventListener('focus', () => {
      this.selectedAmount = null;
      this.panelEl.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
    });
    customInput.addEventListener('input', () => {
      this.updateConfirmState(confirmBtn);
    });
    customInput.addEventListener('click', (e) => e.stopPropagation());

    confirmBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.confirm();
    });
  },

  updateConfirmState(confirmBtn) {
    const customInput = document.getElementById('amount-custom');
    let amount = this.selectedAmount;
    if (!amount && customInput && customInput.value) {
      amount = parseFloat(customInput.value);
    }
    const amountValid = amount && amount > 0 && amount <= 999999.99;

    if (this.currentBall && this.currentBall.isGold) {
      confirmBtn.disabled = !amountValid;
    } else {
      confirmBtn.disabled = !(this.selectedCategory && amountValid);
    }
  },

  getFinalAmount() {
    const customInput = document.getElementById('amount-custom');
    if (this.selectedAmount) return this.selectedAmount;
    if (customInput && customInput.value) {
      const val = parseFloat(customInput.value);
      if (isNaN(val) || val <= 0) return null;
      if (val > 999999.99) { showToast('金额超出范围', 'error'); return null; }
      return val;
    }
    return null;
  },

  async confirm() {
    const amount = this.getFinalAmount();
    if (!amount) return;

    const ball = this.currentBall;
    if (!ball) return;

    if (ball.isGold) {
      // 金色小球：自动使用收入分类
      const incomeCat = this.categories.find(c => c.name === '收入');
      if (!incomeCat) { showToast('未找到收入分类', 'error'); return; }
      ball.configure(amount, incomeCat.id, incomeCat.icon, incomeCat.name);
      ball.type = 'income';
    } else {
      if (!this.selectedCategory) return;
      ball.configure(amount, this.selectedCategory.id, this.selectedCategory.icon, this.selectedCategory.name);
      ball.type = 'expense';
    }

    this.close();

    // 加入糖豆人进食队列（前 2 秒延迟后开始走向）
    setTimeout(() => {
      if (!ball.eaten) {
        Character.addToQueue(ball);
      }
    }, 500);
  }
};

window.Panel = Panel;
