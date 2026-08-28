/* ============================================================
   MODULES — declarative config. The generic Engine (engine.js)
   reads this to auto-generate list/add/edit/detail/search/
   filter/sort/pagination/bulk actions/validation for every
   module. Adding a new entity = adding a config block, no UI code.
   ============================================================ */

const F = (key, label, type, extra = {}) => Object.assign({ key, label, type }, extra);

const MODULES = {

  members: {
    type: 'M', title: 'Members', icon: '👥', view: 'cards', labelField: 'name',
    searchFields: ['name', 'phone', 'email'],
    subtitle: r => `${DB.planName(r.planId)} · Expires ${fmtDate(r.end)}`,
    fields: [
      F('name', 'Full Name', 'text', { required: true }),
      F('phone', 'Phone', 'text', { required: true }),
      F('email', 'Email', 'email'),
      F('gender', 'Gender', 'select', { options: [['M', 'Male'], ['F', 'Female'], ['O', 'Other']] }),
      F('planId', 'Plan', 'relation', { relTo: 'P', required: true }),
      F('start', 'Start Date', 'date', { required: true }),
      F('end', 'Expiry Date', 'date', { required: true }),
      F('status', 'Status', 'select', { options: [['A', 'Active'], ['E', 'Expired'], ['F', 'Frozen'], ['S', 'Suspended'], ['T', 'Trial'], ['C', 'Cancelled']], default: 'A' }),
      F('trainerId', 'Trainer', 'relation', { relTo: 'T' }),
      F('branchId', 'Branch', 'relation', { relTo: 'B' }),
      F('emergency', 'Emergency Contact', 'text'),
      F('goal', 'Goal', 'select', { options: [['Weight loss', 'Weight loss'], ['Muscle gain', 'Muscle gain'], ['General fitness', 'General fitness']] }),
      F('joined', 'Joining Date', 'date'),
      F('_health_heading', 'Health Information (Optional)', 'heading'),
      F('bloodPressure', 'Blood Pressure', 'text', { placeholder: 'e.g. 120/80' }),
      F('heartRate', 'Heart Rate (bpm)', 'number'),
      F('bloodSugar', 'Blood Sugar (mg/dL)', 'number'),
      F('bodyTemp', 'Body Temperature (°F)', 'number'),
      F('bloodType', 'Blood Type', 'select', { options: [['', '—'], ['A+', 'A+'], ['A-', 'A-'], ['B+', 'B+'], ['B-', 'B-'], ['AB+', 'AB+'], ['AB-', 'AB-'], ['O+', 'O+'], ['O-', 'O-']] }),
      F('height', 'Height (cm)', 'number'),
      F('weight', 'Weight (kg)', 'number'),
    ],
    filters: [
      { key: 'status', label: 'Status', options: [['A', 'Active'], ['E', 'Expired'], ['F', 'Frozen'], ['S', 'Suspended'], ['T', 'Trial'], ['C', 'Cancelled']] },
      { key: 'planId', label: 'Plan', options: () => DB.get('P').map(p => [p.id, p.name]) },
      { key: 'trainerId', label: 'Trainer', options: () => DB.get('T').map(t => [t.id, t.name]) },
    ],
    sorts: [['name', 'Name'], ['end', 'Expiry'], ['joined', 'Joined']],
    deleteMode: 'hard',
    bulkActions: ['status:A:Mark Active', 'status:F:Freeze', 'status:C:Cancel', 'export'],
    detailTabs: ['Overview', 'Membership', 'Payments', 'Attendance'],
  },

  plans: {
    type: 'P', title: 'Membership Plans', icon: '💳', view: 'cards', labelField: 'name',
    searchFields: ['name', 'category'],
    subtitle: r => `${fmtMoney(r.price)} · ${r.duration} ${r.durUnit || 'days'}`,
    extraLine: r => `${DB.count('M', m => m.planId === r.id)} Members`,
    fields: [
      F('name', 'Plan Name', 'text', { required: true }),
      F('category', 'Category', 'select', { options: [['Basic', 'Basic'], ['Premium', 'Premium'], ['Student', 'Student'], ['PT', 'Personal Training']] }),
      F('price', 'Price (₹)', 'number', { required: true }),
      F('duration', 'Duration (days)', 'number', { required: true }),
      F('joiningFee', 'Joining Fee (₹)', 'number'),
      F('tax', 'Tax (%)', 'number'),
      F('discount', 'Default Discount (%)', 'number'),
      F('freezeDays', 'Freeze Allowance (days)', 'number'),
      F('guestPasses', 'Guest Passes', 'number'),
      F('classAccess', 'Class Access', 'checkbox'),
      F('trainerAccess', 'Trainer Access', 'checkbox'),
      F('workoutAccess', 'Workout Access', 'checkbox'),
      F('dietAccess', 'Diet Access', 'checkbox'),
      F('lockerAccess', 'Locker Access', 'checkbox'),
      F('desc', 'Description', 'textarea'),
      F('status', 'Status', 'select', { options: [['A', 'Active'], ['C', 'Archived']], default: 'A' }),
    ],
    filters: [
      { key: 'category', label: 'Category', options: [['Basic', 'Basic'], ['Premium', 'Premium'], ['Student', 'Student'], ['PT', 'Personal Training']] },
      { key: 'status', label: 'Status', options: [['A', 'Active'], ['C', 'Archived']] },
    ],
    sorts: [['name', 'Name'], ['price', 'Price'], ['duration', 'Duration']],
    deleteMode: 'hard',
    bulkActions: ['status:A:Activate', 'status:C:Archive', 'export'],
  },

  trainers: {
    type: 'T', title: 'Trainers', icon: '👨‍🏫', view: 'cards', labelField: 'name',
    searchFields: ['name', 'phone', 'specialization'],
    subtitle: r => `${r.specialization} · ${DB.count('M', m => m.trainerId === r.id)} members`,
    fields: [
      F('name', 'Full Name', 'text', { required: true }),
      F('phone', 'Phone', 'text', { required: true }),
      F('email', 'Email', 'email'),
      F('specialization', 'Specialization', 'select', { options: [['Strength', 'Strength'], ['Cardio', 'Cardio'], ['Yoga', 'Yoga'], ['CrossFit', 'CrossFit']] }),
      F('salary', 'Salary (₹)', 'number'),
      F('commission', 'Commission (%)', 'number'),
      F('joined', 'Joining Date', 'date'),
      F('status', 'Status', 'select', { options: [['A', 'Active'], ['S', 'Suspended'], ['C', 'Cancelled']], default: 'A' }),
    ],
    filters: [{ key: 'specialization', label: 'Specialization', options: [['Strength', 'Strength'], ['Cardio', 'Cardio'], ['Yoga', 'Yoga'], ['CrossFit', 'CrossFit']] },
      { key: 'status', label: 'Status', options: [['A', 'Active'], ['S', 'Suspended'], ['C', 'Cancelled']] }],
    sorts: [['name', 'Name'], ['joined', 'Joined']],
    deleteMode: 'hard',
    bulkActions: ['status:A:Activate', 'status:C:Deactivate', 'export'],
  },

  classes: {
    type: 'CL', title: 'Classes', icon: '📚', view: 'cards', labelField: 'name',
    searchFields: ['name', 'location'],
    subtitle: r => `${DB.trainerName(r.trainerId)} · ${r.time} · ${r.days}`,
    fields: [
      F('name', 'Class Name', 'text', { required: true }),
      F('trainerId', 'Trainer', 'relation', { relTo: 'T' }),
      F('capacity', 'Capacity', 'number'),
      F('time', 'Time', 'text'),
      F('days', 'Days', 'text', { placeholder: 'Mon,Wed,Fri' }),
      F('duration', 'Duration (min)', 'number'),
      F('location', 'Location', 'text'),
      F('status', 'Status', 'select', { options: [['A', 'Active'], ['C', 'Cancelled']], default: 'A' }),
    ],
    filters: [{ key: 'trainerId', label: 'Trainer', options: () => DB.get('T').map(t => [t.id, t.name]) },
      { key: 'status', label: 'Status', options: [['A', 'Active'], ['C', 'Cancelled']] }],
    sorts: [['name', 'Name'], ['time', 'Time']],
    deleteMode: 'hard',
    bulkActions: ['status:A:Activate', 'status:C:Cancel', 'export'],
  },

  workouts: {
    type: 'WK', title: 'Exercise Library', icon: '🏋️', view: 'cards', labelField: 'name',
    searchFields: ['name', 'muscle'],
    subtitle: r => `${r.muscle} · ${r.equipment || 'Bodyweight'}`,
    fields: [
      F('name', 'Exercise Name', 'text', { required: true }),
      F('muscle', 'Muscle Group', 'select', { options: [['Chest', 'Chest'], ['Back', 'Back'], ['Legs', 'Legs'], ['Shoulders', 'Shoulders'], ['Arms', 'Arms'], ['Core', 'Core'], ['Full Body', 'Full Body']] }),
      F('equipment', 'Equipment', 'text'),
      F('difficulty', 'Difficulty', 'select', { options: [['Beginner', 'Beginner'], ['Intermediate', 'Intermediate'], ['Advanced', 'Advanced']] }),
      F('instructions', 'Instructions', 'textarea'),
      F('video', 'Video URL', 'text'),
    ],
    filters: [{ key: 'muscle', label: 'Muscle Group', options: [['Chest', 'Chest'], ['Back', 'Back'], ['Legs', 'Legs'], ['Shoulders', 'Shoulders'], ['Arms', 'Arms'], ['Core', 'Core'], ['Full Body', 'Full Body']] },
      { key: 'difficulty', label: 'Difficulty', options: [['Beginner', 'Beginner'], ['Intermediate', 'Intermediate'], ['Advanced', 'Advanced']] }],
    sorts: [['name', 'Name']],
    deleteMode: 'hard',
    bulkActions: ['export'],
  },

  diets: {
    type: 'D', title: 'Diet Plans', icon: '🥗', view: 'cards', labelField: 'id',
    searchFields: ['goal', 'notes'],
    title_: r => DB.memberName(r.memberId),
    subtitle: r => `${DB.memberName(r.memberId)} · ${r.goal}`,
    fields: [
      F('memberId', 'Member', 'relation', { relTo: 'M', required: true }),
      F('goal', 'Goal', 'select', { options: [['Weight loss', 'Weight loss'], ['Muscle gain', 'Muscle gain'], ['Maintenance', 'Maintenance'], ['General fitness', 'General fitness']] }),
      F('calories', 'Calories/day', 'number'),
      F('protein', 'Protein (g)', 'number'),
      F('carbs', 'Carbs (g)', 'number'),
      F('fats', 'Fats (g)', 'number'),
      F('meals', 'Meals', 'textarea'),
      F('notes', 'Notes', 'textarea'),
    ],
    filters: [{ key: 'goal', label: 'Goal', options: [['Weight loss', 'Weight loss'], ['Muscle gain', 'Muscle gain'], ['Maintenance', 'Maintenance'], ['General fitness', 'General fitness']] }],
    sorts: [['calories', 'Calories']],
    deleteMode: 'hard',
    bulkActions: ['export'],
  },

  expenses: {
    type: 'EXP', title: 'Expenses', icon: '💸', view: 'table', labelField: 'id',
    searchFields: ['category', 'note'],
    columns: [['category', 'Category'], ['amount', 'Amount', fmtMoney], ['date', 'Date', fmtDate], ['method', 'Method', v => STATUS_LABEL[v] || v]],
    fields: [
      F('category', 'Category', 'select', { options: [['Rent', 'Rent'], ['Electricity', 'Electricity'], ['Salaries', 'Salaries'], ['Equipment', 'Equipment'], ['Maintenance', 'Maintenance'], ['Marketing', 'Marketing'], ['Internet', 'Internet'], ['Software', 'Software'], ['Other', 'Other']], required: true }),
      F('amount', 'Amount (₹)', 'number', { required: true }),
      F('date', 'Date', 'date', { required: true }),
      F('method', 'Payment Method', 'select', { options: [['CA', 'Cash'], ['UP', 'UPI'], ['CD', 'Card'], ['BT', 'Bank Transfer'], ['OT', 'Other']] }),
      F('note', 'Note', 'textarea'),
    ],
    filters: [{ key: 'category', label: 'Category', options: [['Rent', 'Rent'], ['Electricity', 'Electricity'], ['Salaries', 'Salaries'], ['Equipment', 'Equipment'], ['Maintenance', 'Maintenance'], ['Marketing', 'Marketing'], ['Internet', 'Internet'], ['Software', 'Software'], ['Other', 'Other']] },
      { key: 'method', label: 'Method', options: [['CA', 'Cash'], ['UP', 'UPI'], ['CD', 'Card'], ['BT', 'Bank Transfer'], ['OT', 'Other']] }],
    sorts: [['date', 'Date'], ['amount', 'Amount']],
    deleteMode: 'hard',
    bulkActions: ['export'],
  },

  inventory: {
    type: 'PR', title: 'Inventory', icon: '📦', view: 'cards', labelField: 'name',
    searchFields: ['name', 'sku', 'category'],
    subtitle: r => `${r.category} · SKU ${r.sku}`,
    extraLine: r => Number(r.stock) <= Number(r.minStock) ? `⚠ Stock: ${r.stock} (min ${r.minStock})` : `Stock: ${r.stock}`,
    fields: [
      F('name', 'Product Name', 'text', { required: true }),
      F('sku', 'SKU', 'text'),
      F('category', 'Category', 'select', { options: [['Supplements', 'Supplements'], ['Accessories', 'Accessories'], ['Drinks', 'Drinks'], ['Clothing', 'Clothing'], ['Other', 'Other']] }),
      F('purchasePrice', 'Purchase Price (₹)', 'number'),
      F('sellPrice', 'Selling Price (₹)', 'number', { required: true }),
      F('stock', 'Current Stock', 'number', { required: true }),
      F('minStock', 'Minimum Stock', 'number'),
      F('status', 'Status', 'select', { options: [['A', 'Active'], ['C', 'Discontinued']], default: 'A' }),
    ],
    filters: [{ key: 'category', label: 'Category', options: [['Supplements', 'Supplements'], ['Accessories', 'Accessories'], ['Drinks', 'Drinks'], ['Clothing', 'Clothing'], ['Other', 'Other']] },
      { key: 'status', label: 'Status', options: [['A', 'Active'], ['C', 'Discontinued']] }],
    sorts: [['name', 'Name'], ['stock', 'Stock']],
    deleteMode: 'hard',
    bulkActions: ['status:A:Activate', 'status:C:Discontinue', 'export'],
  },

  staff: {
    type: 'ST', title: 'Staff', icon: '👨‍💼', view: 'cards', labelField: 'name',
    searchFields: ['name', 'role'],
    subtitle: r => `${r.role} · ${DB.branchName(r.branchId)}`,
    fields: [
      F('name', 'Full Name', 'text', { required: true }),
      F('phone', 'Phone', 'text'),
      F('email', 'Email', 'email'),
      F('role', 'Role', 'select', { options: [['Owner', 'Owner'], ['Manager', 'Manager'], ['Accountant', 'Accountant'], ['Receptionist', 'Receptionist'], ['Trainer', 'Trainer'], ['Sales', 'Sales'], ['Inventory Manager', 'Inventory Manager']], required: true }),
      F('branchId', 'Branch', 'relation', { relTo: 'B' }),
      F('status', 'Status', 'select', { options: [['A', 'Active'], ['C', 'Deactivated']], default: 'A' }),
    ],
    filters: [{ key: 'role', label: 'Role', options: [['Owner', 'Owner'], ['Manager', 'Manager'], ['Accountant', 'Accountant'], ['Receptionist', 'Receptionist'], ['Trainer', 'Trainer'], ['Sales', 'Sales'], ['Inventory Manager', 'Inventory Manager']] }],
    sorts: [['name', 'Name']],
    deleteMode: 'hard',
    bulkActions: ['status:A:Activate', 'status:C:Deactivate', 'export'],
  },

  branches: {
    type: 'B', title: 'Branches', icon: '🏢', view: 'cards', labelField: 'name',
    searchFields: ['name', 'city'],
    subtitle: r => `${r.city}, ${r.state}`,
    extraLine: r => `${DB.count('M', m => m.branchId === r.id)} members`,
    fields: [
      F('name', 'Branch Name', 'text', { required: true }),
      F('city', 'City', 'text', { required: true }),
      F('state', 'State', 'text'),
      F('status', 'Status', 'select', { options: [['A', 'Active'], ['C', 'Closed']], default: 'A' }),
    ],
    filters: [{ key: 'status', label: 'Status', options: [['A', 'Active'], ['C', 'Closed']] }],
    sorts: [['name', 'Name']],
    deleteMode: 'hard',
    bulkActions: ['export'],
  },

  payments: {
    type: 'PAY', title: 'Payments', icon: '💰', view: 'table', labelField: 'id',
    searchFields: ['id'],
    columns: [
      ['memberId', 'Member', v => DB.memberName(v)], ['planId', 'Plan', v => DB.planName(v)],
      ['amount', 'Amount', fmtMoney], ['date', 'Date', fmtDate],
      ['method', 'Method', v => STATUS_LABEL[v] || v], ['status', 'Status', v => badge(v)],
    ],
    fields: [
      F('memberId', 'Member', 'relation', { relTo: 'M', required: true }),
      F('planId', 'Plan', 'relation', { relTo: 'P', required: true }),
      F('amount', 'Amount (₹)', 'number', { required: true }),
      F('date', 'Date', 'date', { required: true }),
      F('method', 'Method', 'select', { options: [['CA', 'Cash'], ['UP', 'UPI'], ['CD', 'Card'], ['BT', 'Bank Transfer'], ['OT', 'Other']] }),
      F('status', 'Status', 'select', { options: [['PD', 'Paid'], ['PN', 'Pending'], ['PR', 'Partial'], ['RF', 'Refunded']], default: 'PD' }),
      F('note', 'Note', 'textarea'),
    ],
    filters: [{ key: 'status', label: 'Status', options: [['PD', 'Paid'], ['PN', 'Pending'], ['PR', 'Partial'], ['RF', 'Refunded']] },
      { key: 'method', label: 'Method', options: [['CA', 'Cash'], ['UP', 'UPI'], ['CD', 'Card'], ['BT', 'Bank Transfer'], ['OT', 'Other']] }],
    sorts: [['date', 'Date'], ['amount', 'Amount']],
    deleteMode: 'hard',
    bulkActions: ['status:PD:Mark Paid', 'status:RF:Refund', 'export'],
    onSave: rec => { if (!DB.find('INV', 'auto_' + rec.id)) makeInvoice(rec); },
  },
};

function makeInvoice(pay) {
  const plan = DB.find('P', pay.planId);
  const tax = plan ? Math.round(pay.amount * (Number(plan.tax) || 0) / 100) : 0;
  DB.insert('INV', { payId: pay.id, memberId: pay.memberId, subtotal: pay.amount, discount: 0, tax, total: Number(pay.amount) + tax, status: pay.status, date: pay.date }, true);
}
