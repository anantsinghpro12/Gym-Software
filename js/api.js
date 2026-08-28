/* ============================================================
   GYMOS API CLIENT
   Google Apps Script Backend
   Persistent Authentication
   ============================================================ */

const GYMOS_CONFIG = {

  API_URL:
    "https://script.google.com/macros/s/AKfycbz2Hatwl913sy-GrlDL5vlmYNtWy3-2wy-TRlywYlTt8qGjWM535Dvad6yC6r9l40Y/exec"

};


/* ============================================================
   API
   ============================================================ */

const Api = (() => {


  /* ==========================================================
     STORAGE KEYS
     ========================================================== */

  const SESSION_KEY =
    "gymos_session";

  const TOKEN_KEY =
    "gymos_token";


  /* ==========================================================
     SAFE LOCAL STORAGE
     ========================================================== */

  function storageGet(key) {

    try {

      return localStorage.getItem(key);

    } catch (error) {

      console.error(
        "GYMOS localStorage read error:",
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

      localStorage.setItem(
        key,
        value
      );

      return true;

    } catch (error) {

      console.error(
        "GYMOS localStorage write error:",
        error
      );

      return false;

    }

  }


  function storageRemove(key) {

    try {

      localStorage.removeItem(key);

    } catch (error) {

      console.error(
        "GYMOS localStorage remove error:",
        error
      );

    }

  }


  /* ==========================================================
     SESSION
     ========================================================== */

  function getSession() {

    try {

      const persistent =
        storageGet(
          SESSION_KEY
        );


      if (persistent) {

        try {

          const parsed =
            JSON.parse(
              persistent
            );

          if (
            parsed &&
            typeof parsed === "object"
          ) {

            return parsed;

          }

        } catch (error) {

          console.warn(
            "GYMOS: Corrupt persistent session."
          );

        }

      }


      /* ------------------------------------------------------
         OLD SESSION STORAGE MIGRATION
         ------------------------------------------------------ */

      try {

        const oldSession =
          sessionStorage.getItem(
            SESSION_KEY
          );


        if (oldSession) {

          const parsed =
            JSON.parse(
              oldSession
            );


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
          "GYMOS: Old session migration failed.",
          error
        );

      }


      return null;

    } catch (error) {

      console.error(
        "GYMOS getSession error:",
        error
      );

      return null;

    }

  }


  /* ==========================================================
     TOKEN
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
         OLD SESSION STORAGE TOKEN MIGRATION
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
          "GYMOS: Old token migration failed."
        );

      }


      return "";

    } catch (error) {

      console.error(
        "GYMOS getToken error:",
        error
      );

      return "";

    }

  }


  /* ==========================================================
     SAVE AUTHENTICATION
     ========================================================== */

  function saveAuthentication(
    user,
    token
  ) {

    if (!user) {

      throw new Error(
        "Cannot save authentication without user."
      );

    }


    if (!token) {

      throw new Error(
        "Cannot save authentication without token."
      );

    }


    const sessionJson =
      JSON.stringify(user);


    if (
      !storageSet(
        SESSION_KEY,
        sessionJson
      )
    ) {

      throw new Error(
        "Unable to save persistent session."
      );

    }


    if (
      !storageSet(
        TOKEN_KEY,
        String(token)
      )
    ) {

      throw new Error(
        "Unable to save persistent authentication token."
      );

    }


    /* --------------------------------------------------------
       Remove old temporary copies
       -------------------------------------------------------- */

    try {

      sessionStorage.removeItem(
        SESSION_KEY
      );

      sessionStorage.removeItem(
        TOKEN_KEY
      );

    } catch (error) {}


    console.log(
      "GYMOS API: Persistent authentication saved."
    );


    /* --------------------------------------------------------
       Ask browser to protect site storage from eviction
       -------------------------------------------------------- */

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
                "GYMOS storage persistence:",
                persistent
              );

            }
          )
          .catch(
            () => {}
          );

      }

    } catch (error) {}


  }


  /* ==========================================================
     CLEAR AUTHENTICATION
     ========================================================== */

  function clearAuthentication() {

    console.warn(
      "GYMOS API: Clearing authentication."
    );


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

  }


  /* ==========================================================
     MAIN API CALL
     ========================================================== */

  async function call(
    action,
    data = {}
  ) {

    const token =
      getToken();


    const payload = {

      action:
        action,

      token:
        token,

      data:
        data,

      email:
        data?.email ||
        "",

      password:
        data?.password ||
        "",

      type:
        data?.type ||
        "",

      records:
        data?.records !== undefined
          ? data.records
          : undefined

    };


    let response;


    /* ========================================================
       NETWORK REQUEST
       ======================================================== */

    try {

      response =
        await fetch(
          GYMOS_CONFIG.API_URL,
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "text/plain;charset=utf-8"

            },

            body:
              JSON.stringify(
                payload
              ),

            redirect:
              "follow"

          }
        );

    } catch (error) {

      console.error(
        "GYMOS API network error:",
        error
      );


      /*
        IMPORTANT:

        DO NOT clear localStorage here.

        Network failure does NOT mean
        authentication has expired.
      */

      throw new Error(
        "Cannot connect to GymOS server. Please check your internet connection or server."
      );

    }


    /* ========================================================
       HTTP ERROR
       ======================================================== */

    if (!response.ok) {

      /*
        IMPORTANT:

        Server HTTP failure does NOT automatically
        mean that the login token is invalid.
      */

      throw new Error(
        "GymOS server error: HTTP " +
        response.status
      );

    }


    /* ========================================================
       JSON
       ======================================================== */

    let json;


    try {

      json =
        await response.json();

    } catch (error) {

      console.error(
        "GYMOS invalid JSON response:",
        error
      );


      /*
        DO NOT CLEAR LOGIN HERE.
      */

      throw new Error(
        "Invalid response from GymOS server."
      );

    }


    console.log(
      "GYMOS API:",
      action,
      json
    );


    /* ========================================================
       AUTHENTICATION RESPONSE
       ======================================================== */

    if (!json) {

      throw new Error(
        "Empty response from GymOS server."
      );

    }


    /*
      VERY IMPORTANT

      Only clear local authentication when
      backend explicitly returns a permanent
      authentication rejection.

      A server restart/network error must NOT
      delete localStorage.
    */

    const authenticationRevoked =
      (
        json.code ===
          "AUTH_REVOKED"
      ) ||
      (
        json.code ===
          "TOKEN_REVOKED"
      ) ||
      (
        json.code ===
          "ACCOUNT_DISABLED"
      );


    if (
      authenticationRevoked
    ) {

      clearAuthentication();


      throw new Error(
        json.error ||
        json.message ||
        "Your authentication has been revoked."
      );

    }


    /* ========================================================
       API ERROR
       ======================================================== */

    if (
      json.success === false
    ) {

      throw new Error(
        json.error ||
        json.message ||
        "API Error"
      );

    }


    /*
      Some backend responses may not include
      success=true but still return data.

      Preserve compatibility.
    */

    if (
      json.success !== true &&
      json.data === undefined
    ) {

      throw new Error(
        json.error ||
        json.message ||
        "Unexpected response from GymOS server."
      );

    }


    return json.data;

  }


  /* ==========================================================
     GET
     ========================================================== */

  async function get(url) {

    const type =
      String(url || "")
        .split("/")
        .filter(Boolean)
        .pop() ||
      "";


    return call(
      "getData",
      {

        type:
          type

      }
    );

  }


  /* ==========================================================
     PUT
     ========================================================== */

  async function put(
    url,
    records
  ) {

    const type =
      String(url || "")
        .split("/")
        .filter(Boolean)
        .pop() ||
      "";


    return call(
      "putData",
      {

        type:
          type,

        records:
          records

      }
    );

  }


  /* ==========================================================
     POST
     ========================================================== */

  async function post(
    url,
    body
  ) {

    return call(
      "create",
      body || {}
    );

  }


  /* ==========================================================
     DELETE
     ========================================================== */

  async function del(
    url,
    body
  ) {

    return call(
      "delete",
      body || {}
    );

  }


  /* ==========================================================
     LOGIN
     ========================================================== */

  async function login(
    email,
    password
  ) {

    const result =
      await call(
        "login",
        {

          email:
            email,

          password:
            password

        }
      );


    /*
      Login response normally:

      {
        user: {...},
        token: "..."
      }
    */

    if (
      result &&
      result.user &&
      result.token
    ) {

      saveAuthentication(
        result.user,
        result.token
      );

    }


    return result;

  }


  /* ==========================================================
     SERVER SESSION
     ========================================================== */

  async function getSessionFromServer() {

    return call(
      "getSession"
    );

  }


  /* ==========================================================
     PROFILE
     ========================================================== */

  async function getProfile() {

    return call(
      "getProfile"
    );

  }


  /* ==========================================================
     CHANGE PASSWORD
     ========================================================== */

  async function changePassword(
    newPassword
  ) {

    return call(
      "changePassword",
      {

        password:
          newPassword

      }
    );

  }


  /* ==========================================================
     LOGOUT API
     ========================================================== */

  async function logout() {

    /*
      IMPORTANT:

      This action is called only when the user
      explicitly logs out.

      It does NOT happen automatically on
      server restart.
    */

    return call(
      "logout"
    );

  }


  /* ==========================================================
     SUPER ADMIN — GET GYMS
     ========================================================== */

  async function getGyms() {

    const result =
      await call(
        "getGyms"
      );


    if (
      !Array.isArray(result)
    ) {

      return [];

    }


    return result.map(
      gym => ({

        id:
          gym.gym_id ||
          gym.id ||
          "",

        gymId:
          gym.gym_id ||
          "",

        gymCode:
          gym.gym_code ||
          "",

        name:
          gym.gym_name ||
          gym.name ||
          "Unnamed Gym",

        ownerUserId:
          gym.owner_user_id ||
          "",

        ownerEmail:
          gym.email ||
          gym.ownerEmail ||
          "",

        phone:
          gym.phone ||
          "",

        address:
          gym.address ||
          "",

        city:
          gym.city ||
          "",

        state:
          gym.state ||
          "",

        country:
          gym.country ||
          "India",

        plan:
          gym.plan ||
          "BASIC",

        currency:
          gym.currency ||
          "INR",

        dateFormat:
          gym.date_format ||
          gym.dateFormat ||
          "DD MMM YYYY",

        status:
          gym.status ||
          "ACTIVE",

        created:
          gym.created_at ||
          gym.created ||
          "",

        updated:
          gym.updated_at ||
          gym.updated ||
          "",

        hasPassword:
          gym.hasPassword === true ||
          gym.has_password === true ||
          String(
            gym.hasPassword ||
            ""
          ).toLowerCase() ===
            "true" ||
          String(
            gym.has_password ||
            ""
          ).toLowerCase() ===
            "true"

      })
    );

  }


  /* ==========================================================
     CREATE GYM
     ========================================================== */

  async function createGym(data) {

    return call(
      "createGym",
      data || {}
    );

  }


  /* ==========================================================
     UPDATE GYM
     ========================================================== */

  async function updateGym(data) {

    return call(
      "updateGym",
      data || {}
    );

  }


  /* ==========================================================
     DELETE GYM
     ========================================================== */

  async function deleteGym(data) {

    return call(
      "deleteGym",
      data || {}
    );

  }


  /* ==========================================================
     PUBLIC API
     ========================================================== */

  return {

    get:
      get,

    post:
      post,

    put:
      put,

    del:
      del,

    call:
      call,

    login:
      login,

    logout:
      logout,

    getSession:
      getSessionFromServer,

    getProfile:
      getProfile,

    changePassword:
      changePassword,

    getGyms:
      getGyms,

    createGym:
      createGym,

    updateGym:
      updateGym,

    deleteGym:
      deleteGym,

    session:
      getSession,

    token:
      getToken,

    gymId:
      () => {

        const s =
          getSession();

        return (
          s?.gym_id ||
          s?.gymId ||
          ""
        );

      },

    saveAuthentication:
      saveAuthentication,

    clearAuthentication:
      clearAuthentication

  };

})();


/* ============================================================
   COMPATIBILITY ALIAS
   ============================================================ */

window.API = Api;