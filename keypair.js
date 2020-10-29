const fs = require("fs");
const { buildCreateKeyRequest } = require("./builders");
const { callService } = require("./client");

async function create(keyName, { orgId, ...credentials }) {
  const keyRequest = buildCreateKeyRequest(orgId);

  try {
    const key = await callService(
      "/certas/v1/createPrivateKey",
      keyRequest,
      credentials
    );

    const publicKeyResponse = await callService(
      "/certas/v1/getPublicKey",
      key,
      credentials
    );

    const publicKeyPem = publicKeyResponse.public_key_pem;
    const keyFile = `${keyName}.pem`;
    fs.writeFileSync(keyFile, publicKeyPem);
    console.log("SAVED", keyFile);
  } catch (err) {
    throw err;
  }
}

module.exports = { create };
