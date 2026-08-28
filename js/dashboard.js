/* ============================================================
   GYMOS DASHBOARD – with debug logs
   ============================================================ */

console.log('[DASHBOARD] script loaded');

App.boot('dashboard', async () => {

  console.log('[DASHBOARD] App.boot afterInit started');

  const root = document.getElementById('content');
  console.log('[DASHBOARD] #content element:', root);

  if (!root) {
    console.error('[DASHBOARD] #content not found – shell did not create it');
    return;
  }

  root.innerHTML = `
    <div style="padding:40px;text-align:center">
      <div class="loading-spinner" style="width:36px;height:36px;border:4px solid #ddd;border-top-color:#2563eb;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px"></div>
      <p>Loading dashboard...</p>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;

  try {
    console.log('[DASHBOARD] reading DB...');

    const members    = DB.get('M')   || [];
    const plans      = DB.get('P')   || [];
    const payments   = DB.get('PAY') || [];
    const attendance = DB.get('AT')  || [];
    const trainers   = DB.get('T')   || [];
    const classes    = DB.get('CL')  || [];
    const products   = DB.get('PR')  || [];

    console.log('[DASHBOARD] data counts:', {
      members: members.length,
      plans: plans.length,
      payments: payments.length,
      attendance: attendance.length,
      trainers: trainers.length,
      classes: classes.length
    });

    const activeMembers   = members.filter(m => String(m.status||'').toUpperCase() === 'A').length;
    const expiredMembers  = members.filter(m => String(m.status||'').toUpperCase() === 'E').length;
    const activePlans     = plans.filter(p => String(p.status||'A').toUpperCase() === 'A').length;
    const todayRevenue    = calcRevenue(payments, 'today');
    const monthRevenue    = calcRevenue(payments, 'month');
    const todayCheckins   = attendance.filter(a => isToday(a.date) && String(a.type||'').toUpperCase() === 'IN').length;
    const expiring        = getExpiring(members);
    const pendingPayments = payments.filter(p => String(p.status||'').toUpperCase() !== 'PD').length;
    const activeClasses   = classes.filter(c => String(c.status||'A').toUpperCase() === 'A').length;
    const lowStock        = products.filter(p => Number(p.stock||0) <= Number(p.minStock||0)).length;

    console.log('[DASHBOARD] rendering HTML...');

    root.innerHTML = `
      <div class="kpi-grid">
        ${kpi('👥','MEMBERS', activeMembers, 'Active')}
        ${kpi('💳','PLANS', activePlans, 'Active Plans')}
        ${kpi('📚','CLASSES', activeClasses, 'Active Classes')}
        ${kpi('💰','REVENUE', money(monthRevenue), 'This Month')}
        ${kpi('📅','TODAY', todayCheckins, 'Check-ins')}
      </div>

      <div class="kpi-grid kpi-grid-sm">
        ${status('🔴','EXPIRED', expiredMembers, 'Members', 'red')}
        ${status('🟠','EXPIRING', expiring.length, 'Next 7 Days', 'orange')}
        ${status('⚠','PENDING', pendingPayments, 'Payments', 'orange')}
        ${status('📦','LOW STOCK', lowStock, 'Items', 'orange')}
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h3>Plan Distribution</h3></div>
          <div id="plan-donut">${planDist(plans, members)}</div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <h3>Revenue</h3>
            <div class="chip-group" id="rev-range">
              <button class="chip" data-days="7">7 Days</button>
              <button class="chip active" data-days="30">30 Days</button>
              <button class="chip" data-days="180">6 Months</button>
              <button class="chip" data-days="365">1 Year</button>
            </div>
          </div>
          <div id="revenue-chart"></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h3>Attendance — Last 7 Days</h3></div>
          <div id="attendance-chart"></div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Business Summary</h3></div>
          <div class="flow">
            ${flow('TOTAL MEMBERS', members.length)}
            <div class="flow-arrow">↓</div>
            ${flow('ACTIVE MEMBERS', activeMembers)}
            <div class="flow-arrow">↓</div>
            ${flow('ACTIVE PLANS', activePlans)}
            <div class="flow-arrow">↓</div>
            ${flow('MONTH REVENUE', money(monthRevenue))}
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Quick Actions</h3></div>
        <div class="quick-actions">
          <a class="btn btn-outline" href="members.html">+ Add Member</a>
          <a class="btn btn-outline" href="plans.html">+ Create Plan</a>
          <a class="btn btn-outline" href="payments.html">+ Record Payment</a>
          <a class="btn btn-outline" href="classes.html">+ Add Class</a>
          <a class="btn btn-outline" href="trainers.html">+ Add Trainer</a>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h3>Today's Priorities</h3></div>
          <div id="priorities">${priorities(expiring, pendingPayments, lowStock)}</div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <h3>Recent Payments</h3>
            <a class="link-sm" href="payments.html">View All</a>
          </div>
          <div>${recentPayments(payments)}</div>
        </div>
      </div>
    `;

    console.log('[DASHBOARD] HTML rendered successfully');

    document.querySelectorAll('#rev-range .chip').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#rev-range .chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        drawRevenue(payments, Number(btn.dataset.days));
      });
    });

    drawRevenue(payments, 30);
    drawAttendance(attendance);

    console.log('[DASHBOARD] charts drawn');

  } catch (err) {
    console.error('[DASHBOARD] RENDER ERROR:', err);
    root.innerHTML = `
      <div class="panel" style="margin:20px">
        <h3 style="color:#c00">Dashboard Error</h3>
        <p><b>${err.message || err}</b></p>
        <pre style="background:#f5f5f5;padding:12px;overflow:auto;font-size:12px">${err.stack || ''}</pre>
        <button class="btn btn-primary" onclick="location.reload()">Retry</button>
      </div>
    `;
  }


  /* ========== HELPERS ========== */

  function kpi(icon, label, value, sub) {
    return `<div class="kpi-card">
      <div class="kpi-icon">${icon}</div>
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-sub">${sub}</div>
    </div>`;
  }

  function status(icon, label, value, sub, color) {
    return `<div class="status-card status-${color}">
      <div class="status-icon">${icon}</div>
      <div class="status-value">${value}</div>
      <div class="status-label">${label}</div>
      <div class="status-sub">${sub}</div>
    </div>`;
  }

  function flow(label, value) {
    return `<div class="flow-step">
      <div class="flow-label">${label}</div>
      <div class="flow-value">${value}</div>
    </div>`;
  }

  function money(v) {
    return typeof fmtMoney === 'function' ? fmtMoney(v) : '₹' + Number(v||0).toLocaleString('en-IN');
  }

  function isToday(d) {
    return d && String(d).slice(0,10) === new Date().toISOString().slice(0,10);
  }

  function calcRevenue(payments, mode) {
    const now = new Date();
    const key = mode === 'today' ? now.toISOString().slice(0,10) : now.toISOString().slice(0,7);
    return payments
      .filter(p => String(p.status||'').toUpperCase() === 'PD' &&
                   String(p.date||'').slice(0, mode==='today'?10:7) === key)
      .reduce((s,p) => s + Number(p.amount||0), 0);
  }

  function getExpiring(members) {
    const t = new Date(); t.setHours(0,0,0,0);
    const n = new Date(t); n.setDate(n.getDate()+7);
    return members.filter(m => {
      if (String(m.status||'').toUpperCase() !== 'A' || !m.end) return false;
      const e = new Date(m.end); e.setHours(0,0,0,0);
      return e >= t && e <= n;
    });
  }

  function planDist(plans, members) {
    const active = plans.filter(p => String(p.status||'A') === 'A');
    if (!active.length) return '<p class="muted">No active plans.</p>';
    return active.map(p => {
      const c = members.filter(m => String(m.planId) === String(p.id)).length;
      return `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee">
        <span>${p.name||'—'}</span><strong>${c}</strong></div>`;
    }).join('');
  }

  function priorities(expiring, pending, stock) {
    const items = [];
    if (expiring.length) items.push(`<a class="priority-row" href="renewals.html">🟠 ${expiring.length} memberships expire in 7 days</a>`);
    if (pending) items.push(`<a class="priority-row" href="payments.html">💳 ${pending} pending payments</a>`);
    if (stock) items.push(`<a class="priority-row" href="inventory.html">📦 ${stock} low stock items</a>`);
    return items.length ? items.join('') + '<a class="link-sm" href="renewals.html">View All</a>'
                        : '<p class="muted">✓ All caught up — nothing urgent.</p>';
  }

  function recentPayments(payments) {
    if (!payments.length) return '<p class="muted">No payments yet.</p>';
    return [...payments]
      .sort((a,b) => new Date(b.date||0) - new Date(a.date||0))
      .slice(0,6)
      .map(p => `<div class="activity-row">
        💰 ${DB.memberName(p.memberId)||'Payment'}
        <strong>${money(p.amount)}</strong>
        <span class="activity-time">${String(p.date||'').slice(0,10)}</span>
      </div>`).join('');
  }

  function drawRevenue(payments, days) {
    const el = document.getElementById('revenue-chart');
    if (!el) return;
    const labels = [], series = [];
    const bucket = days <= 30 ? 1 : days <= 180 ? 7 : 30;
    const points = Math.max(1, Math.ceil(days / bucket));

    for (let i = points-1; i >= 0; i--) {
      const end = new Date(); end.setDate(end.getDate() - i*bucket);
      const start = new Date(end); start.setDate(start.getDate() - bucket);
      const total = payments
        .filter(p => {
          if (String(p.status||'').toUpperCase() !== 'PD') return false;
          const d = new Date(p.date);
          return !isNaN(d) && d > start && d <= end;
        })
        .reduce((s,p) => s + Number(p.amount||0), 0);
      series.push(total);
      labels.push(end.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}));
    }

    if (typeof Charts !== 'undefined' && Charts.line) Charts.line(el, series, labels);
    else el.innerHTML = `<div class="muted">Total: ${money(series.reduce((a,b)=>a+b,0))}</div>`;
  }

  function drawAttendance(attendance) {
    const el = document.getElementById('attendance-chart');
    if (!el) return;
    const labels = [], series = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i);
      const ds = d.toISOString().slice(0,10);
      series.push(attendance.filter(a => String(a.date||'').slice(0,10)===ds && String(a.type||'').toUpperCase()==='IN').length);
      labels.push(d.toLocaleDateString('en-IN',{weekday:'short'}));
    }
    if (typeof Charts !== 'undefined' && Charts.bars) Charts.bars(el, series, labels);
    else el.innerHTML = `<div class="muted">${series.join(' • ')}</div>`;
  }

});