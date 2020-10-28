const axios = require("axios");
const fs = require("fs");
const { API_BASE_URL } = require("./constants");
const {
  buildSignDigitalpenRequest,
  buildCreateCSRRequest
} = require("./builders");

async function create(csrFile, { orgId, cn, country, org, email }) {
  const request = buildCreateCSRRequest(orgId, cn, country, org, email);

  try {
    const res = await axios.post(
      `${API_BASE_URL}/certas/v1/createCSR`,
      request
    );

    const pem = res.data.csr_pem;
    fs.writeFileSync(csrFile, pem);
    console.log("SAVED", csrFile);
  } catch (err) {
    console.log(err.response);
    throw err.response.data;
  }
}

async function sign(certFile, { csrFile }) {
  try {
    const csrPem = fs.readFileSync(csrFile).toString("ascii");
    // const csr = forge.pki.certificationRequestFromPem(csrPem);
    const req = buildSignDigitalpenRequest(csrPem, ORG_NAME);
    // console.log(req);
    const res = await axios.post(
      `${API_BASE_URL}/certas/v1/signupDigitalpen`,
      req
    );
    var certPem = res.data.cert_pem;
    console.log("CERTIFICATE", certPem);
    fs.writeFileSync(certFile, certPem);
  } catch (err) {
    console.log(err.response);
    throw err.response.data;
  }
}

function compareKeys(k1, k2) {
  const n1 = k1.n;
  const n2 = k2.n;
  const nEq = n1.toString() === n2.toString();
  const e1 = k1.e;
  const e2 = k2.e;
  const eEq = e1.toString() === e2.toString();
  return nEq && eEq;
}

module.exports = { create, sign, compareKeys };
