const fs = require('fs');
const { buildSignCSRRequest, buildCreateCSRRequest } = require('./builders');
const { callService } = require('./client');

async function create(
  csrFile,
  { orgId, cn, country, org, email, ...credentials }
) {
  const request = buildCreateCSRRequest(orgId, cn, country, org, email);

  try {
    const res = await callService('/certas/v1/createCSR', request, credentials);
    const pem = res.csr_pem;
    await fs.writeFile(csrFile, pem);
    console.log('SAVED', csrFile);
  } catch (err) {
    throw err;
  }
}

async function sign(
  certFile,
  { csrFile, orgId, expiresInDays, ...credentials }
) {
  try {
    const csrPem = await fs.readFile(csrFile).toString('ascii');
    const request = buildSignCSRRequest(csrPem, orgId, expiresInDays);
    // console.log(request);
    const res = await callService('/certas/v1/signCSR', request, credentials);
    const certPem = res.cert_pem;
    console.log('CERTIFICATE', certPem);
    await fs.writeFile(certFile, certPem);
    console.log('SAVED', certFile);
  } catch (err) {
    throw err;
  }
}

module.exports = { create, sign };
