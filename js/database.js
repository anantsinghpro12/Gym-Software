/* ============================================================
   GYMOS DATABASE ENGINE
   SERVER-BACKED / MULTI-TENANT
   ============================================================ */

/* Only modules that actually have a page in NAV are kept here.
   (leads/memberships/installments/bookings/followups/workoutplans/
   freezes/suppliers/sales/notifications/automations were removed
   along with their pages — dead sheets/columns cleaned up.) */
const SCHEMA = {
  M: ['id','gym_id','name','phone','email','gender','planId','start','end','status','branchId','trainerId','emergency','goal','joined','bloodPressure','heartRate','bloodSugar','bodyTemp','bloodType','height','weight'],
  P: ['id','gym_id','name','category','price','duration','durUnit','joiningFee','tax','discount','freezeDays','guestPasses','dailyLimit','classAccess','trainerAccess','workoutAccess','dietAccess','lockerAccess','branchId','desc','status'],
  PAY: ['id','gym_id','memberId','planId','amount','date','method','status','note'],
  INV: ['id','gym_id','payId','memberId','subtotal','discount','tax','total','status','date'],
  AT: ['id','gym_id','memberId','date','time','type'],
  T: ['id','gym_id','name','phone','email','specialization','salary','commission','joined','status'],
  CL: ['id','gym_id','name','trainerId','capacity','time','days','duration','location','status'],
  WK: ['id','gym_id','name','muscle','equipment','difficulty','instructions','video'],
  D: ['id','gym_id','memberId','goal','calories','protein','carbs','fats','meals','notes'],
  EXP: ['id','gym_id','category','amount','date','method','note'],
  PR: ['id','gym_id','name','sku','category','purchasePrice','sellPrice','stock','minStock','supplierId','status'],
  ST: ['id','gym_id','name','phone','email','role','branchId','status'],
  B: ['id','gym_id','name','city','state','status'],
  ACT: ['id','gym_id','ts','action','entity','entityId','user']
};

const ID_PREFIX = {
  M:'M', P:'P', PAY:'PY', INV:'INV', AT:'AT',
  T:'T', CL:'CL', WK:'W', D:'D',
  EXP:'EX', PR:'PR', ST:'ST', B:'B',
  ACT:'LOG'
};

const FILE_MAP = {
  M:'members', P:'plans', PAY:'payments', INV:'invoices',
  AT:'attendance', T:'trainers', CL:'classes', WK:'workouts', D:'diets',
  EXP:'expenses', PR:'products',
  ST:'staff', B:'branches', ACT:'activity'
};

const DB = (() => {
  const cache = {};

  function normalizeRecord(type, record) {
    if (!record || typeof record !== 'object') return record;
    const r = { ...record };
    if (r.gym_id && !r.gymId) r.gymId = r.gym_id;
    if (r.gymId && !r.gym_id) r.gym_id = r.gymId;
    if (type === 'P' && r.price !== undefined) r.price = Number(r.price) || 0;
    if (type === 'PAY' && r.amount !== undefined) r.amount = Number(r.amount) || 0;
    return r;
  }

  function normalizeArray(type, data) {
    if (!Array.isArray(data)) {
      console.warn(`[GYMOS DB] ${type} did not return array:`, data);
      return [];
    }
    return data.map(r => normalizeRecord(type, r));
  }

  function nextId(type) {
    const prefix = ID_PREFIX[type] || type;
    let max = 0;
    (cache[type] || []).forEach(r => {
      const n = parseInt(String(r.id || '').replace(prefix, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return prefix + String(max + 1).padStart(6, '0');
  }

async function persist(type) {
  try {
    await Api.put('/api/data/' + type, cache[type] || []);
    document.dispatchEvent(new CustomEvent('db:change', { detail: { type } }));
  } catch (err) {
    console.error(`[GYMOS DB] Failed saving ${type}`, err);
    // Only show toast for the main type the user is editing, not for ACT log
    if (type !== 'ACT') {
      Toast?.show?.(`Could not sync ${type} to server. Data is kept locally.`, 'error');
    }
  }
}

  return {
    async loadTenantData() {
      const types = Object.keys(FILE_MAP);
      console.log('[GYMOS DB] Loading tenant data...');
      const results = await Promise.allSettled(
        types.map(async type => {
          try {
            const data = await Api.get('/api/data/' + type);
            cache[type] = normalizeArray(type, data);
            console.log(`[GYMOS DB] ${type}: ${cache[type].length} records`);
            return true;
          } catch (err) {
            console.error(`[GYMOS DB] ${type} failed`, err);
            cache[type] = [];
            return false;
          }
        })
      );
      const success = results.filter(r => r.status === 'fulfilled' && r.value).length;
      console.log(`[GYMOS DB] Loaded ${success}/${types.length} modules`);
      document.dispatchEvent(new CustomEvent('db:loaded'));
      return cache;
    },

    async reload(type) {
      try {
        const data = await Api.get('/api/data/' + type);
        cache[type] = normalizeArray(type, data);
        return cache[type];
      } catch (err) {
        console.error(`[GYMOS DB] Reload failed: ${type}`, err);
        return [];
      }
    },

    get(type) {
      return (cache[type] || []).slice();
    },

    find(type, id) {
      return (cache[type] || []).find(r => String(r.id) === String(id)) || null;
    },

    filter(type, fn) {
      return (cache[type] || []).filter(fn);
    },

    count(type, fn) {
      const arr = cache[type] || [];
      return fn ? arr.filter(fn).length : arr.length;
    },

    search(type, query, fields) {
      if (!query) return this.get(type);
      const q = String(query).toLowerCase();
      return (cache[type] || []).filter(r =>
        fields.some(f => String(r[f] || '').toLowerCase().includes(q))
      );
    },

    async insert(type, obj, skipLog) {
      const rec = {
        ...obj,
        id: obj.id || nextId(type)
      };
      if (!cache[type]) cache[type] = [];
      cache[type].push(normalizeRecord(type, rec));
      await persist(type);
      if (!skipLog && type !== 'ACT') {
        this.log('create', type, rec.id);
      }
      return rec;
    },

    async update(type, id, patch, skipLog) {
      const arr = cache[type] || [];
      const index = arr.findIndex(r => String(r.id) === String(id));
      if (index === -1) return null;
      arr[index] = normalizeRecord(type, { ...arr[index], ...patch });
      await persist(type);
      if (!skipLog && type !== 'ACT') {
        this.log('update', type, id);
      }
      return arr[index];
    },

    async delete(type, id, skipLog) {
      const arr = cache[type] || [];
      const index = arr.findIndex(r => String(r.id) === String(id));
      if (index === -1) return false;
      arr.splice(index, 1);
      await persist(type);
      if (!skipLog && type !== 'ACT') {
        this.log('delete', type, id);
      }
      return true;
    },

    save(type) {
      return persist(type);
    },

    label(type, id) {
      if (!id) return '—';
      const rec = this.find(type, id);
      if (!rec) return '—';
      const cfg = typeof MODULES !== 'undefined'
        ? Object.values(MODULES).find(m => m.type === type)
        : null;
      const field = cfg?.labelField || 'name';
      return rec[field] || rec.id || '—';
    },

    memberName(id) { return this.label('M', id); },
    planName(id) { return this.label('P', id); },
    trainerName(id) { return this.label('T', id); },
    branchName(id) { return this.label('B', id); },

    log(action, entity, entityId) {
      if (!cache.ACT) cache.ACT = [];
      const session = typeof Auth !== 'undefined' ? Auth.getSession() : null;
      cache.ACT.push({
        id: nextId('ACT'),
        ts: new Date().toISOString(),
        action,
        entity,
        entityId,
        user: session?.email || 'Admin'
      });
      persist('ACT');
    },

    health() {
      const report = { files: {}, refs: { ok: 0, warn: [] }, errors: 0 };
      Object.keys(FILE_MAP).forEach(type => {
        report.files[type] = (cache[type] || []).length;
      });
      return report;
    },

    exportAll() {
      const bundle = { exportedAt: new Date().toISOString() };
      Object.keys(FILE_MAP).forEach(type => {
        bundle[type] = cache[type] || [];
      });
      return JSON.stringify(bundle, null, 2);
    },

    async importAll(jsonText) {
      let bundle;
      try {
        bundle = JSON.parse(jsonText);
      } catch (e) {
        throw new Error('Invalid JSON backup file');
      }
      const restored = [];
      for (const type of Object.keys(FILE_MAP)) {
        if (Array.isArray(bundle[type])) {
          cache[type] = normalizeArray(type, bundle[type]);
          await persist(type);
          restored.push(type);
        }
      }
      document.dispatchEvent(new CustomEvent('db:loaded'));
      return restored;
    },

    async resetAll() {
      for (const type of Object.keys(FILE_MAP)) {
        if (type === 'ACT') continue;
        cache[type] = [];
        await persist(type);
      }
      document.dispatchEvent(new CustomEvent('db:loaded'));
    }
  };
})();