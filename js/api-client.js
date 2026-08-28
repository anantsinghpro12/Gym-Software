/* ============================================================
   GYMOS API CLIENT
   Central API layer
   Uses sessionStorage:
   - gymos_session
   - gymos_token
   ============================================================ */

const Api = (() => {

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem('gymos_session') || 'null');
    } catch {
      return null;
    }
  }

  function getToken() {
    return sessionStorage.getItem('gymos_token') || '';
  }

  function getGymId() {
    const s = getSession();
    return s?.gym_id || s?.gymId || '';
  }

  async function req(method, url, body) {

    const session = getSession();
    const token = getToken();
    const gym_id = getGymId();

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    /*
      Send authentication information.
      Backend should use token/session as the source of truth.
    */
    const payload = body !== undefined
      ? body
      : undefined;

    let finalUrl = url;

    /*
      If your API is a relative /api/data/... endpoint,
      keep it exactly as-is.
    */
    const opts = {
      method,
      headers,
      credentials: 'include'
    };

    if (payload !== undefined) {
      opts.body = JSON.stringify({
        ...payload,

        // Compatibility fields.
        // Server MUST still validate these from the token.
        token,
        gym_id,
        user_id: session?.user_id || '',
        role: session?.role || '',
        email: session?.email || ''
      });
    }

    /*
      GET requests also need auth information.
    */
    if (method === 'GET') {
      const params = new URLSearchParams();

      if (token) params.set('token', token);
      if (session?.user_id) params.set('user_id', session.user_id);
      if (gym_id) params.set('gym_id', gym_id);
      if (session?.role) params.set('role', session.role);

      if (params.toString()) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + params.toString();
      }
    }

    let res;

    try {
      res = await fetch(finalUrl, opts);
    } catch (err) {
      console.error('GYMOS API NETWORK ERROR:', err);
      throw new Error(
        'Cannot connect to GymOS API.'
      );
    }

    let data;

    try {
      data = await res.json();
    } catch {
      data = {};
    }

    console.log(
      `[GYMOS API] ${method} ${finalUrl}`,
      res.status,
      data
    );

    if (!res.ok) {
      throw Object.assign(
        new Error(
          data.error ||
          data.message ||
          `Request failed: ${res.status}`
        ),
        {
          status: res.status,
          data
        }
      );
    }

    /*
      Handle APIs returning:
      {data:[...]}
      {data:{...}}
      [...]
    */
    if (
      data &&
      Object.prototype.hasOwnProperty.call(data, 'data')
    ) {
      return data.data;
    }

    return data;
  }

  return {

    get: url =>
      req('GET', url),

    post: (url, body) =>
      req('POST', url, body),

    put: (url, body) =>
      req('PUT', url, body),

    del: (url, body) =>
      req('DELETE', url, body),

    session: getSession,

    token: getToken,

    gymId: getGymId
  };

})();