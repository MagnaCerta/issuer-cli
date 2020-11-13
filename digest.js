const jsonld = require("jsonld");
const forge = require("node-forge");

async function createCredentialDigest(document, documentLoader) {
  const canonized = await canonizeCredential(document, { documentLoader });
  return sha256(canonized);
}

// Copy of jsonld-signatures.suites.LinkedDataSignature.canonize(),
// with slight modifications as we don't need to create an instance of this class
async function canonizeCredential(
  credential,
  { documentLoader, expansionMap, skipExpansion, useNativeCanonize }
) {
  return jsonld.canonize(credential, {
    algorithm: "URDNA2015",
    format: "application/n-quads",
    documentLoader,
    expansionMap,
    skipExpansion,
    useNative: useNativeCanonize
  });
}

function sha256(string, encoding) {
  const md = forge.md.sha256.create();
  md.update(string, encoding || "utf8");
  const buffer = md.digest();
  return forge.util.binary.raw.decode(buffer.getBytes());
}

module.exports = { createCredentialDigest };
