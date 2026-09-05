/**
 * Canteen Queue AI - Main Application Controller
 * Handles Navigation, View Rendering, Authentication Modals,
 * Persona Switcher, Toast Notifications, and Cross-Tab Reactivity.
 */

class ToastManager {
  constructor() {
    this.container = document.getElementById('toastContainer');
  }

  show(message, type = 'info', duration = 3500) {
    if (!this.container) return;

    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-600 text-white border-emerald-400',
      warning: 'bg-amber-600 text-white border-amber-400',
      danger: 'bg-rose-600 text-white border-rose-400',
      info: 'bg-slate-800 text-slate-100 border-slate-600'
    };

    const icons = {
      success: '✓',
      warning: '⚠️',
      danger: '🚨',
      info: 'ℹ️'
    };

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border ${colors[type] || colors.info} transform transition-all duration-300 translate-y-4 opacity-0 pointer-events-auto max-w-sm text-xs font-semibold backdrop-blur-md`;
    toast.innerHTML = `
      <span class="text-base leading-none">${icons[type] || 'ℹ️'}</span>
      <span class="flex-1">${message}</span>
      <button class="opacity-70 hover:opacity-100 text-sm ml-2 font-bold" onclick="this.parentElement.remove()">&times;</button>
    `;

    this.container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
    });

    // Auto dismiss
    setTimeout(() => {
      toast.classList.add('translate-y-4', 'opacity-0');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }
}

class App {
  constructor() {
    this.currentView = 'home'; // 'home', 'student', 'staff', 'ai-analytics'
    this.toast = new ToastManager();
    window.appToast = this.toast;
  }

  init() {
    window.studentCtrl = new window.StudentController(window.canteenStore, window.canteenAI);
    window.staffCtrl = new window.StaffController(window.canteenStore, window.canteenAI);

    this.setupNavigation();
    this.setupAuthModals();
    this.renderActiveUserUI();
    this.renderHomeOverview();

    // Subscribe to store updates (updates both local changes and remote tab changes)
    window.canteenStore.subscribe((state, source) => {
      this.handleStateChange(state, source);
    });

    // Handle view query param if any
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam && ['home', 'student', 'staff', 'ai-analytics'].includes(viewParam)) {
      this.switchView(viewParam);
    } else {
      this.switchView('home');
    }
  }

  setupNavigation() {
    // Nav link triggers
    document.querySelectorAll('[data-view-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetView = e.currentTarget.dataset.viewTarget;
        this.switchView(targetView);
      });
    });

    // Cart Drawer Toggle
    const cartToggle = document.getElementById('btnToggleCart');
    const cartDrawer = document.getElementById('cartDrawer');
    const closeCart = document.getElementById('btnCloseCart');

    if (cartToggle && cartDrawer) {
      cartToggle.addEventListener('click', () => {
        cartDrawer.classList.toggle('translate-x-full');
      });
    }

    if (closeCart && cartDrawer) {
      closeCart.addEventListener('click', () => {
        cartDrawer.classList.add('translate-x-full');
      });
    }
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Toggle view containers
    const views = ['home', 'student', 'staff', 'ai-analytics'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) {
        if (v === viewName) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });

    // Update active nav button styles
    document.querySelectorAll('[data-view-target]').forEach(btn => {
      if (btn.dataset.viewTarget === viewName) {
        btn.classList.add('text-orange-400', 'bg-slate-800/80', 'border-orange-500/30');
        btn.classList.remove('text-slate-400', 'hover:text-slate-200');
      } else {
        btn.classList.remove('text-orange-400', 'bg-slate-800/80', 'border-orange-500/30');
        btn.classList.add('text-slate-400', 'hover:text-slate-200');
      }
    });

    // View-specific initializations
    if (viewName === 'home') {
      this.renderHomeOverview();
    } else if (viewName === 'student') {
      window.studentCtrl.init();
    } else if (viewName === 'staff') {
      window.staffCtrl.init();
    } else if (viewName === 'ai-analytics') {
      this.renderAiAnalyticsView();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderHomeOverview() {
    const state = window.canteenStore.getState();
    const waitMin = window.canteenStore.getEstimatedWaitTimeMinutes();
    const status = window.canteenStore.getQueueStatus();
    const aiRecommendation = window.canteenAI.getBestTimeToOrderRecommendation();
    const busyInfo = window.canteenAI.getBusyPeriodAnalysis();

    // Metric 1: Current Queue
    const qEl = document.getElementById('homeCurrentQueue');
    if (qEl) qEl.textContent = state.currentQueue;

    // Metric 2: Estimated Wait Time
    const wEl = document.getElementById('homeEstimatedWait');
    if (wEl) wEl.textContent = `${waitMin} min`;

    // Metric 3: Average Service Time
    const sEl = document.getElementById('homeAvgServiceTime');
    if (sEl) sEl.textContent = `${state.averageServiceTimeSeconds} sec/student`;

    // Metric 4: Queue Status Badge
    const statusEl = document.getElementById('homeQueueStatusBadge');
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${status.bg}">
          <span class="w-2.5 h-2.5 rounded-full ${status.color === 'rose' ? 'bg-rose-500 status-ping' : status.color === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'}"></span>
          <span>${status.icon} ${status.label}</span>
        </div>
      `;
    }

    // AI Best Time to Order Card
    const aiRecBox = document.getElementById('homeAiRecommendationBox');
    if (aiRecBox) {
      aiRecBox.innerHTML = `
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-2xl flex-shrink-0">
            🤖
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                ${aiRecommendation.badge}
              </span>
              <span class="text-xs text-slate-400 font-medium">• Campus Peak Forecast</span>
            </div>
            <h4 class="text-lg font-bold text-white mt-1.5">${aiRecommendation.headline}</h4>
            <p class="text-xs text-slate-300 mt-1">${aiRecommendation.timeSaved}</p>
            <div class="mt-3 flex flex-wrap items-center gap-3">
              <span class="text-xs font-semibold text-orange-300">
                ⚡ Suggested Slot: <strong class="text-white">${aiRecommendation.bestWindow}</strong>
              </span>
              <span class="text-slate-600">|</span>
              <span class="text-xs font-semibold text-rose-300">
                🔥 Peak Alert: <strong class="text-white">Peak expected at ${busyInfo.peakHour}</strong> (~${busyInfo.peakLength} students)
              </span>
            </div>
          </div>
        </div>
      `;
    }
  }

  renderAiAnalyticsView() {
    window.canteenAI.renderQueueChart('analyticsViewChartCanvas');

    const busy = window.canteenAI.getBusyPeriodAnalysis();
    const bestOrder = window.canteenAI.getBestTimeToOrderRecommendation();

    const peakHourEl = document.getElementById('analyticsPeakHour');
    const peakWaitEl = document.getElementById('analyticsPeakWait');
    const quietWindowEl = document.getElementById('analyticsQuietWindow');
    const bestWindowEl = document.getElementById('analyticsBestSlot');

    if (peakHourEl) peakHourEl.textContent = `${busy.peakHour} (Lunch Surge)`;
    if (peakWaitEl) peakWaitEl.textContent = `~${busy.peakWaitTimeMin} mins wait`;
    if (quietWindowEl) quietWindowEl.textContent = busy.quietestWindow;
    if (bestWindowEl) bestWindowEl.textContent = bestOrder.bestWindow;
  }

  setupAuthModals() {
    const studentModal = document.getElementById('studentLoginModal');
    const staffModal = document.getElementById('staffLoginModal');

    // Open Student Login
    document.querySelectorAll('[data-open-student-login]').forEach(btn => {
      btn.addEventListener('click', () => {
        studentModal.classList.remove('hidden');
      });
    });

    // Open Staff Login
    document.querySelectorAll('[data-open-staff-login]').forEach(btn => {
      btn.addEventListener('click', () => {
        staffModal.classList.remove('hidden');
      });
    });

    // Close Modals
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        studentModal.classList.add('hidden');
        staffModal.classList.add('hidden');
      });
    });

    // Quick Login Preset 1: Student Alex
    const btnQuickStudentAlex = document.getElementById('btnPresetStudentAlex');
    if (btnQuickStudentAlex) {
      btnQuickStudentAlex.addEventListener('click', () => {
        window.canteenStore.setRole('student', {
          name: 'Alex Carter',
          id: 'ST-CS2104',
          department: 'Computer Science'
        });
        studentModal.classList.add('hidden');
        this.renderActiveUserUI();
        this.switchView('student');
        this.toast.show('Logged in as Alex Carter (Student)', 'success');
      });
    }

    // Quick Login Preset 2: Student Priya
    const btnQuickStudentPriya = document.getElementById('btnPresetStudentPriya');
    if (btnQuickStudentPriya) {
      btnQuickStudentPriya.addEventListener('click', () => {
        window.canteenStore.setRole('student', {
          name: 'Priya Sharma',
          id: 'ST-EC1092',
          department: 'Electronics Eng.'
        });
        studentModal.classList.add('hidden');
        this.renderActiveUserUI();
        this.switchView('student');
        this.toast.show('Logged in as Priya Sharma (Student)', 'success');
      });
    }

    // Quick Login Preset 3: Staff Chef Ramirez
    const btnQuickStaffChef = document.getElementById('btnPresetStaffChef');
    if (btnQuickStaffChef) {
      btnQuickStaffChef.addEventListener('click', () => {
        window.canteenStore.setRole('staff', {
          name: 'Chef Ramirez',
          id: 'EMP-409',
          department: 'Kitchen Operations',
          counterAssigned: 'Counter #1 (Express Meals)'
        });
        staffModal.classList.add('hidden');
        this.renderActiveUserUI();
        this.switchView('staff');
        this.toast.show('Logged in as Chef Ramirez (Staff Counter #1)', 'success');
      });
    }

    // Quick Login Preset 4: Staff Manager Sarah
    const btnQuickStaffSarah = document.getElementById('btnPresetStaffSarah');
    if (btnQuickStaffSarah) {
      btnQuickStaffSarah.addEventListener('click', () => {
        window.canteenStore.setRole('staff', {
          name: 'Manager Sarah',
          id: 'EMP-102',
          department: 'Canteen Administration',
          counterAssigned: 'Supervisor Console'
        });
        staffModal.classList.add('hidden');
        this.renderActiveUserUI();
        this.switchView('staff');
        this.toast.show('Logged in as Manager Sarah (Staff)', 'success');
      });
    }
  }

  renderActiveUserUI() {
    const user = window.canteenStore.getState().currentUser;
    const badgeEl = document.getElementById('currentUserBadge');
    if (!badgeEl) return;

    if (user.role === 'staff') {
      badgeEl.innerHTML = `
        <span class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs font-bold">
          <span>👨‍🍳</span>
          <span>${user.name}</span>
          <span class="text-[10px] text-slate-400 font-normal">(${user.counterAssigned})</span>
        </span>
      `;
    } else {
      badgeEl.innerHTML = `
        <span class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 text-xs font-bold">
          <span>🎓</span>
          <span>${user.name}</span>
          <span class="text-[10px] text-slate-400 font-normal">(${user.id})</span>
        </span>
      `;
    }
  }

  handleStateChange(state, source) {
    // If incoming change from another browser tab, show subtle notification
    if (source === 'remote') {
      this.toast.show('🔄 Queue data synchronized across tabs', 'info', 2000);
    }

    this.renderActiveUserUI();

    if (this.currentView === 'home') {
      this.renderHomeOverview();
    } else if (this.currentView === 'student') {
      window.studentCtrl.renderCart();
      window.studentCtrl.renderActiveTicket();
    } else if (this.currentView === 'staff') {
      window.staffCtrl.renderDashboard();
    } else if (this.currentView === 'ai-analytics') {
      this.renderAiAnalyticsView();
    }
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.canteenApp = new App();
  window.canteenApp.init();
});
