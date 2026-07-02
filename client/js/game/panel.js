const CUSTOM_ICONS = ['🍜', '🚌', '🎮', '🛒', '🏠', '📚', '💼', '🎬', '☕', '✈️', '🧸', '🎯', '💊', '🎁', '🐾', '🎵', '🍰', '🥗', '💅', '🚴'];

const Panel = {
  panelEl: null,
  currentBall: null,
  categories: [],
  selectedCategory: null,
  selectedAmount: null,
  presetAmounts: [10, 20, 50, 100, 200],
  billDate: '',
  customSectionOpen: false,

  async init() {
    this.panelEl = document.getElementById('config-panel');
  },

  async refreshCategories() {
    try {
      this.categories = await api.getCategories();
      return this.categories;
    } catch (error) {
      console.warn('failed to load categories:', error);
      this.categories = [];
      return [];
    }
  },

  get incomeCategory() {
    return this.categories.find((category) => category.name === '收入') || null;
  },

  get presetExpenseCategories() {
    return this.categories.filter((category) => category.is_preset && category.name !== '收入');
  },

  get customExpenseCategories() {
    return this.categories.filter((category) => !category.is_preset);
  },

  async open(ball, clickX, clickY) {
    this.currentBall = ball;
    this.selectedCategory = null;
    this.selectedAmount = null;
    this.customSectionOpen = false;

    const now = new Date();
    this.billDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    await this.refreshCategories();

    if (ball.isGold) {
      this.renderIncomePanel();
    } else {
      this.renderExpensePanel();
    }

    this.panelEl.style.display = 'block';
    this.panelEl.classList.remove('show');
    this.panelEl.style.left = '16px';
    this.panelEl.style.top = '16px';

    requestAnimationFrame(() => {
      const margin = 16;
      const panelWidth = this.panelEl.offsetWidth || 360;
      const panelHeight = this.panelEl.offsetHeight || 440;
      const viewportWidth = GameLoop.width || window.innerWidth;
      const viewportHeight = GameLoop.height || window.innerHeight;
      const preferredX = clickX - panelWidth / 2;
      const spaceAbove = clickY - margin;
      const spaceBelow = viewportHeight - clickY - margin;

      let px = Math.max(margin, Math.min(viewportWidth - panelWidth - margin, preferredX));
      let py;

      if (spaceAbove >= panelHeight + 24) {
        py = clickY - panelHeight - 24;
      } else if (spaceBelow >= panelHeight + 24) {
        py = clickY + 24;
      } else {
        py = Math.max(margin, Math.min(viewportHeight - panelHeight - margin, clickY - panelHeight / 2));
      }

      py = Math.max(margin, Math.min(viewportHeight - panelHeight - margin, py));

      this.panelEl.style.left = `${px}px`;
      this.panelEl.style.top = `${py}px`;
      this.panelEl.classList.add('show');
    });
  },

  close() {
    this.panelEl.style.display = 'none';
    this.panelEl.classList.remove('show');
    this.currentBall = null;
    this.selectedCategory = null;
    this.selectedAmount = null;
    this.customSectionOpen = false;
  },

  renderPanelShell(title, subtitle, innerHtml, confirmText) {
    this.panelEl.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="panel-kicker">PAC-ACCOUNT</div>
          <h3>${title}</h3>
          <p>${subtitle}</p>
        </div>
        <button type="button" class="panel-close" id="panel-close" aria-label="close">×</button>
      </div>
      ${innerHtml}
      <div class="panel-footer">
        <button class="confirm-btn" id="panel-confirm" disabled>${confirmText}</button>
      </div>
    `;

    document.getElementById('panel-close').addEventListener('click', (event) => {
      event.stopPropagation();
      this.close();
    });
  },

  renderExpensePanel() {
    const presetCategories = this.presetExpenseCategories;
    const customCategories = this.customExpenseCategories;

    const presetHtml = presetCategories.map((category) => {
      const selected = this.selectedCategory?.id === category.id ? ' selected' : '';
      return `
        <button
          type="button"
          class="category-card${selected}"
          data-role="preset-category"
          data-cat-id="${category.id}"
        >
          <span class="category-card-icon">${category.icon}</span>
          <span class="category-card-name">${category.name}</span>
        </button>
      `;
    }).join('');

    const customHtml = customCategories.map((category) => {
      const selected = this.selectedCategory?.id === category.id ? ' selected' : '';
      return `
        <button
          type="button"
          class="custom-chip${selected}"
          data-role="custom-category"
          data-cat-id="${category.id}"
        >
          <span>${category.icon}</span>
          <span>${category.name}</span>
        </button>
      `;
    }).join('');

    const amountHtml = this.presetAmounts.map((amount) => {
      const selected = this.selectedAmount === amount ? ' selected' : '';
      return `<button type="button" class="amount-btn${selected}" data-amount="${amount}">${amount}</button>`;
    }).join('');

    this.renderPanelShell(
      '记录支出',
      '选一个固定分类，或者展开自定义分类。',
      `
        <section class="panel-section">
          <div class="panel-section-title">固定分类</div>
          <div class="category-grid">${presetHtml}</div>
        </section>
        <section class="panel-section">
          <button
            type="button"
            class="custom-category-trigger${this.customSectionOpen ? ' selected' : ''}"
            id="custom-category-trigger"
            data-role="custom-category-trigger"
          >
            <span class="category-card-icon">✨</span>
            <span class="category-card-name">自定义分类</span>
          </button>
          <div class="custom-category-panel${this.customSectionOpen ? ' open' : ''}" id="custom-category-panel">
            <div class="custom-chip-list">${customHtml || '<div class="custom-empty">还没有自定义分类，下面新建一个吧。</div>'}</div>
            <div class="custom-editor">
              <input type="text" id="new-cat-name" placeholder="新分类名称" maxlength="20">
              <div class="custom-editor-row">
                <select id="new-cat-icon">
                  ${CUSTOM_ICONS.map((icon) => `<option value="${icon}">${icon}</option>`).join('')}
                </select>
                <button type="button" class="pixel-btn" id="save-cat-btn">保存</button>
              </div>
            </div>
          </div>
        </section>
        <section class="panel-section">
          <div class="panel-section-title">金额</div>
          <div class="amount-row">
            ${amountHtml}
            <input type="number" class="amount-custom" id="amount-custom" placeholder="其他" min="0.01" max="999999.99" step="0.01">
          </div>
        </section>
        <section class="panel-section">
          <div class="panel-section-title">日期</div>
          <input type="date" id="bill-date" value="${this.billDate}" class="panel-date-input">
        </section>
      `,
      '确认记账'
    );

    this.bindExpenseEvents();
  },

  renderIncomePanel() {
    const amountHtml = this.presetAmounts.map((amount) => {
      const selected = this.selectedAmount === amount ? ' selected' : '';
      return `<button type="button" class="amount-btn${selected}" data-amount="${amount}">${amount}</button>`;
    }).join('');

    this.renderPanelShell(
      '记录收入',
      '吃到金球后，给这笔收入一个金额。',
      `
        <section class="panel-section">
          <div class="panel-section-title">金额</div>
          <div class="amount-row">
            ${amountHtml}
            <input type="number" class="amount-custom" id="amount-custom" placeholder="其他" min="0.01" max="999999.99" step="0.01">
          </div>
        </section>
        <section class="panel-section">
          <div class="panel-section-title">日期</div>
          <input type="date" id="bill-date" value="${this.billDate}" class="panel-date-input">
        </section>
      `,
      '确认收入'
    );

    this.bindIncomeEvents();
  },

  bindExpenseEvents() {
    const confirmBtn = document.getElementById('panel-confirm');
    const customInput = document.getElementById('amount-custom');
    const dateInput = document.getElementById('bill-date');
    const trigger = document.getElementById('custom-category-trigger');

    dateInput.addEventListener('change', () => {
      this.billDate = dateInput.value;
    });
    dateInput.addEventListener('click', (event) => event.stopPropagation());

    this.panelEl.querySelectorAll('[data-role="preset-category"], [data-role="custom-category"]').forEach((element) => {
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        const categoryId = parseInt(element.dataset.catId, 10);
        this.selectedCategory = this.categories.find((category) => category.id === categoryId) || null;
        this.renderExpensePanel();
      });
    });

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      this.customSectionOpen = !this.customSectionOpen;
      this.renderExpensePanel();
    });

    const saveCategoryButton = document.getElementById('save-cat-btn');
    saveCategoryButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      await this.saveCustomCategory();
    });

    document.getElementById('new-cat-name').addEventListener('click', (event) => event.stopPropagation());
    document.getElementById('new-cat-icon').addEventListener('click', (event) => event.stopPropagation());

    this.bindAmountEvents(confirmBtn, customInput);

    confirmBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      await this.confirm();
    });

    this.updateConfirmState(confirmBtn);
  },

  bindIncomeEvents() {
    const confirmBtn = document.getElementById('panel-confirm');
    const customInput = document.getElementById('amount-custom');
    const dateInput = document.getElementById('bill-date');

    dateInput.addEventListener('change', () => {
      this.billDate = dateInput.value;
    });
    dateInput.addEventListener('click', (event) => event.stopPropagation());

    this.bindAmountEvents(confirmBtn, customInput);

    confirmBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      await this.confirm();
    });

    this.updateConfirmState(confirmBtn);
  },

  bindAmountEvents(confirmBtn, customInput) {
    this.panelEl.querySelectorAll('.amount-btn').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.selectedAmount = parseFloat(button.dataset.amount);
        this.panelEl.querySelectorAll('.amount-btn').forEach((item) => item.classList.remove('selected'));
        button.classList.add('selected');
        customInput.value = '';
        this.updateConfirmState(confirmBtn);
      });
    });

    customInput.addEventListener('focus', () => {
      this.selectedAmount = null;
      this.panelEl.querySelectorAll('.amount-btn').forEach((item) => item.classList.remove('selected'));
    });
    customInput.addEventListener('input', () => this.updateConfirmState(confirmBtn));
    customInput.addEventListener('click', (event) => event.stopPropagation());
  },

  async saveCustomCategory() {
    const nameInput = document.getElementById('new-cat-name');
    const iconInput = document.getElementById('new-cat-icon');
    const name = nameInput.value.trim();
    const icon = iconInput.value;

    if (!name) {
      showToast('请输入分类名称', 'error');
      return;
    }

    if (name.length > 20) {
      showToast('分类名称不能超过 20 个字', 'error');
      return;
    }

    try {
      const category = await api.createCategory({ name, icon });
      this.categories = [...this.categories, { ...category, is_preset: 0 }];
      this.selectedCategory = this.categories.find((item) => item.id === category.id) || null;
      this.customSectionOpen = true;
      showToast('已添加自定义分类', 'success');
      this.renderExpensePanel();
    } catch (error) {
      showToast(error.message || '添加分类失败', 'error');
    }
  },

  updateConfirmState(confirmBtn) {
    const amount = this.getFinalAmount(false);
    const amountValid = Boolean(amount && amount > 0 && amount <= 999999.99);

    if (this.currentBall?.isGold) {
      confirmBtn.disabled = !amountValid;
      return;
    }

    confirmBtn.disabled = !(this.selectedCategory && amountValid);
  },

  getFinalAmount(showError = true) {
    const customInput = document.getElementById('amount-custom');
    if (this.selectedAmount) return this.selectedAmount;

    if (customInput?.value) {
      const value = parseFloat(customInput.value);
      if (Number.isNaN(value) || value <= 0) return null;
      if (value > 999999.99) {
        if (showError) showToast('金额超出范围', 'error');
        return null;
      }
      return value;
    }

    return null;
  },

  getCreatedAt() {
    return this.billDate ? `${this.billDate} 12:00:00` : null;
  },

  async confirm() {
    const amount = this.getFinalAmount(true);
    if (!amount) return;

    const ball = this.currentBall;
    if (!ball) return;

    if (ball.isGold) {
      const incomeCategory = this.incomeCategory;
      if (!incomeCategory) {
        showToast('未找到收入分类', 'error');
        return;
      }
      ball.configure(amount, incomeCategory.id, incomeCategory.icon, incomeCategory.name);
      ball.type = 'income';
    } else {
      if (!this.selectedCategory) {
        showToast('请选择分类', 'error');
        return;
      }
      ball.configure(
        amount,
        this.selectedCategory.id,
        this.selectedCategory.icon,
        this.selectedCategory.name
      );
      ball.type = 'expense';
    }

    ball.billDate = this.getCreatedAt();

    try {
      await api.createBill({
        category_id: ball.categoryId,
        type: ball.type,
        amount: ball.amount,
        note: '',
        created_at: ball.billDate || null
      });
      ball.savedBill = true;
      if (ball.type === 'expense') {
        GameLoop.addExpense(ball.amount);
      }
      window.dispatchEvent(new CustomEvent('bills:changed'));
    } catch (error) {
      showToast(error.message || '记账失败，请稍后重试', 'error');
      ball.savedBill = false;
      return;
    }

    this.close();

    setTimeout(() => {
      if (!ball.eaten) {
        Character.addToQueue(ball);
      }
    }, 120);
  }
};

window.Panel = Panel;
