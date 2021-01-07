const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const { callService } = require('./client');
const {
  newHealthCertificate,
  addPatientData,
  addPractitionerData
} = require('./healthCertificate');
const {
  buildIssuecertaRequest,
  buildVerifycertaRequest,
  proofFromResponse
} = require('./builders');
const { parseCertificatePem, getCertificateSerialNbr } = require('./parsers');

async function create(healthCertFile, opts) {
  // console.log(opts);
  const vc = newHealthCertificate(opts);
  const vcStr = JSON.stringify(vc, null, 2);
  await fs.writeFile(healthCertFile, vcStr);
}

async function addPatient(healthCertFile, { photo, ...patientData }) {
  const vcStrIn = await fs.readFile(healthCertFile);
  const vc = JSON.parse(vcStrIn);

  patientData.photo = await Promise.all(
    photo.map(async (p) => {
      const img = await loadImage(p);
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      return canvas.toDataURL();
    })
  );

  addPatientData(vc, patientData);
  const vcStrOut = JSON.stringify(vc, null, 2);
  await fs.writeFile(healthCertFile, vcStrOut);
}

async function addPractitioner(healthCertFile, { ...practitionerData }) {
  const vcStrIn = await fs.readFile(healthCertFile);
  const vc = JSON.parse(vcStrIn);
  addPractitionerData(vc, practitionerData);
  const vcStrOut = JSON.stringify(vc, null, 2);
  await fs.writeFile(healthCertFile, vcStrOut);
}

async function sign(healthCertFile, { issuer, digitalpenId, ...credentials }) {
  const vcStrIn = fs.readFileSync(healthCertFile);
  const vc = JSON.parse(vcStrIn);
  if (vc.proof) {
    throw new Error('Health certificate has been already signed');
  }

  if (!issuer && !digitalpenId) {
    throw 'One of {issuer, digitalpenId} is expected';
  }

  let serialNbr;
  if (digitalpenId) {
    serialNbr = digitalpenId;
  } else {
    const certPem = fs.readFileSync(issuer).toString();
    const cert = parseCertificatePem(certPem);
    serialNbr = getCertificateSerialNbr(cert);
  }
  serialNbr = serialNbr.padStart(40, '0');
  vc.issuanceDate = new Date().toISOString();

  // Do not modify vc beyond this point, otherwise its digest will be different when trying to verify
  const signRequest = await buildIssuecertaRequest(vc, serialNbr);
  // console.log("Request", signRequest);

  try {
    const signResponse = await callService(
      '/certas/v1/issueCerta',
      signRequest,
      credentials
    );
    vc.proof = proofFromResponse(signResponse.proof);

    const vcStrOut = JSON.stringify(vc, null, 2);
    fs.writeFileSync(healthCertFile, vcStrOut);
    console.log('Signed');
  } catch (err) {
    throw err;
  }
}

async function validate(healthCertFile, credentials) {
  const vcStrIn = fs.readFileSync(healthCertFile);
  const vc = JSON.parse(vcStrIn);
  if (!vc.proof) {
    throw new Error('Health certificate has not been signed');
  }

  const verifyRequest = await buildVerifycertaRequest(vc);
  // console.log("Request", verifyRequest);

  try {
    const verifyResponse = await callService(
      '/certas/v1/validateCerta',
      verifyRequest,
      credentials
    );
    console.log(verifyResponse);
  } catch (err) {
    throw err;
  }
}

module.exports = { create, addPatient, addPractitioner, sign, validate };
