/* ============================================================
   GYMOS SUPER ADMIN DASHBOARD
   Google Sheets / Apps Script Version
   ============================================================ */


(async () => {


  /* ==========================================================
     CACHE
     ========================================================== */

  let cachedGyms = [];


  /* ==========================================================
     BOOT
     ========================================================== */

  async function boot() {

    try {

      const ok =
        await Auth.guard("SUPER_ADMIN");


      if (!ok) {
        return;
      }


      const logoutBtn =
        document.getElementById("sa-logout");


      if (logoutBtn) {

        logoutBtn.addEventListener(
          "click",
          () => {

            Auth.logout(
              "sapower-jio.html"
            );

          }
        );

      }


      await render();


      document.dispatchEvent(
        new CustomEvent("app:ready")
      );


    } catch (error) {

      console.error(
        "Super Admin boot error:",
        error
      );


      const root =
        document.getElementById("content");


      if (root) {

        root.innerHTML = `

          <div class="auth-error show">

            ${escapeHTML(
              error?.message ||
              "Unable to load Super Admin dashboard."
            )}

          </div>

        `;

      }


      document.dispatchEvent(
        new CustomEvent("app:ready")
      );

    }

  }


  /* ==========================================================
     LOAD GYMS
     ========================================================== */

  async function loadGyms(force = false) {

    if (
      !force &&
      cachedGyms.length
    ) {

      return cachedGyms;

    }


    try {

      const gyms =
        await Api.getGyms();


      cachedGyms =
        Array.isArray(gyms)
          ? gyms
          : [];


      return cachedGyms;


    } catch (error) {

      console.error(
        "Could not load gyms:",
        error
      );

      throw error;

    }

  }


  /* ==========================================================
     RENDER DASHBOARD
     ========================================================== */

  async function render() {

    const root =
      document.getElementById("content");


    if (!root) {
      return;
    }


    root.innerHTML = `

      <div class="toolbar">

        <div class="toolbar-left">

          <h3 class="muted-title">
            Loading gyms...
          </h3>

        </div>

      </div>

    `;


    try {

      const gyms =
        await loadGyms(true);


      root.innerHTML = `

        <div class="toolbar">

          <div class="toolbar-left">

            <h3 class="muted-title">

              ${gyms.length}

              gym${gyms.length === 1 ? "" : "s"}

              registered

            </h3>

          </div>


          <div class="toolbar-right">

            <button
              class="btn btn-primary"
              id="add-gym"
              type="button"
            >
              + Add New Gym
            </button>

          </div>

        </div>


        <div class="table-wrap">

          <table class="data-table">

            <thead>

              <tr>

                <th>Gym Name</th>

                <th>Owner Email</th>

                <th>Password</th>

                <th>Phone</th>

                <th>Currency</th>

                <th>Date Format</th>

                <th>Status</th>

                <th>Created</th>

                <th>Actions</th>

              </tr>

            </thead>


            <tbody>

              ${
                gyms.length === 0

                  ? `

                    <tr>

                      <td
                        colspan="9"
                        class="muted"
                      >

                        No gyms registered yet.

                      </td>

                    </tr>

                  `

                  : gyms
                      .map(renderGymRow)
                      .join("")
              }

            </tbody>

          </table>

        </div>

      `;


      document
        .getElementById("add-gym")
        ?.addEventListener(
          "click",
          () => openGymForm()
        );


      document
        .querySelectorAll("[data-edit]")
        .forEach(button => {

          button.addEventListener(
            "click",
            () => {

              openGymForm(
                button.dataset.edit
              );

            }
          );

        });


      document
        .querySelectorAll("[data-delete]")
        .forEach(button => {

          button.addEventListener(
            "click",
            () => {

              deleteGym(
                button.dataset.delete
              );

            }
          );

        });


    } catch (error) {

      console.error(
        "Render gyms error:",
        error
      );


      root.innerHTML = `

        <div class="auth-error show">

          ${escapeHTML(
            error?.message ||
            "Failed to load gyms from Google Sheets."
          )}

        </div>


        <div style="margin-top:15px">

          <button
            class="btn btn-primary"
            id="retry-load"
            type="button"
          >

            Retry

          </button>

        </div>

      `;


      document
        .getElementById("retry-load")
        ?.addEventListener(
          "click",
          render
        );

    }

  }


  /* ==========================================================
     GYM ROW
     ========================================================== */

  function renderGymRow(g) {

    const password =
      g.password !== undefined &&
      g.password !== null
        ? String(g.password)
        : "";


    return `

      <tr>


        <!-- GYM NAME -->

        <td>

          <b>

            ${escapeHTML(
              g.name ||
              "Unnamed Gym"
            )}

          </b>

        </td>


        <!-- OWNER EMAIL -->

        <td>

          ${escapeHTML(
            g.ownerEmail ||
            "—"
          )}

        </td>


        <!-- PASSWORD -->

        <td>

          ${
            password
              ? `
                <span
                  style="
                    font-weight:700;
                    letter-spacing:.2px;
                    color:#111827;
                  "
                >
                  ${escapeHTML(password)}
                </span>
              `
              : `
                <span class="muted">
                  Not set
                </span>
              `
          }

        </td>


        <!-- PHONE -->

        <td>

          ${escapeHTML(
            g.phone ||
            "—"
          )}

        </td>


        <!-- CURRENCY -->

        <td>

          ${escapeHTML(
            g.currency ||
            "INR"
          )}

        </td>


        <!-- DATE FORMAT -->

        <td>

          ${escapeHTML(
            g.dateFormat ||
            "DD MMM YYYY"
          )}

        </td>


        <!-- STATUS -->

        <td>

          ${badgeStatus(g.status)}

        </td>


        <!-- CREATED -->

        <td>

          ${escapeHTML(
            formatCreated(
              g.created
            ) ||
            "—"
          )}

        </td>


        <!-- ACTIONS -->

        <td class="row-actions">


          <button
            class="btn btn-sm"
            type="button"
            data-edit="${escapeAttribute(
              g.id
            )}"
          >

            Edit

          </button>

            Delete

          </button>


        </td>


      </tr>

    `;

  }


  /* ==========================================================
     CREATED DATE
     ========================================================== */

  function formatCreated(value) {

    if (!value) {
      return "";
    }


    const d =
      new Date(value);


    if (
      isNaN(
        d.getTime()
      )
    ) {

      return String(value);

    }


    return d.toLocaleDateString();

  }


  /* ==========================================================
     STATUS
     ========================================================== */

  function badgeStatus(status) {

    const normalized =
      String(
        status ??
        ""
      )
        .trim()
        .toUpperCase();


    const active =
      normalized === "A" ||
      normalized === "ACTIVE";


    return `

      <span
        class="badge badge-${active ? "green" : "gray"}"
      >

        ${active
          ? "Active"
          : "Suspended"}

      </span>

    `;

  }


  /* ==========================================================
     ADD / EDIT GYM
     ========================================================== */

  async function openGymForm(id) {

    try {

      const gyms =
        await loadGyms();


      const gym =
        id
          ? gyms.find(
              g =>
                String(g.id) ===
                String(id)
            )
          : null;


      if (
        id &&
        !gym
      ) {

        Toast.show(
          "Gym not found.",
          "error"
        );

        return;

      }


      /*
         Existing password comes directly
         from Users.password_hash through
         the backend's getGyms endpoint.
      */

      const existingPassword =
        gym &&
        gym.password !== undefined &&
        gym.password !== null
          ? String(gym.password)
          : "";


      const html = `


        <!-- ==================================================
             GYM NAME
             ================================================== -->

        <div class="form-group">

          <label>
            Gym Name *
          </label>

          <input
            id="g-name"
            value="${escapeAttribute(
              gym?.name || ""
            )}"
          />

        </div>


        <!-- ==================================================
             OWNER EMAIL
             ================================================== -->

        <div class="form-group">

          <label>
            Owner Email *
          </label>

          <input
            id="g-email"
            type="email"
            value="${escapeAttribute(
              gym?.ownerEmail || ""
            )}"
          />

        </div>


        <!-- ==================================================
             PASSWORD
             ================================================== -->

        <div class="form-group">

          <label>
            Password
          </label>


          <div
            style="
              position:relative;
              width:100%;
              display:flex;
              align-items:center;
            "
          >

            <input
              id="g-pass"
              type="text"
              value="${escapeAttribute(
                existingPassword
              )}"
              placeholder="${
                gym
                  ? "Password"
                  : "Enter password"
              }"
              autocomplete="off"
              style="
                width:100%;
                box-sizing:border-box;
                padding-right:50px;
              "
            />


            <button
              type="button"
              id="g-pass-toggle"
              title="Show / hide password"
              aria-label="Show or hide password"
              style="
                position:absolute;
                right:6px;
                top:50%;
                transform:translateY(-50%);
                width:38px;
                height:38px;
                border:none;
                border-radius:8px;
                background:#eef2ff;
                color:#2563eb;
                cursor:pointer;
                font-size:18px;
              "
            >
              👁
            </button>

          </div>


          <p
            class="muted"
            style="
              margin:6px 0 0 2px;
              font-size:12px;
            "
          >

            ${
              gym
                ? "Current password is loaded directly from the Users sheet. Edit it here to change the owner's login password."
                : "Enter the password that will be used for the gym owner's login."
            }

          </p>

        </div>


        <!-- ==================================================
             PHONE
             ================================================== -->

        <div class="form-group">

          <label>
            Contact Phone
          </label>

          <input
            id="g-phone"
            value="${escapeAttribute(
              gym?.phone || ""
            )}"
          />

        </div>


        <!-- ==================================================
             CURRENCY
             ================================================== -->

        <div class="form-group">

          <label>
            Currency
          </label>

          <select id="g-currency">


            <option
              value="INR"
              ${
                !gym ||
                gym.currency === "INR"
                  ? "selected"
                  : ""
              }
            >

              INR — Indian Rupee

            </option>


            <option
              value="USD"
              ${
                gym?.currency === "USD"
                  ? "selected"
                  : ""
              }
            >

              USD — US Dollar

            </option>


          </select>

        </div>


        <!-- ==================================================
             DATE FORMAT
             ================================================== -->

        <div class="form-group">

          <label>
            Date Format
          </label>

          <select id="g-dateformat">


            <option
              value="DD MMM YYYY"
              ${
                !gym ||
                gym.dateFormat ===
                  "DD MMM YYYY"
                  ? "selected"
                  : ""
              }
            >

              DD MMM YYYY

            </option>


            <option
              value="MM/DD/YYYY"
              ${
                gym?.dateFormat ===
                  "MM/DD/YYYY"
                  ? "selected"
                  : ""
              }
            >

              MM/DD/YYYY

            </option>


          </select>

        </div>


        <!-- ==================================================
             STATUS
             ================================================== -->

        <div class="form-group">

          <label>
            Account Status
          </label>

          <select id="g-status">


            <option
              value="A"
              ${
                !gym ||
                gym.status === "A" ||
                gym.status === "ACTIVE"
                  ? "selected"
                  : ""
              }
            >

              Active

            </option>


            <option
              value="C"
              ${
                gym?.status === "C" ||
                gym?.status === "SUSPENDED"
                  ? "selected"
                  : ""
              }
            >

              Suspended

            </option>


          </select>

        </div>


        <!-- ==================================================
             ERROR
             ================================================== -->

        <div
          class="auth-error"
          id="g-err"
        ></div>


        <!-- ==================================================
             ACTIONS
             ================================================== -->

        <div class="form-actions">


          <button
            class="btn btn-ghost"
            type="button"
            data-close-modal
          >

            Cancel

          </button>


          <button
            class="btn btn-primary"
            id="g-save"
            type="button"
          >

            ${
              gym
                ? "Update Gym"
                : "Create Gym"
            }

          </button>


        </div>

      `;


      const modal =
        Modal.open(
          html,
          {
            title:
              gym
                ? "Edit Gym"
                : "Add New Gym",

            size:
              "lg"
          }
        );


      /* ======================================================
         PASSWORD SHOW / HIDE
         ====================================================== */

      const passwordInput =
        modal.querySelector(
          "#g-pass"
        );


      const passwordToggle =
        modal.querySelector(
          "#g-pass-toggle"
        );


      if (
        passwordInput &&
        passwordToggle
      ) {

        passwordToggle.addEventListener(
          "click",
          () => {

            if (
              passwordInput.type ===
              "password"
            ) {

              passwordInput.type =
                "text";

            } else {

              passwordInput.type =
                "password";

            }

          }
        );

      }


      /* ======================================================
         SAVE BUTTON
         ====================================================== */

      const saveBtn =
        modal.querySelector(
          "#g-save"
        );


      saveBtn.addEventListener(
        "click",
        async () => {


          /* ==================================================
             READ FORM
             ================================================== */

          const name =
            modal
              .querySelector(
                "#g-name"
              )
              .value
              .trim();


          const email =
            modal
              .querySelector(
                "#g-email"
              )
              .value
              .trim()
              .toLowerCase();


          const password =
            modal
              .querySelector(
                "#g-pass"
              )
              .value;


          const phone =
            modal
              .querySelector(
                "#g-phone"
              )
              .value
              .trim();


          const currency =
            modal
              .querySelector(
                "#g-currency"
              )
              .value;


          const dateFormat =
            modal
              .querySelector(
                "#g-dateformat"
              )
              .value;


          const status =
            modal
              .querySelector(
                "#g-status"
              )
              .value;


          const errEl =
            modal.querySelector(
              "#g-err"
            );


          errEl.classList.remove(
            "show"
          );


          /* ==================================================
             VALIDATION
             ================================================== */

          if (
            !name ||
            !email
          ) {

            errEl.textContent =
              "Gym Name and Owner Email are required.";

            errEl.classList.add(
              "show"
            );

            return;

          }


          if (
            !gym &&
            !password
          ) {

            errEl.textContent =
              "Password is required when creating a new gym.";

            errEl.classList.add(
              "show"
            );

            return;

          }


          saveBtn.disabled =
            true;


          saveBtn.textContent =
            gym
              ? "Updating..."
              : "Creating...";


          try {


            /* ================================================
               EDIT EXISTING GYM
               ================================================ */

            if (gym) {

              /*
                 IMPORTANT:

                 We send the password even during edit.

                 Because the input was automatically filled
                 with the existing password, saving without
                 changing it keeps the same password.

                 If the Super Admin changes it, the new password
                 is saved into Users.password_hash.
              */

              await Api.updateGym({

                id:
                  gym.id,

                name:
                  name,

                ownerEmail:
                  email,

                password:
                  password,

                phone:
                  phone,

                currency:
                  currency,

                dateFormat:
                  dateFormat,

                status:
                  status

              });


              Toast.show(
                "Gym updated successfully.",
                "success"
              );


            }

            /* ================================================
               CREATE NEW GYM
               ================================================ */

            else {

              await Api.createGym({

                name:
                  name,

                ownerEmail:
                  email,

                password:
                  password,

                phone:
                  phone,

                currency:
                  currency,

                dateFormat:
                  dateFormat,

                status:
                  status

              });


              Toast.show(
                "Gym created successfully.",
                "success"
              );

            }


            /* ================================================
               REFRESH
               ================================================ */

            cachedGyms = [];


            Modal.close();


            await render();


          } catch (error) {

            console.error(
              "Save gym error:",
              error
            );


            errEl.textContent =
              error?.message ||
              "Failed to save gym.";


            errEl.classList.add(
              "show"
            );


            saveBtn.disabled =
              false;


            saveBtn.textContent =
              gym
                ? "Update Gym"
                : "Create Gym";

          }

        }
      );


    } catch (error) {

      console.error(
        "Open gym form error:",
        error
      );


      Toast.show(
        error?.message ||
        "Unable to open gym form.",
        "error"
      );

    }

  }


  /* ==========================================================
     DELETE GYM
     ========================================================== */

  async function deleteGym(id) {

    if (!id) {
      return;
    }


    const confirmed =
      await Confirm.ask(

        "Delete this gym permanently? " +
        "This will remove the gym and its owner login " +
        "from Google Sheets. This cannot be undone.",

        {
          danger: true,
          okLabel: "Delete Gym",
          title: "Delete gym?"
        }

      );


    if (!confirmed) {
      return;
    }


    try {

      await Api.deleteGym({

        id:
          id

      });


      Toast.show(
        "Gym deleted successfully.",
        "success"
      );


      cachedGyms = [];


      await render();


    } catch (error) {

      console.error(
        "Delete gym error:",
        error
      );


      Toast.show(
        error?.message ||
        "Failed to delete gym.",
        "error"
      );

    }

  }


  /* ==========================================================
     HTML ESCAPE
     ========================================================== */

  function escapeHTML(value) {

    return String(
      value ?? ""
    )

      .replace(
        /&/g,
        "&amp;"
      )

      .replace(
        /</g,
        "&lt;"
      )

      .replace(
        />/g,
        "&gt;"
      )

      .replace(
        /"/g,
        "&quot;"
      )

      .replace(
        /'/g,
        "&#039;"
      );

  }


  function escapeAttribute(value) {

    return escapeHTML(value);

  }


  /* ==========================================================
     START
     ========================================================== */

  await boot();

})();