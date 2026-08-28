App.boot('invoices', () => {
  const root = document.getElementById('content');
  root.innerHTML = `<div class="toolbar"><div class="toolbar-left"><input class="search-input" id="inv-search" placeholder="Search invoices…"/></div></div><div id="inv-list"></div>`;
  render();
  document.getElementById('inv-search').addEventListener('input', debounce(render, 200));

  function render() {
    const q = document.getElementById('inv-search').value;
    const rows = DB.search('INV', q, ['id']).sort((a, b) => b.date.localeCompare(a.date));
    document.getElementById('inv-list').innerHTML = rows.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Invoice</th><th>Member</th><th>Total</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>#${r.id}</td><td>${DB.memberName(r.memberId)}</td><td>${fmtMoney(r.total)}</td><td>${fmtDate(r.date)}</td><td>${badge(r.status)}</td><td><button class="btn btn-sm" data-view="${r.id}">View</button></td></tr>`).join('')}
      </tbody></table></div>` : `<div class="empty-state"><div class="empty-icon">🧾</div><h3>No invoices yet</h3><p>Invoices are created automatically when a payment is recorded.</p></div>`;
    document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => openInvoice(b.dataset.view)));
  }
  function openInvoice(id) {
    const inv = DB.find('INV', id);
    const html = `<div class="invoice-doc">
      <div class="invoice-head"><div>🏋️ GYMOS</div><div>Invoice #${inv.id}</div></div>
      <p><b>${DB.memberName(inv.memberId)}</b></p>
      <div class="invoice-row"><span>Subtotal</span><span>${fmtMoney(inv.subtotal)}</span></div>
      <div class="invoice-row"><span>Discount</span><span>-${fmtMoney(inv.discount)}</span></div>
      <div class="invoice-row"><span>Tax</span><span>${fmtMoney(inv.tax)}</span></div>
      <div class="invoice-row invoice-total"><span>TOTAL</span><span>${fmtMoney(inv.total)}</span></div>
      <div>${badge(inv.status)}</div>
      <div class="form-actions"><button class="btn btn-ghost" data-close-modal>Close</button><button class="btn btn-primary" id="inv-print">Print</button></div>
    </div>`;
    const ov = Modal.open(html, { title: 'Invoice' });
    ov.querySelector('#inv-print').addEventListener('click', () => window.print());
  }
});
