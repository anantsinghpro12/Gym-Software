App.boot('settings', () => {
  const root = document.getElementById('content');
  const gym = currentGymProfile() || {};
  const s = Auth.session();

  // Static shell first (so the page isn't blank while we fetch the
  // live profile). Current Password starts blank + disabled until
  // the real value comes back from Google Sheets.
  root.innerHTML = `
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>Gym Profile</h3></div>
        <p class="muted" style="margin-top:-6px">Core gym profile (name, contact, currency, date format, login email) is managed centrally by your Super Admin — this keeps every gym's identity and financial formatting consistent and prevents accidental changes. Contact your Super Admin to update these.</p>
        <div class="detail-row"><span class="detail-label">Gym Name</span><span class="detail-value" id="gp-name">${gym.name || '—'}</span></div>
        <div class="detail-row"><span class="detail-label">Owner Login Email</span><span class="detail-value" id="gp-email">${gym.ownerEmail || s.email || '—'}</span></div>
        <div class="detail-row"><span class="detail-label">Contact Phone</span><span class="detail-value" id="gp-phone">${gym.phone || '—'}</span></div>
        <div class="detail-row"><span class="detail-label">Currency</span><span class="detail-value" id="gp-currency">${gym.currency || '—'}</span></div>
        <div class="detail-row"><span class="detail-label">Date Format</span><span class="detail-value" id="gp-dateformat">${gym.dateFormat || '—'}</span></div>
        <div class="detail-row"><span class="detail-label">Account Status</span><span class="detail-value" id="gp-status">${badge(gym.status)}</span></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Change Password</h3></div>

<div class="form-group"> <label for="cp-current" style=" display:block; margin-bottom:8px; font-size:14px; font-weight:600; color:#1f2937; " > Current Password </label> <div class="pw-field" style=" position:relative; width:100%; display:flex; align-items:center; " > <input type="password" id="cp-current" disabled value="" placeholder="Loading…" style=" width:100%; height:52px; box-sizing:border-box; padding:0 64px 0 16px; border:1px solid #d1d5db; border-radius:12px; background:#f8fafc; color:#111827; font-size:15px; font-weight:500; outline:none; transition:all .2s ease; box-shadow:0 2px 8px rgba(0,0,0,.05); " /> <button type="button" class="icon-btn" id="cp-current-toggle" title="Show/hide" aria-label="Show or hide current password" style=" position:absolute; right:5px; top:5px; width:42px; height:42px; display:flex; align-items:center; justify-content:center; padding:0; border:none; border-radius:9px; background:rgba(37,99,235,.12); color:#2563eb; font-size:22px; line-height:1; cursor:pointer; opacity:.95; transition:all .2s ease; box-shadow:0 2px 6px rgba(37,99,235,.12); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); " >👁</button> </div> <p class="muted" style=" margin:6px 0 0 2px; font-size:12px; line-height:1.5; color:#6b7280; " > This is your current password on record, fetched from the server. It can't be edited here — set a new one below. </p> </div>

        <div class="form-group"><label>New Password</label><input type="password" id="cp-new" autocomplete="new-password"/></div>
        <div class="form-group"><label>Confirm New Password</label><input type="password" id="cp-confirm" autocomplete="new-password"/></div>
        <div class="auth-error" id="cp-err"></div>
        <button class="btn btn-primary" id="cp-save">Update Password</button>
      </div>
    </div>`;

  // Fetch the live profile (gym details + this user's current
  // password) straight from the sheet, then fill the UI in.
  let currentPasswordOnRecord = '';
  loadProfile();

  async function loadProfile() {
    try {
      const profile = await Api.getProfile();

      if (profile) {
        setText('gp-name', profile.gym_name || profile.name || gym.name || '—');
        setText('gp-email', profile.email || gym.ownerEmail || s.email || '—');
        setText('gp-phone', profile.phone || gym.phone || '—');
        setText('gp-currency', profile.currency || gym.currency || '—');
        setText('gp-dateformat', profile.date_format || profile.dateFormat || gym.dateFormat || '—');
        const statusEl = document.getElementById('gp-status');
        if (statusEl) statusEl.innerHTML = badge(profile.status || gym.status);

        currentPasswordOnRecord = profile.password || '';
        const curInput = document.getElementById('cp-current');
        if (curInput) {
          curInput.value = currentPasswordOnRecord;
          curInput.placeholder = '';
        }
      }
    } catch (err) {
      console.error('[Settings] Failed to load profile:', err);
      const curInput = document.getElementById('cp-current');
      if (curInput) curInput.placeholder = 'Unavailable';
      Toast.show('Could not load current password from server.', 'error');
    }
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  document.getElementById('cp-current-toggle').addEventListener('click', () => {
    const inp = document.getElementById('cp-current');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('cp-save').addEventListener('click', async () => {
    const nw = document.getElementById('cp-new').value;
    const cf = document.getElementById('cp-confirm').value;
    const errEl = document.getElementById('cp-err');
    errEl.classList.remove('show');

    if (!nw || !cf) {
      errEl.textContent = 'Please fill in both the new password and confirmation.';
      errEl.classList.add('show');
      return;
    }

    if (nw.length < 6) {
      errEl.textContent = 'New password must be at least 6 characters.';
      errEl.classList.add('show');
      return;
    }

    // Blocking popup — the user must acknowledge before they can try again.
    if (nw !== cf) {
      await Confirm.alert('Confirm password does not match the new password. Please re-enter both fields.', { title: 'Password mismatch' });
      document.getElementById('cp-confirm').value = '';
      document.getElementById('cp-confirm').focus();
      return;
    }

    const btn = document.getElementById('cp-save');
    btn.disabled = true;
    btn.textContent = 'Updating…';

    try {
      await Api.changePassword(nw);

      currentPasswordOnRecord = nw;
      const curInput = document.getElementById('cp-current');
      if (curInput) curInput.value = nw;

      document.getElementById('cp-new').value = '';
      document.getElementById('cp-confirm').value = '';
      Toast.show('Password updated', 'success');
    } catch (err) {
      errEl.textContent = err.message || 'Could not update password.';
      errEl.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Update Password';
    }
  });

  const exportBtn = document.getElementById('s-export');
  if (exportBtn) exportBtn.addEventListener('click', () => { downloadText('gymos-backup-' + gym.name + '.json', DB.exportAll()); Toast.show('Backup downloaded', 'success'); });

  const importInput = document.getElementById('s-import');
  if (importInput) importInput.addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    const ok = await Confirm.ask('This will overwrite matching records in your gym\'s data files. Continue?', { danger: true, okLabel: 'Continue Import' });
    if (!ok) { e.target.value = ''; return; }
    const text = await file.text();
    const result = await DB.importAll(text);
    Toast.show('Import complete: ' + Object.keys(result).length + ' files restored', 'success');
    e.target.value = ''; runHealth();
  });

  const resetBtn = document.getElementById('s-reset');
  if (resetBtn) resetBtn.addEventListener('click', async () => {
    const ok = await Confirm.ask('This will permanently delete all operational data for THIS gym (members, payments, etc). Your login and gym profile are kept. This cannot be undone.', { danger: true, okLabel: 'Reset This Gym' });
    if (!ok) return;
    await DB.resetAll();
    Toast.show('Gym data cleared.', 'success');
    runHealth(); App.renderBadges();
  });

  const checkBtn = document.getElementById('s-check');
  if (checkBtn) checkBtn.addEventListener('click', runHealth);
  runHealth();

  function runHealth() {
    const healthEl = document.getElementById('s-health');
    if (!healthEl) return;
    const h = DB.health();
    healthEl.innerHTML = `
      <div class="health-files">${Object.entries(h.files).map(([t, n]) => `<div class="health-row">✓ ${t}.txt <span>${n} records</span></div>`).join('')}</div>
      <div class="health-refs"><b>References:</b> ${h.refs.ok} valid links checked</div>
      ${h.refs.warn.length ? `<div class="health-warn"><b>Warnings:</b><ul>${h.refs.warn.slice(0, 10).map(w => `<li>⚠ ${w}</li>`).join('')}</ul></div>` : '<div class="health-ok">⚠ 0 warnings</div>'}
      <div class="health-errors">✗ ${h.errors} errors</div>`;
  }
});
