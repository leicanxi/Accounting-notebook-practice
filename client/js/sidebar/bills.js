const SidebarBills = {
  periodMode: 'today',

  formatLocalDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  async render(container) {
    container.innerHTML = `<div class="loading">加载中...</div>`;

    container.innerHTML = `
      <div class="timeline-controls">
        <button class="${this.periodMode === 'today' ? 'active' : ''}" data-period="today">今日</button>
        <button class="${this.periodMode === 'week' ? 'active' : ''}" data-period="week">本周</button>
        <button class="${this.periodMode === 'month' ? 'active' : ''}" data-period="month">本月</button>
      </div>
      <div id="bills-list"></div>
    `;

    container.querySelectorAll('[data-period]').forEach((button) => {
      button.addEventListener('click', () => {
        this.periodMode = button.dataset.period;
        this.render(container);
      });
    });

    await this.loadBills(container.querySelector('#bills-list'));
  },

  async loadBills(listEl) {
    try {
      const params = {};
      const now = new Date();

      if (this.periodMode === 'today') {
        params.date = this.formatLocalDate(now);
      } else if (this.periodMode === 'month') {
        params.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      } else if (this.periodMode === 'week') {
        const weekNum = this.getWeekNumber(now);
        params.week = `${now.getFullYear()}-W${weekNum}`;
      }

      params.page_size = 100;
      const result = await api.getBills(params);
      this.renderBills(listEl, result.bills || []);
    } catch (error) {
      listEl.innerHTML = `<div class="empty-state"><p>加载失败: ${error.message}</p></div>`;
    }
  },

  getWeekNumber(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date - start;
    const oneWeek = 604800000;
    return Math.ceil((diff / oneWeek + start.getDay() + 1) / 7);
  },

  renderBills(listEl, bills) {
    if (!bills.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🟡</div>
          <p>还没有账单记录，去游戏里吃一个小球吧。</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = bills.map((bill) => {
      const time = bill.created_at ? bill.created_at.slice(11, 16) : '';
      const isIncome = bill.type === 'income';
      return `
        <div class="bill-item" data-id="${bill.id}">
          <div class="bill-icon">${bill.category_icon || '🧾'}</div>
          <div class="bill-info">
            <div class="bill-category">${bill.category_name || ''}</div>
            <div class="bill-time">${time}</div>
          </div>
          <div class="bill-amount ${isIncome ? 'income' : 'expense'}">${isIncome ? '+' : '-'}${bill.amount.toFixed(2)}</div>
          <div class="bill-actions">
            <button class="bill-action-btn edit-btn" data-id="${bill.id}">编辑</button>
            <button class="bill-action-btn delete-btn" data-id="${bill.id}">删除</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.edit-btn').forEach((button) => {
      button.addEventListener('click', () => this.editBill(parseInt(button.dataset.id, 10)));
    });

    listEl.querySelectorAll('.delete-btn').forEach((button) => {
      button.addEventListener('click', () => this.deleteBill(parseInt(button.dataset.id, 10)));
    });
  },

  async editBill(id) {
    try {
      const result = await api.getBills({ page_size: 200 });
      const bill = (result.bills || []).find((item) => item.id === id);
      if (!bill) return;

      const categories = await api.getCategories();
      const modal = document.getElementById('edit-modal');
      const content = modal.querySelector('.modal-content');
      const options = categories
        .map((category) => `<option value="${category.id}" ${category.id === bill.category_id ? 'selected' : ''}>${category.icon} ${category.name}</option>`)
        .join('');

      content.innerHTML = `
        <h3>编辑账单</h3>
        <label>类型</label>
        <select id="edit-type">
          <option value="expense" ${bill.type === 'expense' ? 'selected' : ''}>支出</option>
          <option value="income" ${bill.type === 'income' ? 'selected' : ''}>收入</option>
        </select>
        <label>分类</label>
        <select id="edit-category">${options}</select>
        <label>金额</label>
        <input type="number" id="edit-amount" value="${bill.amount}" min="0.01" max="999999.99" step="0.01">
        <div class="modal-actions">
          <button class="modal-btn-cancel" id="modal-cancel">取消</button>
          <button class="modal-btn-save" id="modal-save">保存</button>
        </div>
      `;

      modal.classList.add('show');

      document.getElementById('modal-cancel').addEventListener('click', () => {
        modal.classList.remove('show');
      });

      document.getElementById('modal-save').addEventListener('click', async () => {
        const type = document.getElementById('edit-type').value;
        const categoryId = parseInt(document.getElementById('edit-category').value, 10);
        const amount = parseFloat(document.getElementById('edit-amount').value);

        if (Number.isNaN(amount) || amount <= 0) {
          showToast('金额无效', 'error');
          return;
        }

        try {
          await api.updateBill(id, { type, category_id: categoryId, amount });
          window.dispatchEvent(new CustomEvent('bills:changed'));
          showToast('更新成功', 'success');
          modal.classList.remove('show');
          Sidebar.renderCurrentTab();
        } catch (error) {
          showToast(error.message, 'error');
        }
      });
    } catch (error) {
      showToast(error.message, 'error');
    }
  },

  async deleteBill(id) {
    const confirmed = await showConfirmDialog('确定删除这笔账单吗？');
    if (!confirmed) return;

    try {
      await api.deleteBill(id);
      window.dispatchEvent(new CustomEvent('bills:changed'));
      showToast('删除成功', 'success');
      Sidebar.renderCurrentTab();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
};

window.SidebarBills = SidebarBills;
