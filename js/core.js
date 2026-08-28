/* ============================================================
   GYMOS CORE — shell, UI primitives, reusable across all pages
   ============================================================ */

const NAV = [

  {
    section: 'MAIN',

    items: [
      ['dashboard', '🏠', 'Dashboard']
    ]

  },


  {
    section: 'MEMBERS',

    items: [
      ['members', '👥', 'Members'],
      ['plans', '💳', 'Membership Plans']
    ]

  },


  {
    section: 'OPERATIONS',

    items: [
      ['trainers', '👨‍🏫', 'Trainers'],
      ['classes', '📚', 'Classes'],
      ['workouts', '🏋️', 'Workouts'],
      ['diets', '🥗', 'Diet Plans']
    ]

  },


  {
    section: 'FINANCE',

    items: [
      ['payments', '💰', 'Payments'],
      ['invoices', '🧾', 'Invoices']
    ]

  },


  {
    section: 'STORE',

    items: [
      ['inventory', '📦', 'Inventory']
    ]

  },


  {
    section: 'ADMINISTRATION',

    items: [
      ['staff', '👨‍💼', 'Staff'],
      ['branches', '🏢', 'Branches']
    ]

  },


  {
    section: 'SYSTEM',

    items: [
      ['settings', '⚙', 'Settings']
    ]

  }

];


const PAGE_TITLES =
  Object.fromEntries(

    NAV
      .flatMap(
        s => s.items
      )
      .map(
        ([k, i, l]) => [
          k,
          l
        ]
      )

  );


/* ============================================================
   Toast / Modal / Confirm
   ============================================================ */

const Toast = {

  show(
    msg,
    type = 'info'
  ) {

    let host =
      document.getElementById(
        'toast-host'
      );


    if (!host) {

      host =
        document.createElement(
          'div'
        );


      host.id =
        'toast-host';


      document.body.appendChild(
        host
      );

    }


    const elm =
      document.createElement(
        'div'
      );


    elm.className =
      'toast toast-' +
      type;


    elm.textContent =
      msg;


    host.appendChild(
      elm
    );


    requestAnimationFrame(
      () => {

        elm.classList.add(
          'show'
        );

      }
    );


    setTimeout(
      () => {

        elm.classList.remove(
          'show'
        );


        setTimeout(
          () => {

            elm.remove();

          },
          250
        );

      },
      3000
    );

  }

};


const Modal = {

  open(
    innerHtml,
    opts = {}
  ) {

    Modal.close();


    const overlay =
      document.createElement(
        'div'
      );


    overlay.className =
      'modal-overlay';


    overlay.id =
      'modal-overlay';


    overlay.innerHTML = `
      <div class="modal-box ${
        opts.size === 'lg'
          ? 'modal-lg'
          : ''
      }">

        <div class="modal-head">

          <h3>
            ${opts.title || ''}
          </h3>

          <button
            class="icon-btn"
            data-close-modal
          >
            ✕
          </button>

        </div>

        <div class="modal-body">
          ${innerHtml}
        </div>

      </div>
    `;


    document.body.appendChild(
      overlay
    );


    overlay.addEventListener(
      'click',
      e => {

        if (
          e.target === overlay ||
          e.target.closest(
            '[data-close-modal]'
          )
        ) {

          Modal.close();

        }

      }
    );


    requestAnimationFrame(
      () => {

        overlay.classList.add(
          'show'
        );

      }
    );


    return overlay;

  },


  close() {

    const m =
      document.getElementById(
        'modal-overlay'
      );


    if (m) {

      m.remove();

    }

  }

};


const Confirm = {

  ask(
    message,
    opts = {}
  ) {

    return new Promise(
      resolve => {

        const ov =
          Modal.open(
            `
              <p class="confirm-msg">
                ${message}
              </p>

              <div class="form-actions">

                ${
                  opts.okOnly
                    ? ''
                    : `
                      <button
                        class="btn btn-ghost"
                        data-act="no"
                      >
                        Cancel
                      </button>
                    `
                }

                <button
                  class="btn ${
                    opts.danger
                      ? 'btn-danger'
                      : 'btn-primary'
                  }"
                  data-act="yes"
                >
                  ${
                    opts.okLabel ||
                    'Confirm'
                  }
                </button>

              </div>
            `,
            {
              title:
                opts.title ||
                'Please confirm'
            }
          );


        ov.addEventListener(
          'click',
          e => {

            const act =
              e.target.dataset.act;


            if (
              act === 'yes'
            ) {

              Modal.close();

              resolve(
                true
              );

            }


            if (
              act === 'no'
            ) {

              Modal.close();

              resolve(
                false
              );

            }

          }
        );

      }
    );

  },


  alert(
    message,
    opts = {}
  ) {

    return Confirm.ask(
      message,
      {
        ...opts,

        okOnly:
          true,

        okLabel:
          opts.okLabel ||
          'OK'
      }
    );

  }

};


/* ============================================================
   SESSION / GYM HELPERS
   ============================================================ */

function getCurrentSession() {

  try {

    return (
      (
        Auth.getSession &&
        Auth.getSession()
      ) ||

      (
        Auth.session &&
        Auth.session()
      ) ||

      {}
    );

  } catch (err) {

    console.warn(
      'Unable to read authentication session:',
      err
    );


    return {};

  }

}


function currentGymId() {

  const s =
    getCurrentSession();


  return (
    s.gym_id ||
    s.gymId ||
    ''
  );

}


function currentGymProfile() {

  const s =
    getCurrentSession();


  const gymId =
    currentGymId();


  if (
    s.role ===
    'SUPER_ADMIN' &&
    !gymId
  ) {

    return {

      id:
        '',

      name:
        'GYMOS',

      currency:
        'INR',

      dateFormat:
        'DD/MM/YYYY'

    };

  }


  return {

    id:
      gymId,

    name:
      s.gym_name ||
      s.gymName ||
      'GYMOS',

    currency:
      s.currency ||
      'INR',

    dateFormat:
      s.dateFormat ||
      s.date_format ||
      'DD/MM/YYYY'

  };

}


/* ============================================================
   Currency / Date helpers
   ============================================================ */

const CURRENCY_SYMBOL = {

  INR:
    '₹',

  USD:
    '$',

  EUR:
    '€',

  GBP:
    '£',

  AED:
    'د.إ',

  CAD:
    'CA$',

  AUD:
    'A$',

  SGD:
    'S$'

};


function fmtMoney(n) {

  const g =
    currentGymProfile();


  const cur =
    g.currency ||
    'INR';


  const sym =
    CURRENCY_SYMBOL[cur] ||
    cur + ' ';


  return (
    sym +
    Number(n || 0)
      .toLocaleString(
        cur === 'USD'
          ? 'en-US'
          : 'en-IN'
      )
  );

}


function fmtDate(s) {

  if (!s) {

    return '—';

  }


  const g =
    currentGymProfile();


  const d =
    new Date(s);


  if (isNaN(d)) {

    return '—';

  }


  if (
    g &&
    g.dateFormat ===
    'MM/DD/YYYY'
  ) {

    return (

      String(
        d.getMonth() + 1
      ).padStart(
        2,
        '0'
      )

      +

      '/'

      +

      String(
        d.getDate()
      ).padStart(
        2,
        '0'
      )

      +

      '/'

      +

      d.getFullYear()

    );

  }


  return d.toLocaleDateString(
    'en-IN',
    {
      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric'
    }
  );

}


const daysBetween =
  (
    a,
    b
  ) =>

    Math.round(

      (
        new Date(b) -
        new Date(a)
      ) /
      86400000

    );


function debounce(
  fn,
  ms = 250
) {

  let t;


  return (...a) => {

    clearTimeout(t);


    t =
      setTimeout(
        () => fn(...a),
        ms
      );

  };

}


function paginate(
  arr,
  page,
  perPage
) {

  const start =
    (page - 1) *
    perPage;


  return arr.slice(
    start,
    start + perPage
  );

}


function el(html) {

  const t =
    document.createElement(
      'template'
    );


  t.innerHTML =
    html.trim();


  return t.content.firstChild;

}


function downloadText(
  filename,
  text
) {

  const blob =
    new Blob(
      [text],
      {
        type:
          'text/plain'
      }
    );


  const a =
    document.createElement(
      'a'
    );


  a.href =
    URL.createObjectURL(
      blob
    );


  a.download =
    filename;


  a.click();


  URL.revokeObjectURL(
    a.href
  );

}


/* ============================================================
   Status helpers
   ============================================================ */

const STATUS_LABEL = {

  A:
    'Active',

  E:
    'Expired',

  F:
    'Frozen',

  S:
    'Suspended',

  T:
    'Trial',

  C:
    'Cancelled',

  P:
    'Pending',

  PD:
    'Paid',

  PN:
    'Pending',

  PR:
    'Partial',

  RF:
    'Refunded'

};


const STATUS_COLOR = {

  A:
    'green',

  E:
    'red',

  F:
    'blue',

  S:
    'gray',

  T:
    'purple',

  C:
    'gray',

  P:
    'orange',

  PD:
    'green',

  PN:
    'orange',

  PR:
    'blue',

  RF:
    'red'

};


function badge(status) {

  return `
    <span class="badge badge-${
      STATUS_COLOR[status] ||
      'gray'
    }">
      ${
        STATUS_LABEL[status] ||
        status ||
        '—'
      }
    </span>
  `;

}


/* ============================================================
   SVG charts
   ============================================================ */

const Charts = {

  line(
    container,
    series,
    labels
  ) {

    const w =
      560;

    const h =
      190;

    const pad =
      30;


    const max =
      Math.max(
        1,
        ...series
      ) * 1.15;


    const stepX =
      (
        w -
        pad * 2
      ) /
      (
        series.length -
        1 ||
        1
      );


    const pts =
      series.map(
        (
          v,
          i
        ) => [

          pad +
          i *
          stepX,

          h -
          pad -

          (
            v /
            max
          ) *

          (
            h -
            pad * 1.5
          )

        ]
      );


    const path =
      pts
        .map(
          (
            p,
            i
          ) =>

            (
              i === 0
                ? 'M'
                : 'L'
            )

            +

            p[0].toFixed(1)

            +

            ','

            +

            p[1].toFixed(1)

        )
        .join(' ');


    const area =
      path +

      `
        L${
          pts[
            pts.length - 1
          ][0]
        },${h - pad}

        L${
          pts[0][0]
        },${h - pad}

        Z
      `;


    const dots =
      pts
        .map(
          p =>

            `
              <circle
                cx="${p[0]}"
                cy="${p[1]}"
                r="3.5"
                fill="var(--accent)"
              />
            `

        )
        .join('');


    const labelsSvg =
      labels
        .map(
          (
            l,
            i
          ) =>

            `
              <text
                x="${
                  pad +
                  i *
                  stepX
                }"
                y="${h - 8}"
                font-size="10"
                fill="var(--muted)"
                text-anchor="middle"
              >
                ${l}
              </text>
            `

        )
        .join('');


    container.innerHTML = `
      <svg
        viewBox="0 0 ${w} ${h}"
        class="chart-svg"
      >

        <defs>

          <linearGradient
            id="lg1"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >

            <stop
              offset="0%"
              stop-color="var(--accent)"
              stop-opacity="0.28"
            />

            <stop
              offset="100%"
              stop-color="var(--accent)"
              stop-opacity="0"
            />

          </linearGradient>

        </defs>

        <path
          d="${area}"
          fill="url(#lg1)"
        />

        <path
          d="${path}"
          fill="none"
          stroke="var(--accent)"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        ${dots}

        ${labelsSvg}

      </svg>
    `;

  },


  bars(
    container,
    series,
    labels
  ) {

    const w =
      560;

    const h =
      190;

    const pad =
      28;

    const gap =
      10;


    const max =
      Math.max(
        1,
        ...series
      ) * 1.15;


    const bw =
      (
        w -
        pad * 2
      ) /
      series.length -
      gap;


    const bars =
      series
        .map(
          (
            v,
            i
          ) => {

            const bh =
              (
                v /
                max
              ) *

              (
                h -
                pad * 1.6
              );


            const x =
              pad +
              i *
              (
                bw +
                gap
              );


            const y =
              h -
              pad -
              bh;


            return `

              <rect
                x="${x}"
                y="${y}"
                width="${bw}"
                height="${bh}"
                rx="5"
                fill="var(--accent)"
              />

              <text
                x="${
                  x +
                  bw / 2
                }"
                y="${h - 8}"
                font-size="10"
                fill="var(--muted)"
                text-anchor="middle"
              >
                ${labels[i]}
              </text>

            `;

          }
        )
        .join('');


    container.innerHTML = `

      <svg
        viewBox="0 0 ${w} ${h}"
        class="chart-svg"
      >

        ${bars}

      </svg>

    `;

  },


  donut(
    container,
    data
  ) {

    const total =
      data.reduce(
        (
          s,
          d
        ) =>
          s +
          d.value,
        0
      ) ||
      1;


    const r =
      60;

    const cx =
      80;

    const cy =
      80;

    const sw =
      26;


    let angle =
      -90;


    const colors = [

      '#D97757',

      '#4C6EF5',

      '#12B886',

      '#F59F00',

      '#845EF7',

      '#EA4C89'

    ];


    const segs =
      data
        .map(
          (
            d,
            i
          ) => {

            const frac =
              d.value /
              total;


            const a0 =
              angle;


            const a1 =
              angle +
              frac *
              360;


            angle =
              a1;


            const large =
              a1 - a0 >
              180
                ? 1
                : 0;


            const p0 =
              polar(
                cx,
                cy,
                r,
                a0
              );


            const p1 =
              polar(
                cx,
                cy,
                r,
                a1
              );


            return `

              <path
                d="
                  M${p0.x},${p0.y}
                  A${r},${r}
                  0
                  ${large}
                  1
                  ${p1.x},${p1.y}
                "
                fill="none"
                stroke="${
                  colors[
                    i %
                    colors.length
                  ]
                }"
                stroke-width="${sw}"
              />

            `;

          }
        )
        .join('');


    const legend =
      data
        .map(
          (
            d,
            i
          ) =>

            `
              <div class="legend-row">

                <span
                  class="dot"
                  style="
                    background:${
                      colors[
                        i %
                        colors.length
                      ]
                    }
                  "
                ></span>

                ${d.label}

                <b>
                  ${
                    Math.round(
                      d.value /
                      total *
                      100
                    )
                  }%
                </b>

              </div>
            `

        )
        .join('');


    container.innerHTML = `

      <div class="donut-wrap">

        <svg
          viewBox="0 0 160 160"
          class="donut-svg"
        >

          ${segs}

          <text
            x="80"
            y="84"
            text-anchor="middle"
            font-size="20"
            font-weight="700"
            fill="var(--text)"
          >
            ${total}
          </text>

        </svg>

        <div class="donut-legend">

          ${legend}

        </div>

      </div>

    `;


    function polar(
      cx,
      cy,
      r,
      deg
    ) {

      const rad =
        deg *
        Math.PI /
        180;


      return {

        x:
          cx +
          r *
          Math.cos(rad),

        y:
          cy +
          r *
          Math.sin(rad)

      };

    }

  }

};


/* ============================================================
   App shell
   ============================================================ */

const App = {


  /* ==========================================================
     BOOT
     ========================================================== */

  async boot(
    pageKey,
    afterInit
  ) {

    const ok =
      await Auth.guard();


    if (!ok) {

      return;

    }


    await DB.loadTenantData();


    App.initShell(
      pageKey
    );


    if (afterInit) {

      afterInit();

    }


    document.dispatchEvent(
      new CustomEvent(
        'app:ready'
      )
    );

  },


  /* ==========================================================
     INITIALIZE SHELL
     ========================================================== */

  initShell(
    pageKey
  ) {

    const page =
      pageKey ||
      document.body.dataset.page;


    document.body.dataset.page =
      page;


    const shell =
      document.getElementById(
        'app-shell'
      );


    shell.insertAdjacentHTML(
      'afterbegin',
      App.sidebarHtml(
        page
      )
    );


    shell.insertAdjacentHTML(
      'beforeend',
      `
        <div class="main-col">
          ${
            App.headerHtml(
              page
            )
          }
        </div>
      `
    );


    App.wireShell();


    App.renderBadges();


    document.addEventListener(
      'db:change',
      debounce(
        App.renderBadges,
        200
      )
    );

  },


  /* ==========================================================
     SIDEBAR HTML
     ========================================================== */

  sidebarHtml(
    page
  ) {

    const gym =
      currentGymProfile();


    const sections =
      NAV
        .map(
          s =>

            `
              <div class="nav-section">

                <div class="nav-section-label">
                  ${s.section}
                </div>

                ${
                  s.items
                    .map(
                      ([
                        key,
                        icon,
                        label
                      ]) =>

                        `
                          <a
                            href="${key}.html"
                            class="nav-item ${
                              page === key
                                ? 'active'
                                : ''
                            }"
                            data-navkey="${key}"
                          >

                            <span class="nav-icon">
                              ${icon}
                            </span>

                            <span class="nav-label">
                              ${label}
                            </span>

                            <span
                              class="nav-count"
                              data-badge="${key}"
                            ></span>

                          </a>
                        `
                    )
                    .join('')
                }

              </div>
            `

        )
        .join('');


    /*
      IMPORTANT:

      The old sidebar toggle:

        ☰ Collapse

      has been replaced by:

        🚪 Logout

      The logout button directly calls
      Auth.logout().
    */

    return `

      <aside
        class="sidebar"
        id="sidebar"
      >

        <div class="sidebar-top">

          <span class="brand-icon">
            🏋️
          </span>

          <span class="brand-text">
            ${
              gym &&
              gym.name
                ? gym.name
                : 'GYMOS'
            }
          </span>


          <!-- LOGOUT IN SIDEBAR -->

<button
  class="sidebar-logout"
  id="sidebar-logout-btn"
  type="button"
  title="Logout"
  aria-label="Logout"
  style="
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 10px 16px;
    border: 1px solid #dc3545;
    border-radius: 8px;
    background: #fff;
    color: #dc3545;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-sizing: border-box;
  "
  onmouseover="this.style.background='#dc3545'; this.style.color='#fff';"
  onmouseout="this.style.background='#fff'; this.style.color='#dc3545';"
>
  <span style="font-size: 17px;">🚪</span>
  <span>Logout</span>
</button>

        </div>


        <nav class="sidebar-nav">

          ${sections}

        </nav>


        <!-- SIDEBAR BOTTOM LOGOUT -->

        <div class="sidebar-bottom">

          <button
            class="sidebar-logout-full"
            id="sidebar-logout-full"
            title="Logout"
          >

            <span class="nav-icon">
              🚪
            </span>

            <span class="nav-label">
              Logout
            </span>

          </button>

        </div>


      </aside>


      <div
        class="sidebar-scrim"
        id="sidebar-scrim"
      ></div>

    `;

  },


  /* ==========================================================
     HEADER HTML
     ========================================================== */

  headerHtml(
    page
  ) {

    const s =
      getCurrentSession();


    return `

      <header class="topbar">


        <button
          class="icon-btn mobile-menu-btn"
          id="mobile-menu-btn"
        >
          ☰
        </button>


        <h1 class="page-title">

          ${
            PAGE_TITLES[page] ||
            'GYMOS'
          }

        </h1>


        <div class="global-search">

          <input
            id="global-search"
            placeholder="Search members, plans, payments, trainers…"
            autocomplete="off"
          />


          <div
            class="search-results"
            id="search-results"
          ></div>

        </div>


        <button
          class="icon-btn"
          id="notif-btn"
        >

          🔔

          <span
            class="notif-dot"
            id="notif-dot"
            hidden
          ></span>

        </button>


        <div
          class="avatar"
          id="avatar-btn"
          title="${s.email || ''}"
        >
          👤
        </div>


        <div
          class="avatar-menu"
          id="avatar-menu"
          hidden
        >

          <div class="avatar-email">
            ${s.email || ''}
          </div>


          <a
            href="settings.html"
          >
            ⚙ Settings
          </a>


          <button
            id="logout-btn"
          >
            🚪 Logout
          </button>


        </div>


      </header>


      <main
        class="content"
        id="content"
        data-page="${page}"
      ></main>

    `;

  },


  /* ==========================================================
     WIRE SHELL
     ========================================================== */

  wireShell() {

    const shell =
      document.getElementById(
        'app-shell'
      );


    /* ========================================================
       MOBILE MENU
       ======================================================== */

    const mobileMenuBtn =
      document.getElementById(
        'mobile-menu-btn'
      );


    if (mobileMenuBtn) {

      mobileMenuBtn.addEventListener(
        'click',
        () => {

          shell.classList.toggle(
            'sidebar-open'
          );

        }
      );

    }


    /* ========================================================
       SIDEBAR SCRIM
       ======================================================== */

    const sidebarScrim =
      document.getElementById(
        'sidebar-scrim'
      );


    if (sidebarScrim) {

      sidebarScrim.addEventListener(
        'click',
        () => {

          shell.classList.remove(
            'sidebar-open'
          );

        }
      );

    }


    /* ========================================================
       SIDEBAR LOGOUT ICON
       ======================================================== */

    const sidebarLogoutBtn =
      document.getElementById(
        'sidebar-logout-btn'
      );


    if (sidebarLogoutBtn) {

      sidebarLogoutBtn.addEventListener(
        'click',
        async () => {

          await App.confirmLogout();

        }
      );

    }


    /* ========================================================
       SIDEBAR FULL LOGOUT
       ======================================================== */

    const sidebarLogoutFull =
      document.getElementById(
        'sidebar-logout-full'
      );


    if (sidebarLogoutFull) {

      sidebarLogoutFull.addEventListener(
        'click',
        async () => {

          await App.confirmLogout();

        }
      );

    }


    /* ========================================================
       AVATAR MENU
       ======================================================== */

    const avatarBtn =
      document.getElementById(
        'avatar-btn'
      );


    const avatarMenu =
      document.getElementById(
        'avatar-menu'
      );


    if (
      avatarBtn &&
      avatarMenu
    ) {

      avatarBtn.addEventListener(
        'click',
        () => {

          avatarMenu.hidden =
            !avatarMenu.hidden;

        }
      );


      document.addEventListener(
        'click',
        e => {

          if (
            !e.target.closest(
              '#avatar-btn'
            ) &&
            !e.target.closest(
              '#avatar-menu'
            )
          ) {

            avatarMenu.hidden =
              true;

          }

        }
      );

    }


    /* ========================================================
       HEADER LOGOUT
       ======================================================== */

    const logoutBtn =
      document.getElementById(
        'logout-btn'
      );


    if (logoutBtn) {

      logoutBtn.addEventListener(
        'click',
        async () => {

          await App.confirmLogout();

        }
      );

    }


    /* ========================================================
       GLOBAL SEARCH
       ======================================================== */

    const search =
      document.getElementById(
        'global-search'
      );


    const results =
      document.getElementById(
        'search-results'
      );


    if (
      search &&
      results
    ) {

      search.addEventListener(
        'input',
        debounce(
          () => {

            const q =
              search.value.trim();


            if (!q) {

              results.innerHTML =
                '';

              results.hidden =
                true;

              return;

            }


            results.hidden =
              false;


            results.innerHTML =
              App.globalSearch(
                q
              );

          },
          200
        )
      );


      document.addEventListener(
        'click',
        e => {

          if (
            !e.target.closest(
              '.global-search'
            )
          ) {

            results.hidden =
              true;

          }

        }
      );

    }

  },


  /* ==========================================================
     LOGOUT CONFIRMATION
     ========================================================== */

  async confirmLogout() {

    const confirmed =
      await Confirm.ask(
        'Are you sure you want to logout?',
        {
          title:
            'Logout',

          okLabel:
            'Logout',

          danger:
            true
        }
      );


    if (!confirmed) {

      return;

    }


    /*
      Auth.logout():

        1. Clears localStorage session
        2. Clears localStorage token
        3. Clears old sessionStorage
        4. Redirects to login.html
    */

    Auth.logout(
      'login.html'
    );

  },


  /* ==========================================================
     GLOBAL SEARCH
     ========================================================== */

  globalSearch(
    q
  ) {

    const groups = [

      [
        'Members',

        DB.search(
          'M',
          q,
          [
            'name',
            'phone',
            'email'
          ]
        )
        .slice(0, 4)
        .map(
          r => [
            r.name,
            'members.html'
          ]
        )

      ],


      [
        'Plans',

        DB.search(
          'P',
          q,
          ['name']
        )
        .slice(0, 4)
        .map(
          r => [
            r.name,
            'plans.html'
          ]
        )

      ],


      [
        'Payments',

        DB.search(
          'PAY',
          q,
          ['id']
        )
        .slice(0, 4)
        .map(
          r => [

            r.id +
            ' — ' +
            DB.memberName(
              r.memberId
            ),

            'payments.html'

          ]
        )

      ],


      [
        'Trainers',

        DB.search(
          'T',
          q,
          ['name']
        )
        .slice(0, 4)
        .map(
          r => [
            r.name,
            'trainers.html'
          ]
        )

      ]

    ].filter(
      g =>
        g[1].length
    );


    if (
      !groups.length
    ) {

      return `
        <div class="search-empty">
          No results for “${q}”
        </div>
      `;

    }


    return groups
      .map(
        (
          [
            label,
            items
          ]
        ) =>

          `
            <div class="search-group">

              <div class="search-group-label">
                ${label}
              </div>


              ${
                items
                  .map(
                    (
                      [
                        t,
                        href
                      ]
                    ) =>

                      `
                        <a
                          class="search-item"
                          href="${href}"
                        >
                          ${t}
                        </a>
                      `
                  )
                  .join('')
              }

            </div>
          `

      )
      .join('');

  },


  /* ==========================================================
     BADGES
     ========================================================== */

  renderBadges() {

    const today =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );


    const expiring =
      DB.count(
        'M',
        m =>

          m.status ===
          'A'

          &&

          daysBetween(
            today,
            m.end
          ) >= 0

          &&

          daysBetween(
            today,
            m.end
          ) <= 7
      );


    const lowStock =
      DB.count(
        'PR',
        p =>

          Number(
            p.stock
          ) <=

          Number(
            p.minStock
          )
      );


    const pendingPay =
      DB.count(
        'PAY',
        p =>
          p.status !==
          'PD'
      );


    setBadge(
      'renewals',
      expiring,
      'orange'
    );


    setBadge(
      'inventory',
      lowStock,
      'orange'
    );


    setBadge(
      'payments',
      pendingPay,
      'red'
    );


    const dot =
      document.getElementById(
        'notif-dot'
      );


    if (dot) {

      dot.hidden =
        !(
          expiring ||
          lowStock ||
          pendingPay
        );

    }


    function setBadge(
      key,
      n,
      color
    ) {

      const b =
        document.querySelector(
          `[data-badge="${key}"]`
        );


      if (!b) {

        return;

      }


      b.textContent =
        n > 0
          ? n
          : '';


      b.className =
        'nav-count' +

        (
          n > 0
            ? ' show badge-dot-' +
              color
            : ''
        );

    }

  }

};