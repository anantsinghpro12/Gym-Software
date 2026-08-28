(async () => {

  /* =========================================================
     CAPTCHA
     ========================================================= */

  const CAPTCHA_CHARS =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

  let captchaCode = "";


  function rand(min, max) {

    return Math.floor(
      Math.random() *
        (max - min + 1)
    ) + min;

  }


  function generateCaptchaCode() {

    let code = "";

    for (let i = 0; i < 6; i++) {

      code +=
        CAPTCHA_CHARS.charAt(
          rand(
            0,
            CAPTCHA_CHARS.length - 1
          )
        );

    }

    return code;

  }


  function drawCaptcha(canvas) {

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    const w = canvas.width;
    const h = canvas.height;

    captchaCode =
      generateCaptchaCode();


    /* Background */

    const grad =
      ctx.createLinearGradient(
        0,
        0,
        w,
        h
      );

    grad.addColorStop(
      0,
      "#eef2ff"
    );

    grad.addColorStop(
      0.5,
      "#f0f9ff"
    );

    grad.addColorStop(
      1,
      "#fdf4ff"
    );

    ctx.fillStyle = grad;

    ctx.fillRect(
      0,
      0,
      w,
      h
    );


    /* Noise */

    for (let i = 0; i < 40; i++) {

      ctx.fillStyle =
        `rgba(
          ${rand(100, 200)},
          ${rand(100, 200)},
          ${rand(100, 200)},
          0.25
        )`;

      ctx.beginPath();

      ctx.arc(
        rand(0, w),
        rand(0, h),
        rand(1, 2),
        0,
        Math.PI * 2
      );

      ctx.fill();

    }


    /* Curves */

    for (let i = 0; i < 5; i++) {

      ctx.strokeStyle =
        `rgba(
          ${rand(80, 180)},
          ${rand(80, 180)},
          ${rand(80, 180)},
          0.45
        )`;

      ctx.lineWidth =
        rand(1, 2);

      ctx.beginPath();

      ctx.moveTo(
        rand(0, w * 0.2),
        rand(0, h)
      );

      ctx.bezierCurveTo(
        rand(w * 0.3, w * 0.5),
        rand(0, h),

        rand(w * 0.5, w * 0.7),
        rand(0, h),

        rand(w * 0.8, w),
        rand(0, h)
      );

      ctx.stroke();

    }


    /* Characters */

    const colors = [
      "#e11d48",
      "#7c3aed",
      "#ea580c",
      "#059669",
      "#2563eb",
      "#db2777",
      "#ca8a04"
    ];

    const charW =
      w / 6.5;

    const baseX = 10;
    const baseY =
      h / 2 + 6;


    for (let i = 0; i < 6; i++) {

      ctx.save();

      const x =
        baseX +
        i * charW +
        rand(-2, 2);

      const y =
        baseY +
        rand(-6, 6);

      ctx.translate(
        x,
        y
      );

      ctx.rotate(
        (rand(-18, 18) *
          Math.PI) /
        180
      );

      ctx.font =
        `bold ${rand(
          22,
          28
        )}px "Segoe UI", system-ui, sans-serif`;

      ctx.fillStyle =
        colors[
          rand(
            0,
            colors.length - 1
          )
        ];

      ctx.textBaseline =
        "middle";

      ctx.fillText(
        captchaCode[i],
        0,
        0
      );

      ctx.restore();

    }


    /* Horizontal lines */

    for (let i = 0; i < 3; i++) {

      ctx.strokeStyle =
        "rgba(60,60,100,0.3)";

      ctx.lineWidth = 1;

      ctx.beginPath();

      ctx.moveTo(
        0,
        rand(8, h - 8)
      );

      ctx.lineTo(
        w,
        rand(8, h - 8)
      );

      ctx.stroke();

    }

  }


  /* =========================================================
     ERROR
     ========================================================= */

  function showError(
    errEl,
    message
  ) {

    if (!errEl) return;

    errEl.textContent =
      message;

    errEl.classList.add(
      "show"
    );

  }


  /* =========================================================
     MOUNT
     ========================================================= */

  async function mount() {

    const canvas =
      document.getElementById(
        "captcha"
      );

    const form =
      document.getElementById(
        "sa-form"
      );

    const errEl =
      document.getElementById(
        "err"
      );

    const btn =
      document.getElementById(
        "submit-btn"
      );

    const captchaInput =
      document.getElementById(
        "captcha-input"
      );


    if (!canvas || !form) {

      console.error(
        "Super Admin login elements not found."
      );

      return;

    }


    drawCaptcha(
      canvas
    );


    /* CAPTCHA refresh */

    document
      .getElementById(
        "captcha-refresh"
      )
      ?.addEventListener(
        "click",
        () => {

          drawCaptcha(
            canvas
          );

          captchaInput.value =
            "";

          errEl.classList.remove(
            "show"
          );

        }
      );


    /* Password toggle */

    document
      .getElementById(
        "pw-toggle"
      )
      ?.addEventListener(
        "click",
        () => {

          const pw =
            document.getElementById(
              "password"
            );

          if (!pw) return;

          pw.type =
            pw.type === "password"
              ? "text"
              : "password";

        }
      );


    /* =======================================================
       LOGIN
       ======================================================= */

    form.addEventListener(
      "submit",
      async (e) => {

        e.preventDefault();


        errEl.classList.remove(
          "show"
        );


        const email =
          document
            .getElementById(
              "email"
            )
            .value
            .trim()
            .toLowerCase();


        const password =
          document
            .getElementById(
              "password"
            )
            .value;


        const enteredCaptcha =
          captchaInput
            .value
            .trim();


        /* CAPTCHA */

        if (
          enteredCaptcha !==
          captchaCode
        ) {

          showError(
            errEl,
            "Incorrect security code. Please try again."
          );

          captchaInput.value =
            "";

          drawCaptcha(
            canvas
          );

          captchaInput.focus();

          return;

        }


        /* Button */

        btn.disabled = true;

        btn.textContent =
          "Signing in…";


        try {

          console.log(
            "Super Admin login..."
          );


          /* Login */

          await Auth.loginSuperadmin(
            email,
            password,
            "client-captcha",
            captchaCode
          );


          /*
           * IMPORTANT:
           * Verify the session before redirect.
           */

          const session =
            Auth.getSession();


          console.log(
            "Saved session:",
            session
          );


          if (
            !session ||
            session.role !==
            "SUPER_ADMIN"
          ) {

            throw new Error(
              "Login succeeded, but the Super Admin session was not saved."
            );

          }


          /*
           * Small delay to make sure
           * storage is committed.
           */

          await new Promise(
            resolve =>
              setTimeout(
                resolve,
                200
              )
          );


          /*
           * FINAL REDIRECT
           */

          window.location.replace(
            "superadmin.html"
          );


        } catch (err) {

          console.error(
            "Super Admin login error:",
            err
          );


          showError(
            errEl,
            err?.message ||
            "Invalid email or password."
          );


          captchaInput.value =
            "";

          drawCaptcha(
            canvas
          );


          btn.disabled =
            false;

          btn.textContent =
            "Verify & Continue →";

        }

      }
    );

  }


  /* =========================================================
     CHECK IF ALREADY LOGGED IN
     ========================================================= */

  try {

    const loggedIn =
      await Auth.guardLoggedOut();

    if (loggedIn) {
      return;
    }

  } catch (error) {

    console.warn(
      "guardLoggedOut failed:",
      error
    );

  }


  /* START */

  await mount();

})();