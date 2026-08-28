/* ============================================================
   ENGINE — one generic renderer that drives every module page.
   ============================================================ */
/* Google Sheets returns date cells as full ISO datetimes
   (e.g. 2026-08-04T00:00:00.000Z) or real Date objects once
   JSON round-trips them. An <input type="date"> only accepts
   a bare YYYY-MM-DD — anything else is silently rejected and
   renders BLANK, even though the record has the value (which
   is why "View" showed it fine but "Edit" looked empty). */
function toDateInputValue(v) {
  if (!v) return '';
  if (v instanceof Date) return isNaN(v) ? '' : v.toISOString().slice(0, 10);
  const s = String(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  return isNaN(d) ? '' : d.toISOString().slice(0, 10);
}

const Engine = {
  state: {},

  mount(key) {
    const cfg = MODULES[key];
    const root = document.getElementById('content');
    Engine.state[key] = {
      page: 1,
      perPage: 12,
      query: '',
      filters: {},
      sort: cfg.sorts ? cfg.sorts[0][0] : 'id',
      selected: new Set(),
      view: cfg.view
    };
    root.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <input type="text" class="search-input" id="eng-search" placeholder="Search ${cfg.title.toLowerCase()}…"/>
          ${(cfg.filters || []).map(f =>
            `<select class="filter-select" data-filter="${f.key}">
              <option value="">${f.label}</option>
              ${Engine.opts(f.options)}
            </select>`
          ).join('')}
          ${cfg.sorts
            ? `<select class="filter-select" id="eng-sort">
                ${cfg.sorts.map(([k, l]) => `<option value="${k}">Sort: ${l}</option>`).join('')}
              </select>`
            : ''}
          <button class="btn btn-ghost" id="eng-reset">Reset</button>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-ghost" id="eng-export">⬇ Export</button>
          <button class="btn btn-primary" id="eng-add">+ Add ${cfg.title.replace(/s$/, '')}</button>
        </div>
      </div>
      <div class="bulk-bar" id="bulk-bar" hidden>
        <span id="bulk-count"></span>
        <div class="bulk-actions" id="bulk-actions"></div>
      </div>
      <div id="eng-list"></div>
      <div class="pagination" id="eng-pagination"></div>
    `;

    document.getElementById('eng-search').addEventListener('input', debounce(e => {
      Engine.state[key].query = e.target.value;
      Engine.state[key].page = 1;
      Engine.render(key);
    }, 200));

    root.querySelectorAll('[data-filter]').forEach(sel => {
      sel.addEventListener('change', () => {
        Engine.state[key].filters[sel.dataset.filter] = sel.value;
        Engine.state[key].page = 1;
        Engine.render(key);
      });
    });

    const sortSel = document.getElementById('eng-sort');
    if (sortSel) {
      sortSel.addEventListener('change', () => {
        Engine.state[key].sort = sortSel.value;
        Engine.render(key);
      });
    }

    document.getElementById('eng-reset').addEventListener('click', () => Engine.mount(key));
    document.getElementById('eng-add').addEventListener('click', () => Engine.openForm(key));
    document.getElementById('eng-export').addEventListener('click', () => Engine.exportCsv(key));

    Engine.render(key);
  },

  opts(options) {
    const o = typeof options === 'function' ? options() : (options || []);
    return o.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  },

  dataset(key) {
    const cfg = MODULES[key];
    const st = Engine.state[key];
    let rows = DB.search(cfg.type, st.query, cfg.searchFields);

    Object.entries(st.filters).forEach(([k, v]) => {
      if (v) rows = rows.filter(r => String(r[k]) === String(v));
    });

    if (st.sort) {
      rows.sort((a, b) =>
        String(a[st.sort] || '').localeCompare(String(b[st.sort] || ''), undefined, { numeric: true })
      );
    }
    return rows;
  },

  render(key) {
    const cfg = MODULES[key];
    const st = Engine.state[key];
    const rows = Engine.dataset(key);
    const listEl = document.getElementById('eng-list');

    if (!rows.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${cfg.icon}</div>
          <h3>No ${cfg.title.toLowerCase()} found</h3>
          <p>Try adjusting your search or filters, or add a new record.</p>
          <button class="btn btn-primary" id="empty-add">+ Add ${cfg.title.replace(/s$/, '')}</button>
        </div>`;
      document.getElementById('empty-add').addEventListener('click', () => Engine.openForm(key));
      document.getElementById('eng-pagination').innerHTML = '';
      return;
    }

    if (st.view === 'kanban') return Engine.renderKanban(key, rows);
    if (st.view === 'table') return Engine.renderTable(key, rows);
    return Engine.renderCards(key, rows);
  },

  renderCards(key, rows) {
    const cfg = MODULES[key];
    const st = Engine.state[key];
    const pageRows = paginate(rows, st.page, st.perPage);

    document.getElementById('eng-list').innerHTML = `
      <div class="card-grid">
        ${pageRows.map(r => `
          <div class="rec-card" data-id="${r.id}">
            <div class="rec-card-top">
              <label class="chk">
                <input type="checkbox" class="rec-select" data-id="${r.id}" ${st.selected.has(r.id) ? 'checked' : ''}>
              </label>
              ${badge(r.status)}
            </div>
            <div class="rec-card-title">${cfg.title_ ? cfg.title_(r) : (r[cfg.labelField] || r.id)}</div>
            <div class="rec-card-sub">${cfg.subtitle ? cfg.subtitle(r) : ''}</div>
            ${cfg.extraLine ? `<div class="rec-card-extra">${cfg.extraLine(r)}</div>` : ''}
            <div class="rec-card-id">#${r.id}</div>
            <div class="rec-card-actions">
              <button class="btn btn-sm" data-view="${r.id}">View</button>
              <button class="btn btn-sm" data-edit="${r.id}">Edit</button>
              <button class="btn btn-sm btn-ghost" data-del="${r.id}">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>`;

    Engine.wireRows(key);
    Engine.renderPagination(key, rows.length);
  },

  renderTable(key, rows) {
    const cfg = MODULES[key];
    const st = Engine.state[key];
    const pageRows = paginate(rows, st.page, st.perPage);

    document.getElementById('eng-list').innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th><input type="checkbox" id="select-all"></th>
              ${cfg.columns.map(c => `<th>${c[1]}</th>`).join('')}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${pageRows.map(r => `
              <tr data-id="${r.id}">
                <td>
                  <input type="checkbox" class="rec-select" data-id="${r.id}" ${st.selected.has(r.id) ? 'checked' : ''}>
                </td>
                ${cfg.columns.map(c =>
                  `<td>${c[2] ? c[2](r[c[0]]) : (r[c[0]] ?? '')}</td>`
                ).join('')}
                <td class="row-actions">
                  <button class="btn btn-sm" data-view="${r.id}">View</button>
                  <button class="btn btn-sm" data-edit="${r.id}">Edit</button>
                  <button class="btn btn-sm btn-ghost" data-del="${r.id}">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;

    document.getElementById('select-all').addEventListener('change', e => {
      pageRows.forEach(r => e.target.checked ? st.selected.add(r.id) : st.selected.delete(r.id));
      Engine.render(key);
    });

    Engine.wireRows(key);
    Engine.renderPagination(key, rows.length);
  },

  renderKanban(key, rows) {
    const cfg = MODULES[key];
    const cols = cfg.kanbanCols;

    document.getElementById('eng-list').innerHTML = `
      <div class="kanban-board">
        ${cols.map(col => {
          const items = rows.filter(r => r[cfg.kanbanField] === col);
          return `
            <div class="kanban-col" data-col="${col}">
              <div class="kanban-col-head">${col} <span>${items.length}</span></div>
              <div class="kanban-col-body" data-dropzone="${col}">
                ${items.map(r => `
                  <div class="kanban-card" draggable="true" data-id="${r.id}">
                    <div class="kanban-card-title">${r[cfg.labelField]}</div>
                    <div class="kanban-card-sub">${cfg.subtitle ? cfg.subtitle(r) : ''}</div>
                    <div class="kanban-card-actions">
                      <button class="btn btn-sm" data-view="${r.id}">View</button>
                      <button class="btn btn-sm" data-edit="${r.id}">Edit</button>
                      ${r.phone
                        ? `<a class="btn btn-sm btn-ghost" target="_blank"
                             href="https://wa.me/${r.phone}?text=Hi ${encodeURIComponent(r.name || '')}, following up from GYMOS!">
                             WhatsApp
                           </a>`
                        : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`;

    document.getElementById('eng-pagination').innerHTML = '';
    Engine.wireRows(key);
    Engine.wireDrag(key);
  },

  wireDrag(key) {
    const cfg = MODULES[key];
    let dragId = null;

    document.querySelectorAll('.kanban-card').forEach(c => {
      c.addEventListener('dragstart', () => { dragId = c.dataset.id; });
    });

    document.querySelectorAll('[data-dropzone]').forEach(zone => {
      zone.addEventListener('dragover', e => e.preventDefault());
      zone.addEventListener('drop', async () => {
        if (!dragId) return;
        await DB.update(cfg.type, dragId, { [cfg.kanbanField]: zone.dataset.dropzone });
        Toast.show('Stage updated', 'success');
        try { await DB.reload(cfg.type); } catch (e) {}
        Engine.render(key);
      });
    });
  },

  wireRows(key) {
    const cfg = MODULES[key];
    const st = Engine.state[key];

    document.querySelectorAll('.rec-select').forEach(cb => {
      cb.addEventListener('change', () => {
        cb.checked ? st.selected.add(cb.dataset.id) : st.selected.delete(cb.dataset.id);
        Engine.updateBulkBar(key);
      });
    });

    document.querySelectorAll('[data-view]').forEach(b => {
      b.addEventListener('click', () => Engine.openDetail(key, b.dataset.view));
    });
    document.querySelectorAll('[data-edit]').forEach(b => {
      b.addEventListener('click', () => Engine.openForm(key, b.dataset.edit));
    });
    document.querySelectorAll('[data-del]').forEach(b => {
      b.addEventListener('click', () => Engine.remove(key, b.dataset.del));
    });

    Engine.updateBulkBar(key);
  },

  updateBulkBar(key) {
    const cfg = MODULES[key];
    const st = Engine.state[key];
    const bar = document.getElementById('bulk-bar');

    if (!st.selected.size) {
      bar.hidden = true;
      return;
    }

    bar.hidden = false;
    document.getElementById('bulk-count').textContent = `${st.selected.size} selected`;
    document.getElementById('bulk-actions').innerHTML =
      (cfg.bulkActions || []).map(a => {
        const [kind, val, label] = a.split(':');
        return `<button class="btn btn-sm btn-ghost" data-bulk="${a}">${label || val}</button>`;
      }).join('') +
      `<button class="btn btn-sm" id="bulk-clear">Clear</button>`;

    document.getElementById('bulk-clear').addEventListener('click', () => {
      st.selected.clear();
      Engine.render(key);
    });

    document.querySelectorAll('[data-bulk]').forEach(b => {
      b.addEventListener('click', () => Engine.bulk(key, b.dataset.bulk));
    });
  },

  async bulk(key, action) {
    const cfg = MODULES[key];
    const st = Engine.state[key];
    const [kind, val] = action.split(':');

    if (kind === 'export') {
      Engine.exportCsv(key, [...st.selected]);
      return;
    }

    if (kind === 'status') {
      const ok = await Confirm.ask(
        `Apply status "${STATUS_LABEL[val] || val}" to ${st.selected.size} record(s)?`
      );
      if (!ok) return;

      await Promise.all([...st.selected].map(id => DB.update(cfg.type, id, { status: val })));
      Toast.show('Bulk update applied', 'success');

      try { await DB.reload(cfg.type); } catch (e) {}
      st.selected.clear();
      Engine.render(key);
      App.renderBadges();
    }
  },

  renderPagination(key, total) {
    const st = Engine.state[key];
    const pages = Math.max(1, Math.ceil(total / st.perPage));

    if (pages <= 1) {
      document.getElementById('eng-pagination').innerHTML = '';
      return;
    }

    document.getElementById('eng-pagination').innerHTML = `
      <button class="btn btn-sm" id="pg-prev" ${st.page === 1 ? 'disabled' : ''}>‹ Prev</button>
      <span class="pg-info">Page ${st.page} of ${pages} · ${total} records</span>
      <button class="btn btn-sm" id="pg-next" ${st.page === pages ? 'disabled' : ''}>Next ›</button>
    `;

    const prev = document.getElementById('pg-prev');
    const next = document.getElementById('pg-next');
    if (prev) prev.addEventListener('click', () => { st.page--; Engine.render(key); });
    if (next) next.addEventListener('click', () => { st.page++; Engine.render(key); });
  },

  exportCsv(key, ids) {
    const cfg = MODULES[key];
    const rows = ids
      ? ids.map(id => DB.find(cfg.type, id)).filter(Boolean)
      : Engine.dataset(key);

    const fields = SCHEMA[cfg.type] || Object.keys(rows[0] || { id: 1 });
    const csv = [fields.join(',')]
      .concat(
        rows.map(r =>
          fields.map(f => `"${String(r[f] ?? '').replace(/"/g, '""')}"`).join(',')
        )
      )
      .join('\n');

    downloadText(`${key}.csv`, csv);
    Toast.show('Exported ' + rows.length + ' records', 'success');
  },

  /* ---------------- FORM (add / edit) ---------------- */

  openForm(key, id) {
    const cfg = MODULES[key];
    const rec = id ? (DB.find(cfg.type, id) || {}) : {};

    const formHtml = `
      <form id="eng-form">
        ${cfg.fields.map(f => Engine.fieldHtml(f, rec)).join('')}
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">${id ? 'Save Changes' : 'Create'}</button>
        </div>
      </form>
    `;

    const ov = Modal.open(formHtml, {
      title: (id ? 'Edit ' : 'Add ') + cfg.title.replace(/s$/, ''),
      size: 'lg'
    });

    ov.querySelector('#eng-form').addEventListener('submit', async e => {
      e.preventDefault();

      const data = {};
      let valid = true;

      cfg.fields.forEach(f => {
        if (f.type === 'heading') return;
        const input = ov.querySelector(`[name="${f.key}"]`);
        if (!input) return;

        const val = f.type === 'checkbox'
          ? (input.checked ? '1' : '')
          : input.value.trim();

        if (f.required && !val) {
          input.classList.add('invalid');
          valid = false;
        } else {
          input.classList.remove('invalid');
        }
        data[f.key] = val;
      });

      if (!valid) {
        Toast.show('Please fill all required fields', 'error');
        return;
      }

      const submitBtn = ov.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = id ? 'Saving…' : 'Creating…';
      }

      try {
        if (id) {
          await DB.update(cfg.type, id, data);
          Toast.show('Updated successfully', 'success');
        } else {
          const rec2 = await DB.insert(cfg.type, data);
          if (cfg.onSave) cfg.onSave(rec2);
          Toast.show('Created successfully', 'success');
        }

        // Force reload so relation dropdowns (Trainers, Plans, Members…) stay in sync
        try {
          await DB.reload(cfg.type);
        } catch (reloadErr) {
          console.warn('[Engine] reload after save failed (non-fatal):', reloadErr);
        }

        Modal.close();

        // Full page reload on successful create/edit, now that the record
        // is confirmed written to Google Sheets — guarantees every list,
        // dropdown, badge and total on screen reflects the save. This is
        // scoped to the add/edit submit flow only; the (currently inert)
        // "view" action is untouched.
        setTimeout(() => location.reload(), 350);
      } catch (err) {
        console.error('[Engine] save error:', err);
        Toast.show(err.message || 'Save failed', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = id ? 'Save Changes' : 'Create';
        }
      }
    });
  },

  fieldHtml(f, rec) {
    const val = rec[f.key] ?? f.default ?? '';

    if (f.type === 'heading') {
      return `<div class="form-section-heading">${f.label}</div>`;
    }

    if (f.type === 'select') {
      const options = typeof f.options === 'function' ? f.options() : (f.options || []);
      return `
        <div class="form-group">
          <label>${f.label}${f.required ? ' *' : ''}</label>
          <select name="${f.key}">
            ${options.map(([v, l]) =>
              `<option value="${v}" ${String(v) === String(val) ? 'selected' : ''}>${l}</option>`
            ).join('')}
          </select>
        </div>`;
    }

    if (f.type === 'relation') {
      // Always read latest from DB so Trainers / Plans / Members appear after create
      const items = DB.get(f.relTo) || [];
      const mod = typeof MODULES !== 'undefined'
        ? Object.values(MODULES).find(m => m.type === f.relTo)
        : null;
      const labelField = mod?.labelField || 'name';

      return `
        <div class="form-group">
          <label>${f.label}${f.required ? ' *' : ''}</label>
          <select name="${f.key}">
            <option value="">Select…</option>
            ${items.map(i =>
              `<option value="${i.id}" ${String(i.id) === String(val) ? 'selected' : ''}>
                ${i[labelField] || i.id}
              </option>`
            ).join('')}
          </select>
        </div>`;
    }

    if (f.type === 'textarea') {
      return `
        <div class="form-group">
          <label>${f.label}</label>
          <textarea name="${f.key}" rows="3">${val}</textarea>
        </div>`;
    }

    if (f.type === 'checkbox') {
      return `
        <div class="form-group form-check">
          <label>
            <input type="checkbox" name="${f.key}" ${val ? 'checked' : ''}/>
            ${f.label}
          </label>
        </div>`;
    }

    if (f.type === 'date') {
      return `
        <div class="form-group">
          <label>${f.label}${f.required ? ' *' : ''}</label>
          <input type="date" name="${f.key}" value="${toDateInputValue(val)}"/>
        </div>`;
    }

    return `
      <div class="form-group">
        <label>${f.label}${f.required ? ' *' : ''}</label>
        <input type="${f.type}" name="${f.key}" value="${val}"
               placeholder="${f.placeholder || ''}"/>
      </div>`;
  },

  /* ---------------- DETAIL VIEW ---------------- */

  openDetail(key, id) {
    const cfg = MODULES[key];
    const rec = DB.find(cfg.type, id);
    if (!rec) return;

    const rows = cfg.fields.map(f => {
      if (f.type === 'heading') {
        return `<div class="detail-section-heading">${f.label}</div>`;
      }

      let display = rec[f.key];

      if (f.type === 'relation') {
        display = DB.label(f.relTo, rec[f.key]);
      }
      if (f.type === 'select') {
        const options = typeof f.options === 'function' ? f.options() : (f.options || []);
        const o = options.find(o => String(o[0]) === String(rec[f.key]));
        display = o ? o[1] : rec[f.key];
      }
      if (f.type === 'checkbox') display = rec[f.key] ? 'Yes' : 'No';
      if (f.type === 'date') display = fmtDate(rec[f.key]);

      return `
        <div class="detail-row">
          <span class="detail-label">${f.label}</span>
          <span class="detail-value">${display || '—'}</span>
        </div>`;
    }).join('');

    let extra = '';
    if (key === 'members') extra = Engine.memberExtras(rec);

    const html = `
      <div class="detail-id">#${rec.id}</div>
      ${rows}
      ${extra}
      <div class="form-actions">
        <button class="btn btn-ghost" data-close-modal>Close</button>
        <button class="btn btn-primary" id="detail-edit">Edit</button>
      </div>`;

    const ov = Modal.open(html, {
      title: cfg.title_ ? cfg.title_(rec) : (rec[cfg.labelField] || rec.id),
      size: 'lg'
    });

    ov.querySelector('#detail-edit').addEventListener('click', () => {
      Modal.close();
      Engine.openForm(key, id);
    });
  },

  memberExtras(rec) {
    const pays = DB.filter('PAY', p => p.memberId === rec.id);
    const visits = DB.filter('AT', a => a.memberId === rec.id);
    const totalPaid = pays.reduce((s, p) => s + Number(p.amount || 0), 0);

    return `
      <div class="detail-section">
        <h4>Payments</h4>
        ${pays.length
          ? pays.map(p => `
              <div class="detail-row">
                <span class="detail-label">${fmtDate(p.date)}</span>
                <span class="detail-value">${fmtMoney(p.amount)} ${badge(p.status)}</span>
              </div>`).join('')
          : '<p class="muted">No payments yet.</p>'}
        <div class="detail-row">
          <span class="detail-label">Total Paid</span>
          <span class="detail-value"><b>${fmtMoney(totalPaid)}</b></span>
        </div>
      </div>
      <div class="detail-section">
        <h4>Attendance</h4>
        <div class="detail-row">
          <span class="detail-label">Total Visits</span>
          <span class="detail-value">${visits.length}</span>
        </div>
      </div>`;
  },

  async remove(key, id) {
    const cfg = MODULES[key];
    const ok = await Confirm.ask(
      'Permanently delete this record? This cannot be undone.',
      { danger: true, okLabel: 'Delete' }
    );
    if (!ok) return;

    await DB.delete(cfg.type, id);
    Toast.show('Deleted', 'success');

    try { await DB.reload(cfg.type); } catch (e) {}
    Engine.render(key);
    App.renderBadges();
  }
};