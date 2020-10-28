const fs = require("fs");
const axios = require("axios");
const { buildCreateKeyRequest } = require("./builders");
const { API_BASE_URL } = require("./constants");

async function create(keyName, { orgId }) {
  const keyRequest = buildCreateKeyRequest(orgId);

  try {
    const keyResponse = await axios.post(
      `${API_BASE_URL}/certas/v1/createPrivateKey`,
      keyRequest
    );

    const key = keyResponse.data;
    const publicKeyResponse = await axios.post(
      `${API_BASE_URL}/certas/v1/getPublicKey`,
      key
    );

    const publicKeyPem = publicKeyResponse.data.public_key_pem;
    const keyFile = `${keyName}.pem`;
    fs.writeFileSync(keyFile, publicKeyPem);
    console.log("SAVED", keyFile);
  } catch (err) {
    console.log(err.response);
    throw err.response.data;
  }
}

module.exports = { create };
