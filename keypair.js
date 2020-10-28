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

    const keyPem = publicKeyResponse.data.public_key_pem;
    save(keyName, keyPem);
  } catch (err) {
    console.log(err.response);
    throw err.response.data;
  }
}

function save(keyName, publicKeyPem) {
  fs.writeFileSync(`${keyName}.pem`, publicKeyPem);
}

function load(keyName) {
  const publicKeyPem = fs.readFileSync(`${keyName}.pem`);
  return { publicKeyPem };
  // const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
  // return { publicKey, publicKeyPem };
}

module.exports = { create, save, load };
