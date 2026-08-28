App.boot('reports', () => {
  const root = document.getElementById('content');
  root.innerHTML = `<div class="report-tabs" id="rtabs">
      ${['Members', 'Finance', 'Attendance', 'Inventory'].map((t, i) => `<button class="chip ${i === 0 ? 'active' : ''}" data-tab="${t}">${t}</button>`).join('')}
    </div><div id="report-body"></div>`;
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('active')); b.classList.add('active'); render(b.dataset.tab); }));
  render('Members');

  function statRow(items) { return `<div class="kpi-grid">${items.map(([l, v]) => `<div class="kpi-card"><div class="kpi-label">${l}</div><div class="kpi-value">${v}</div></div>`).join('')}</div>`; }

  function render(tab) {
    const body = document.getElementById('report-body');
    if (tab === 'Members') {
      const total = DB.count('M'), active = DB.count('M', m => m.status === 'A'), expired = DB.count('M', m => m.status === 'E'), frozen = DB.count('M', m => m.status === 'F');
      const newThisMonth = DB.count('M', m => m.joined && m.joined.slice(0, 7) === new Date().toISOString().slice(0, 7));
      const churn = total ? Math.round(expired / total * 100) : 0;
      body.innerHTML = statRow([['Total', total], ['Active', active], ['New (Month)', newThisMonth], ['Expired', expired], ['Frozen', frozen], ['Churn %', churn + '%']]);
    } else if (tab === 'Finance') {
      const revenue = DB.filter('PAY', p => p.status === 'PD').reduce((s, p) => s + Number(p.amount), 0);
      const pending = DB.filter('PAY', p => p.status !== 'PD').reduce((s, p) => s + Number(p.amount), 0);
      const expenses = DB.get('EXP').reduce((s, e) => s + Number(e.amount), 0);
      const profit = revenue - expenses;
      body.innerHTML = statRow([['Revenue', fmtMoney(revenue)], ['Pending', fmtMoney(pending)], ['Expenses', fmtMoney(expenses)], ['Profit (est.)', fmtMoney(profit)]]) +
        `<div class="panel"><div class="panel-head"><h3>Payment Method Breakdown</h3></div><div id="pm-donut"></div></div>`;
      const methods = ['CA', 'UP', 'CD', 'BT', 'OT'];
      Charts.donut(document.getElementById('pm-donut'), methods.map(m => ({ label: STATUS_LABEL[m] || m, value: DB.filter('PAY', p => p.method === m).length })).filter(d => d.value));
    } else if (tab === 'Attendance') {
      const t = new Date().toISOString().slice(0, 10);
      const week = DB.count('AT', a => daysBetween(a.date, t) <= 7 && a.type === 'IN');
      const month = DB.count('AT', a => a.date.slice(0, 7) === t.slice(0, 7) && a.type === 'IN');
      const peak = peakHour();
      body.innerHTML = statRow([['Today', DB.count('AT', a => a.date === t && a.type === 'IN')], ['This Week', week], ['This Month', month], ['Peak Hour', peak]]);
    } else if (tab === 'Inventory') {
      const totalStock = DB.get('PR').reduce((s, p) => s + Number(p.stock), 0);
      const low = DB.count('PR', p => Number(p.stock) <= Number(p.minStock));
      body.innerHTML = statRow([['Total Stock Units', totalStock], ['Low Stock Items', low]]);
    }
  }
  function peakHour() {
    const counts = {};
    DB.get('AT').forEach(a => { const h = a.time.split(':')[0]; counts[h] = (counts[h] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries.length ? entries[0][0] + ':00' : '—';
  }
});
