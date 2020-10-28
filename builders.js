const { createCredentialDigest } = require("./digest");
const { customLoader } = require("./documentloaders");

function buildCreateKeyRequest(org_id) {
  return {
    algorithm: {
      algorithm: 2, // ECDSA
      options: {
        Curve: "SECP256R1",
        Hash: "SHA256"
      }
    },
    org_id
  };
}

function buildCreateCSRRequest(
  org_id,
  common_name,
  country,
  organization,
  emails
) {
  return {
    org_id,
    common_name,
    country,
    organization,
    subject_alt_name: { emails }
  };
}

function buildSignDigitalpenRequest(csrpem, orgName) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30); // 30-day validity
  const built = {
    csr_pem: csrpem,
    organization: orgName,
    expires_at: expirationDate.toISOString(),
    key_usage: {
      digital_signature: true,
    },
    basic_constraints: {
      critical: true,
      is_ca: false,
      path_len_constraint: {
        is_set: false,
        len: 0,
      },
    },
  };

  return built;
}

async function buildIssuecertaRequest(vc, serialNumber) {
  const certa_id = vc.credentialSubject.id;
  const credentialDigest = await createCredentialDigest(vc, customLoader);
  const digest = Buffer.from(credentialDigest).toString("base64");

  if (!certa_id) {
    throw "Invalid document.credentialSubject.id";
  }

  const built = {
    certa_id,
    digitalpen_id: serialNumber,
    types: vc.type,
    digest,
  };

  return built;
}

async function buildVerifycertaRequest(vc) {
  const certa_id = vc.credentialSubject.id;
  const proof = proof2Request(vc.proof);
  delete vc.proof;
  const credentialDigest = await createCredentialDigest(vc, customLoader);
  const digest = Buffer.from(credentialDigest).toString("base64");

  if (!certa_id) {
    throw "Invalid document.credentialSubject.id";
  }

  const built = {
    certa_id,
    digest,
    proof,
  };

  return built;
}

function proofFromResponse(proof) {
  return {
    created: proof.created,
    type: proof.type,
    jws: proof.jws,
    proofPurpose: proof.proof_purpose,
    verificationMethod: proof.verification_method,
  };
}

function proof2Request(proof) {
  return {
    created: proof.created,
    type: proof.type,
    jws: proof.jws,
    proof_purpose: proof.proofPurpose,
    verification_method: proof.verificationMethod,
  };
}

module.exports = {
  buildCreateKeyRequest,
  buildCreateCSRRequest,
  buildSignDigitalpenRequest,
  buildIssuecertaRequest,
  buildVerifycertaRequest,
  proofFromResponse,
  proof2Request,
};
