const fs = require("fs");
const axios = require("axios");
const forge = require("node-forge");
const { createCanvas, loadImage } = require("canvas");
const {
  newHealthCertificate,
  addPatientData,
  addPractitionerData,
} = require("./healthCertificate");
const {
  buildIssuecertaRequest,
  buildVerifycertaRequest,
  proofFromResponse,
} = require("./builders");
const { parseCertificatePem, getCertificateSerialNbr } = require("./parsers");

// const API_BASE_URL = "https://api.magnacerta.com";
const API_BASE_URL = "http://localhost:11000";

async function create(healthCertFile, opts) {
  // console.log(opts);
  const vc = newHealthCertificate(opts);
  const vcStr = JSON.stringify(vc, null, 2);
  fs.writeFileSync(healthCertFile, vcStr);
}

async function addPatient(healthCertFile, { photo, ...patientData }) {
  const vcStrIn = fs.readFileSync(healthCertFile);
  const vc = JSON.parse(vcStrIn);
  const img = await loadImage(photo[0]);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  patientData.photo = [canvas.toDataURL()];
  addPatientData(vc, patientData);
  const vcStrOut = JSON.stringify(vc, null, 2);
  fs.writeFileSync(healthCertFile, vcStrOut);
}

async function addPractitioner(healthCertFile, { ...practitionerData }) {
  const vcStrIn = fs.readFileSync(healthCertFile);
  const vc = JSON.parse(vcStrIn);
  addPractitionerData(vc, practitionerData);
  const vcStrOut = JSON.stringify(vc, null, 2);
  fs.writeFileSync(healthCertFile, vcStrOut);
}

async function sign(healthCertFile, { issuer }) {
  const vcStrIn = fs.readFileSync(healthCertFile);
  const vc = JSON.parse(vcStrIn);
  if (vc.proof) {
    throw new Error("Health certificate has been already signed");
  }

  const certPem = fs.readFileSync(issuer).toString();
  const cert = parseCertificatePem(certPem);
  const serialNbr = getCertificateSerialNbr(cert);
  vc.issuanceDate = new Date().toISOString();

  // Do not modify vc beyond this point, otherwise its digest will be different when trying to verify
  const signRequest = await buildIssuecertaRequest(vc, serialNbr);
  // console.log("Request", signRequest);

  try {
    const signResponse = await axios.post(
      `${API_BASE_URL}/certas/v1/issueCerta`,
      signRequest
    );
    vc.proof = proofFromResponse(signResponse.data.proof);

    const vcStrOut = JSON.stringify(vc, null, 2);
    fs.writeFileSync(healthCertFile, vcStrOut);
  } catch (err) {
    console.log(err.response);
    throw err.response.data;
  }
}

async function validate(healthCertFile) {
  const vcStrIn = fs.readFileSync(healthCertFile);
  const vc = JSON.parse(vcStrIn);
  if (!vc.proof) {
    throw new Error("Health certificate has not been signed");
  }

  const verifyRequest = await buildVerifycertaRequest(vc);
  // console.log("Request", verifyRequest);

  try {
    const verifyResponse = await axios.post(
      `${API_BASE_URL}/certas/v1/validateCerta`,
      verifyRequest
    );
    console.log(verifyResponse.data);
  } catch (err) {
    console.log(err.response.data);
  }
}

module.exports = { create, addPatient, addPractitioner, sign, validate };
