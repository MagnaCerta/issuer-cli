const axios = require("axios");
const querystring = require("querystring");
const { API_BASE_URL, TOKEN_URL } = require("./constants");

async function getToken(username, password) {
  const tokenData = {
    grant_type: "password",
    scope: "openid",
    client_id: "digital-pen-app",
    username,
    password,
  };

  try {
    return axios
      .post(TOKEN_URL, querystring.stringify(tokenData))
      .then((response) => {
        const token = response.data.access_token;
        return token;
      });
  } catch (err) {
    console.log(err);
    throw err.response.data;
  }
}

async function callService(path, request, credentials) {
  const requestOpts = {};
  if (credentials) {
    const { token, username, password } = credentials;
    if (token || (username && password)) {
      const authToken = token || (await getToken(username, password));
      requestOpts.headers = { Authorization: "Bearer " + authToken };
      console.log(requestOpts);
    }
  }

  return axios.post(API_BASE_URL + path, request, requestOpts);
}

module.exports = { getToken, callService };
