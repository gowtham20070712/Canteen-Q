/**
 * Canteen Queue AI - Staff Kitchen Operations Dashboard
 * Handles Live Kanban Pipeline (Pending, Preparing, Ready, Completed),
 * Real-time queue graph, AI congestion surge alerts, and calling next ticket.
 */

class StaffController {
  constructor(store, aiEngine) {
    this.store = store;
    this.ai = aiEngine;
  }

  init() {
    this.renderDashboard();
    this.setupListeners();
  }

  setupListeners() {
    const btnCallNext = document.getElementById('btnStaffCallNext');
    if (btnCallNext) {
      btnCallNext.addEventListener('click', () => {
        this.store.callNextOrder();
        this.ai.playChime('alert');
        window.appToast && window.appToast.show('📢 Next ticket called to prep counter!', 'info');
        this.renderDashboard();
      });
    }

    const btnSimulateSurge = document.getElementById('btnSimulateSurge');
    if (btnSimulateSurge) {
      btnSimulateSurge.addEventListener('click', () => {
        // Surge +5 students
        this.store.getState().currentQueue += 5;
        this.store.saveState();
        this.ai.playChime('alert');
        window.appToast && window.appToast.show('⚠️ Rush Surge: +5 students joined the canteen line!', 'warning');
        this.renderDashboard();
      });
    }

    const btnResetDemo = document.getElementById('btnResetStoreData');
    if (btnResetDemo) {
      btnResetDemo.addEventListener('click', () => {
        if (confirm('Reset prototype queue data back to original demo state (18 students, 12 min wait)?')) {
          this.store.resetToDefaultDemo();
          window.appToast && window.appToast.show('Demo state restored to 18 students & 12 min wait.', 'info');
          this.renderDashboard();
        }
      });
    }
  }

  renderDashboard() {
    this.renderStats();
    this.renderAlertBanner();
    this.renderKanbanColumns();
    this.ai.renderQueueChart('staffQueueChartCanvas');
  }

  renderStats() {
    const state = this.store.getState();
    const waitMin = this.store.getEstimatedWaitTimeMinutes();
    const status = this.store.getQueueStatus();

    const elQueue = document.getElementById('staffStatCurrentQueue');
    const elWait = document.getElementById('staffStatWaitTime');
    const elSpeed = document.getElementById('staffStatAvgServiceTime');
    const elStatus = document.getElementById('staffStatStatusBadge');

    if (elQueue) elQueue.textContent = state.currentQueue;
    if (elWait) elWait.textContent = `${waitMin} min`;
    if (elSpeed) elSpeed.textContent = `${state.averageServiceTimeSeconds} sec/student`;
    if (elStatus) {
      elStatus.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.bg}">
          <span class="w-2 h-2 rounded-full ${status.color === 'rose' ? 'bg-rose-500 status-ping' : status.color === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'}"></span>
          ${status.icon} ${status.label.toUpperCase()}
        </span>
      `;
    }

    // Counts for kanban columns
    const pendingCount = state.orders.filter(o => o.status === 'pending').length;
    const prepCount = state.orders.filter(o => o.status === 'preparing').length;
    const readyCount = state.orders.filter(o => o.status === 'ready').length;
    const doneCount = state.orders.filter(o => o.status === 'completed').length;

    const countPendingEl = document.getElementById('countColPending');
    const countPrepEl = document.getElementById('countColPreparing');
    const countReadyEl = document.getElementById('countColReady');
    const countDoneEl = document.getElementById('countColCompleted');

    if (countPendingEl) countPendingEl.textContent = pendingCount;
    if (countPrepEl) countPrepEl.textContent = prepCount;
    if (countReadyEl) countReadyEl.textContent = readyCount;
    if (countDoneEl) countDoneEl.textContent = doneCount;
  }

  renderAlertBanner() {
    const container = document.getElementById('staffAiAlertBox');
    if (!container) return;

    const alertInfo = this.ai.checkStaffAlertThresholds();
    const busyInfo = this.ai.getBusyPeriodAnalysis();

    container.innerHTML = `
      <div class="p-4 rounded-2xl border ${
        alertInfo.type === 'danger'
          ? 'bg-rose-950/40 border-rose-500/40 text-rose-200 glow-red'
          : alertInfo.type === 'warning'
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
      } flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all">
        <div class="flex items-start gap-3">
          <div class="p-2.5 rounded-xl ${alertInfo.type === 'danger' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'} text-2xl leading-none">
            ${alertInfo.type === 'danger' ? '🚨' : '⚡'}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-black uppercase tracking-wider ${alertInfo.type === 'danger' ? 'text-rose-400' : 'text-amber-400'}">${alertInfo.level}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 font-bold text-slate-300">
                AI Prediction: “Peak expected at ${busyInfo.peakHour} (~${busyInfo.peakLength} students)”
              </span>
            </div>
            <p class="text-sm font-semibold text-slate-100 mt-1">${alertInfo.message}</p>
            <p class="text-xs text-slate-300 mt-0.5">${alertInfo.action}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button onclick="window.staffCtrl.handleQuickDispatch()" class="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow transition">
            <span>⚡ Express Dispatch</span>
          </button>
        </div>
      </div>
    `;
  }

  handleQuickDispatch() {
    this.store.callNextOrder();
    this.renderDashboard();
    window.appToast && window.appToast.show('Dispatched earliest order to kitchen prep!', 'success');
  }

  renderKanbanColumns() {
    const state = this.store.getState();

    const pendingOrders = state.orders.filter(o => o.status === 'pending');
    const prepOrders = state.orders.filter(o => o.status === 'preparing');
    const readyOrders = state.orders.filter(o => o.status === 'ready');
    const completedOrders = state.orders.filter(o => o.status === 'completed');

    this.renderColumnList('kanbanListPending', pendingOrders, 'pending');
    this.renderColumnList('kanbanListPreparing', prepOrders, 'preparing');
    this.renderColumnList('kanbanListReady', readyOrders, 'ready');
    this.renderColumnList('kanbanListCompleted', completedOrders, 'completed');
  }

  renderColumnList(elementId, orders, columnType) {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (orders.length === 0) {
      el.innerHTML = `
        <div class="h-40 flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
          <span class="text-2xl mb-1">${columnType === 'ready' ? '✅' : '📭'}</span>
          No orders in this stage
        </div>
      `;
      return;
    }

    el.innerHTML = orders.map(order => `
      <div class="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition shadow-sm space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-black px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30">
            ${order.ticketNumber}
          </span>
          <span class="text-[11px] font-mono text-slate-400">
            ${order.orderedAt}
          </span>
        </div>

        <div class="text-xs">
          <div class="font-bold text-slate-200 flex items-center justify-between">
            <span>${order.studentName}</span>
            <span class="text-orange-400 font-bold">$${order.total.toFixed(2)}</span>
          </div>
          <div class="mt-1 space-y-0.5 text-slate-300">
            ${order.items.map(i => `
              <div class="text-[11px] text-slate-400 flex items-center justify-between">
                <span>• ${i.qty}x ${i.name}</span>
              </div>
            `).join('')}
          </div>
          ${order.notes ? `<p class="text-[10px] italic text-amber-300/80 mt-1">Note: "${order.notes}"</p>` : ''}
        </div>

        <div class="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-1.5">
          ${this.getActionButtonsForOrder(order, columnType)}
        </div>
      </div>
    `).join('');
  }

  getActionButtonsForOrder(order, columnType) {
    if (columnType === 'pending') {
      return `
        <span class="text-[10px] text-slate-400">Queue #${order.queuePosition || 1}</span>
        <button onclick="window.staffCtrl.advanceOrder('${order.id}', 'preparing')" class="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white border border-amber-500/40 rounded-lg text-[11px] font-bold transition">
          🍳 Start Prep
        </button>
      `;
    } else if (columnType === 'preparing') {
      return `
        <button onclick="window.staffCtrl.advanceOrder('${order.id}', 'pending')" class="text-[10px] text-slate-400 hover:text-slate-200">
          ↩ Back
        </button>
        <button onclick="window.staffCtrl.advanceOrder('${order.id}', 'ready')" class="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold transition shadow-sm">
          🔔 Mark Ready
        </button>
      `;
    } else if (columnType === 'ready') {
      return `
        <span class="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 status-ping"></span> At Counter
        </span>
        <button onclick="window.staffCtrl.advanceOrder('${order.id}', 'completed')" class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg text-[11px] font-bold transition">
          ✓ Complete
        </button>
      `;
    } else {
      return `
        <span class="text-[10px] text-slate-500">Collected & Cleared</span>
      `;
    }
  }

  advanceOrder(orderId, nextStatus) {
    this.store.updateOrderStatus(orderId, nextStatus);
    if (nextStatus === 'ready') {
      this.ai.playChime('success');
      window.appToast && window.appToast.show(`Ticket ${orderId} marked Ready for Pickup! Student notified.`, 'success');
    } else if (nextStatus === 'completed') {
      window.appToast && window.appToast.show(`Order completed and handed over.`, 'info');
    }
    this.renderDashboard();
  }
}

window.StaffController = StaffController;
