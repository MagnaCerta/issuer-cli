const jsonld = require('jsonld');
const forge = require('node-forge');
const { SECURITY_CONTEXT_URL } = require('jsonld-signatures');

async function createCredentialDigest(
  document,
  documentLoader,
  {
    ctx = SECURITY_CONTEXT_URL,
    expansionMap = strictExpansionMap,
    compactToRelative = false
  } = {}
) {
  const canonized = await canonizeCredential(document, {
    documentLoader,
    expansionMap
  });

  const digest = sha256(canonized);

  return digest;
}

// Copy of jsonld-signatures.suites.LinkedDataSignature.canonize(),
// with slight modifications as we don't need to create an instance of this class
async function canonizeCredential(
  credential,
  { documentLoader, expansionMap, skipExpansion, useNativeCanonize }
) {
  return jsonld.canonize(credential, {
    algorithm: 'URDNA2015',
    format: 'application/n-quads',
    documentLoader,
    expansionMap,
    skipExpansion,
    useNative: useNativeCanonize
  });
}

// Copy of jsonld-signatures.expansionMap
// since it's not exposed by the package
// Description: Disallows dropping properties when expanding by default
const strictExpansionMap = (info) => {
  if (info.unmappedProperty) {
    throw new Error(
      `The property "${
        info.unmappedProperty
      }" in the input ` +
        'was not defined in the context.'
    );
  }
};

function sha256(string, encoding) {
  const md = forge.md.sha256.create();
  md.update(string, encoding || 'utf8');
  const buffer = md.digest();

  return forge.util.binary.raw.decode(buffer.getBytes());
}

module.exports = { createCredentialDigest };
