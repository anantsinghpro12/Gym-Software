/* ============================================================
   GYMOS AUTH
   Persistent Token Authentication
   ------------------------------------------------------------
   Login survives:

     - page refresh
     - tab close
     - Chrome close
     - Chrome reopen
     - computer restart
     - Google Apps Script restart/re-execution

   Authentication is cleared ONLY when:

     - user explicitly logs out
     - backend explicitly revokes the token
     - account is disabled/revoked
     - local authentication data is manually removed
   ============================================================ */

const Auth = (() => {


  /* ==========================================================
     STORAGE KEYS
     ========================================================== */

  const SESSION_KEY =
    "gymos_session";

  const TOKEN_KEY =
    "gymos_token";


  const STORAGE =
    window.localStorage;


  /* ==========================================================
     SAFE STORAGE
     ========================================================== */

  function storageGet(key) {

    try {

      return STORAGE.getItem(key);

    } catch (error) {

      console.error(
        "GYMOS storage read error:",
        error
      );

      return null;

    }

  }


  function storageSet(
    key,
    value
  ) {

    try {

      STORAGE.setItem(
        key,
        value
      );

      return true;

    } catch (error) {

      console.error(
        "GYMOS storage write error:",
        error
      );

      return false;

    }

  }


  function storageRemove(key) {

    try {

      STORAGE.removeItem(key);

    } catch (error) {

      console.error(
        "GYMOS storage remove error:",
        error
      );

    }

  }


  /* ==========================================================
     GET SESSION
     ========================================================== */

  function getSession() {

    try {

      const raw =
        storageGet(
          SESSION_KEY
        );


      if (raw) {

        try {

          const session =
            JSON.parse(raw);


          if (
            session &&
            typeof session === "object"
          ) {

            return session;

          }

        } catch (error) {

          console.warn(
            "GYMOS: Invalid local session JSON."
          );

        }

      }


      /* ------------------------------------------------------
         OLD SESSION STORAGE MIGRATION
         ------------------------------------------------------ */

      try {

        const old =
          sessionStorage.getItem(
            SESSION_KEY
          );


        if (old) {

          const parsed =
            JSON.parse(old);


          if (
            parsed &&
            typeof parsed === "object"
          ) {

            storageSet(
              SESSION_KEY,
              JSON.stringify(parsed)
            );


            sessionStorage.removeItem(
              SESSION_KEY
            );


            return parsed;

          }

        }

      } catch (error) {

        console.warn(
          "GYMOS old session migration failed.",
          error
        );

      }


      return null;

    } catch (error) {

      console.error(
        "Auth.getSession error:",
        error
      );

      return null;

    }

  }


  /* ==========================================================
     GET TOKEN
     ========================================================== */

  function getToken() {

    try {

      const token =
        storageGet(
          TOKEN_KEY
        );


      if (token) {

        return token;

      }


      /* ------------------------------------------------------
         OLD SESSION STORAGE TOKEN
         ------------------------------------------------------ */

      try {

        const oldToken =
          sessionStorage.getItem(
            TOKEN_KEY
          );


        if (oldToken) {

          storageSet(
            TOKEN_KEY,
            oldToken
          );


          sessionStorage.removeItem(
            TOKEN_KEY
          );


          return oldToken;

        }

      } catch (error) {

        console.warn(
          "GYMOS old token migration failed.",
          error
        );

      }


      return "";

    } catch (error) {

      console.error(
        "Auth.getToken error:",
        error
      );

      return "";

    }

  }


  /* ==========================================================
     SAVE SESSION
     ========================================================== */

  function saveSession(
    user,
    token
  ) {

    if (!user) {

      throw new Error(
        "Invalid user session."
      );

    }


    if (!user.role) {

      throw new Error(
        "User role is missing."
      );

    }


    if (!token) {

      throw new Error(
        "Authentication token is missing."
      );

    }


    try {

      const sessionData =
        JSON.stringify(user);


      /* ------------------------------------------------------
         PERMANENT BROWSER STORAGE
         ------------------------------------------------------ */

      const sessionSaved =
        storageSet(
          SESSION_KEY,
          sessionData
        );


      if (!sessionSaved) {

        throw new Error(
          "Unable to save persistent session."
        );

      }


      const tokenSaved =
        storageSet(
          TOKEN_KEY,
          String(token)
        );


      if (!tokenSaved) {

        storageRemove(
          SESSION_KEY
        );

        throw new Error(
          "Unable to save persistent authentication token."
        );

      }


      /* ------------------------------------------------------
         Remove temporary copies
         ------------------------------------------------------ */

      try {

        sessionStorage.removeItem(
          SESSION_KEY
        );

        sessionStorage.removeItem(
          TOKEN_KEY
        );

      } catch (error) {}


      /* ------------------------------------------------------
         Verify
         ------------------------------------------------------ */

      const savedSession =
        getSession();

      const savedToken =
        getToken();


      if (
        !savedSession ||
        savedSession.role !==
          user.role ||
        !savedToken
      ) {

        throw new Error(
          "Persistent authentication could not be verified."
        );

      }


      console.log(
        "GYMOS Auth: Persistent login saved.",
        savedSession.role
      );


      /* ------------------------------------------------------
         Browser storage persistence
         ------------------------------------------------------ */

      try {

        if (
          navigator.storage &&
          typeof navigator.storage.persist ===
            "function"
        ) {

          navigator.storage.persist()
            .then(
              persistent => {

                console.log(
                  "GYMOS persistent browser storage:",
                  persistent
                );

              }
            )
            .catch(
              () => {}
            );

        }

      } catch (error) {}

    } catch (error) {

      console.error(
        "Auth.saveSession error:",
        error
      );

      throw new Error(
        error.message ||
        "Unable to save login session."
      );

    }

  }


  /* ==========================================================
     CLEAR SESSION
     ========================================================== */

  function clearSession() {

    /*
      THIS FUNCTION MUST NOT BE CALLED JUST BECAUSE:

        - server restarted
        - internet disconnected
        - API timed out
        - Google Apps Script temporarily failed

      It should be used for actual logout/revocation.
    */

    storageRemove(
      SESSION_KEY
    );

    storageRemove(
      TOKEN_KEY
    );


    try {

      sessionStorage.removeItem(
        SESSION_KEY
      );

      sessionStorage.removeItem(
        TOKEN_KEY
      );

    } catch (error) {}


    console.log(
      "GYMOS Auth: Authentication cleared."
    );

  }


  /* ==========================================================
     IS AUTHENTICATED LOCALLY
     ========================================================== */

  function isAuthenticated() {

    const session =
      getSession();

    const token =
      getToken();


    return !!(
      session &&
      session.role &&
      token
    );

  }


  /* ==========================================================
     OWNER LOGIN
     ========================================================== */

  async function loginOwner(
    email,
    password
  ) {

    if (!email) {

      throw new Error(
        "Email is required."
      );

    }


    if (!password) {

      throw new Error(
        "Password is required."
      );

    }


    if (
      typeof Api === "undefined" ||
      typeof Api.login !==
        "function"
    ) {

      throw new Error(
        "API is not defined. Load api.js before auth.js."
      );

    }


    console.log(
      "GYMOS Auth: Owner login started."
    );


    const result =
      await Api.login(
        email,
        password
      );


    if (
      !result ||
      !result.user
    ) {

      throw new Error(
        result?.message ||
        "Login failed."
      );

    }


    if (
      result.user.role !==
      "GYM_OWNER"
    ) {

      throw new Error(
        "This is not a Gym Owner account."
      );

    }


    if (!result.token) {

      throw new Error(
        "Login succeeded but server did not return an authentication token."
      );

    }


    /*
      Api.login() already saves authentication.

      Save again here only as a safety measure.
    */

    saveSession(
      result.user,
      result.token
    );


    return result;

  }


  /* ==========================================================
     SUPER ADMIN LOGIN
     ========================================================== */

  async function loginSuperadmin(
    email,
    password,
    captchaType,
    captchaCode
  ) {

    if (!email) {

      throw new Error(
        "Email is required."
      );

    }


    if (!password) {

      throw new Error(
        "Password is required."
      );

    }


    if (
      typeof Api === "undefined" ||
      typeof Api.login !==
        "function"
    ) {

      throw new Error(
        "API is not defined. Load api.js before auth.js."
      );

    }


    console.log(
      "GYMOS Auth: Super Admin login started."
    );


    const result =
      await Api.login(
        email,
        password
      );


    if (
      !result ||
      !result.user
    ) {

      throw new Error(
        result?.message ||
        "Login failed."
      );

    }


    if (
      result.user.role !==
      "SUPER_ADMIN"
    ) {

      throw new Error(
        "This is not a Super Admin account."
      );

    }


    if (!result.token) {

      throw new Error(
        "Login succeeded but server did not return an authentication token."
      );

    }


    saveSession(
      result.user,
      result.token
    );


    return result;

  }


  /* ==========================================================
     PROTECTED PAGE GUARD
     ========================================================== */

  async function guard(
    requiredRole
  ) {

    const session =
      getSession();

    const token =
      getToken();


    /* --------------------------------------------------------
       No local credentials
       -------------------------------------------------------- */

    if (
      !session ||
      !session.role ||
      !token
    ) {

      console.warn(
        "GYMOS Auth: No local authentication."
      );


      redirectToLogin(
        requiredRole
      );


      return false;

    }


    /* --------------------------------------------------------
       Role check
       -------------------------------------------------------- */

    if (
      requiredRole &&
      session.role !==
        requiredRole
    ) {

      console.warn(
        "GYMOS Auth: Wrong role.",
        {
          expected:
            requiredRole,

          actual:
            session.role
        }
      );


      /*
        Wrong local role is a genuine local
        authentication problem.
      */

      clearSession();


      redirectToLogin(
        requiredRole
      );


      return false;

    }


    console.log(
      "GYMOS Auth: Persistent credentials found.",
      session.role
    );


    return true;

  }


  /* ==========================================================
     REDIRECT HELPER
     ========================================================== */

  function redirectToLogin(
    requiredRole
  ) {

    if (
      requiredRole ===
      "SUPER_ADMIN"
    ) {

      window.location.replace(
        "sapower-jio.html"
      );

    } else {

      window.location.replace(
        "login.html"
      );

    }

  }


  /* ==========================================================
     LOGIN PAGE GUARD
     ========================================================== */

  async function guardLoggedOut() {

    const session =
      getSession();

    const token =
      getToken();


    if (
      !session ||
      !session.role ||
      !token
    ) {

      return false;

    }


    if (
      session.role ===
      "SUPER_ADMIN"
    ) {

      window.location.replace(
        "superadmin.html"
      );


      return true;

    }


    if (
      session.role ===
      "GYM_OWNER"
    ) {

      window.location.replace(
        "dashboard.html"
      );


      return true;

    }


    clearSession();


    return false;

  }


  /* ==========================================================
     LOGOUT
     ========================================================== */

  async function logout(
    redirect
  ) {

    console.log(
      "GYMOS Auth: Explicit logout requested."
    );


    /*
      Try server logout.

      Failure here MUST NOT prevent local logout.
    */

    try {

      if (
        typeof Api !== "undefined" &&
        typeof Api.logout ===
          "function"
      ) {

        await Api.logout();

      }

    } catch (error) {

      console.warn(
        "GYMOS server logout failed. Continuing local logout.",
        error
      );

    }


    /*
      THIS is where credentials are intentionally
      destroyed.
    */

    clearSession();


    window.location.replace(
      redirect ||
      "login.html"
    );

  }


  /* ==========================================================
     PUBLIC API
     ========================================================== */

  return {

    loginOwner:
      loginOwner,

    loginSuperadmin:
      loginSuperadmin,

    getSession:
      getSession,

    getToken:
      getToken,

    session:
      getSession,

    token:
      getToken,

    isAuthenticated:
      isAuthenticated,

    guard:
      guard,

    guardLoggedOut:
      guardLoggedOut,

    logout:
      logout,

    saveSession:
      saveSession,

    clearSession:
      clearSession

  };

})();