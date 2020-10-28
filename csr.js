const axios = require("axios");
const fs = require("fs");
const { API_BASE_URL } = require("./constants");
const { buildSignCSRRequest, buildCreateCSRRequest } = require("./builders");

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
    throw err.response.data;
  }
}

async function sign(certFile, { csrFile, orgId }) {
  try {
    const csrPem = fs.readFileSync(csrFile).toString("ascii");
    const req = buildSignCSRRequest(csrPem, orgId);
    // console.log(req);
    const res = await axios.post(`${API_BASE_URL}/certas/v1/signCSR`, req);
    var certPem = res.data.cert_pem;
    console.log("CERTIFICATE", certPem);
    fs.writeFileSync(certFile, certPem);
    console.log("SAVED", certFile);
  } catch (err) {
    throw err.response.data;
  }
}

module.exports = { create, sign };
