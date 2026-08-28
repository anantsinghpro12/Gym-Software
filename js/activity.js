App.boot('activity', () => {
  const root = document.getElementById('content');
  root.innerHTML = `<div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>User</th></tr></thead><tbody id="act-body"></tbody></table></div></div>`;
  const rows = DB.get('ACT').sort((a, b) => b.ts.localeCompare(a.ts));
  document.getElementById('act-body').innerHTML = rows.length ? rows.map(a => `<tr><td>${new Date(a.ts).toLocaleString('en-IN')}</td><td>${a.action}</td><td>${a.entity} #${a.entityId}</td><td>${a.user}</td></tr>`).join('') : `<tr><td colspan="4" class="muted">No activity recorded yet.</td></tr>`;
});
