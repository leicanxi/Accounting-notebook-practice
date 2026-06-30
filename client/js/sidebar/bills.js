// 账单列表：今日/本周/本月 API 请求 + 列表渲染

const SidebarBills = {
  periodMode: 'today', // today | week | month

  async render(container) {
    container.innerHTML = `<div class="loading">加载中...</div>`;

    // 周期选择器
    const periodHtml = `
      <div class="timeline-controls">
        <button class="${this.periodMode === 'today' ? 'active' : ''}" data-period="today">今日</button>
        <button class="${this.periodMode === 'week' ? 'active' : ''}" data-period="week">本周</button>
        <button class="${this.periodMode === 'month' ? 'active' : ''}" data-period="month">本月</button>
      </div>
      <div id="bills-list"></div>
    `;

    container.innerHTML = periodHtml;

    // 绑定周期切换
    container.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.periodMode = btn.dataset.period;
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
        params.date = now.toISOString().slice(0, 10);
      } else if (this.periodMode === 'month') {
        params.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      } else if (this.periodMode === 'week') {
        const weekNum = this.getWeekNumber(now);
        params.week = `${now.getFullYear()}-W${weekNum}`;
      }

      params.page_size = 100;
      const result = await api.getBills(params);
      this.renderBills(listEl, result.bills || []);
    } catch (e) {
      listEl.innerHTML = `<div class="empty-state"><p>加载失败: ${e.message}</p></div>`;
    }
  },

  getWeekNumber(d) {
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = d - start;
    const oneWeek = 604800000;
    return Math.ceil((diff / oneWeek + start.getDay() + 1) / 7);
  },

  renderBills(listEl, bills) {
    if (bills.length === 0) {
      listEl.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🍬</div>
        <p>还没有账单记录，去游戏中吃点小球吧！</p>
      </div>`;
      return;
    }

    const html = bills.map(bill => {
      const time = bill.created_at ? bill.created_at.slice(11, 16) : '';
      const isIncome = bill.type === 'income';
      const amountClass = isIncome ? 'income' : 'expense';
      const amountPrefix = isIncome ? '+' : '-';
      return `
        <div class="bill-item" data-id="${bill.id}">
          <div class="bill-icon">${bill.category_icon || '📦'}</div>
          <div class="bill-info">
            <div class="bill-category">${bill.category_name || ''}</div>
            <div class="bill-time">${time}</div>
          </div>
          <div class="bill-amount ${amountClass}">${amountPrefix}${bill.amount.toFixed(2)}</div>
          <div class="bill-actions">
            <button class="bill-action-btn edit-btn" data-id="${bill.id}">编辑</button>
            <button class="bill-action-btn delete-btn" data-id="${bill.id}">删除</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.innerHTML = html;

    // 绑定编辑/删除事件
    listEl.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => this.editBill(parseInt(btn.dataset.id)));
    });
    listEl.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteBill(parseInt(btn.dataset.id)));
    });
  },

  async editBill(id) {
    try {
      const result = await api.getBills({ page_size: 200 });
      const bill = (result.bills || []).find(b => b.id === id);
      if (!bill) return;

      const [cats] = await Promise.all([api.getCategories()]);

      const modal = document.getElementById('edit-modal');
      const content = modal.querySelector('.modal-content');
      const catOptions = cats.map(c => `<option value="${c.id}" ${c.id === bill.category_id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('');

      content.innerHTML = `
        <h3>编辑账单</h3>
        <label>类型</label>
        <select id="edit-type">
          <option value="expense" ${bill.type === 'expense' ? 'selected' : ''}>支出</option>
          <option value="income" ${bill.type === 'income' ? 'selected' : ''}>收入</option>
        </select>
        <label>分类</label>
        <select id="edit-category">${catOptions}</select>
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
        const categoryId = parseInt(document.getElementById('edit-category').value);
        const amount = parseFloat(document.getElementById('edit-amount').value);
        if (isNaN(amount) || amount <= 0) { showToast('金额无效', 'error'); return; }
        try {
          await api.updateBill(id, { type, category_id: categoryId, amount });
          showToast('更新成功', 'success');
          modal.classList.remove('show');
          Sidebar.renderCurrentTab();
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async deleteBill(id) {
    const result = await showConfirmDialog('确定删除这笔账单吗？');
    if (!result) return;
    try {
      await api.deleteBill(id);
      showToast('删除成功', 'success');
      Sidebar.renderCurrentTab();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};

window.SidebarBills = SidebarBills;
