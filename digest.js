const jsonld = require("jsonld");
const forge = require("node-forge");
const { SECURITY_CONTEXT_URL } = require("jsonld-signatures");

async function createCredentialDigest(
  document,
  documentLoader,
  {
    ctx = SECURITY_CONTEXT_URL,
    expansionMap = strictExpansionMap,
    compactToRelative = false
  } = {}
) {
  // Step 1. Expand-and-compact
  const doc = await jsonld.compact(document, ctx, {
    documentLoader,
    expansionMap,
    compactToRelative
  });
  // Step 2:
  const canonized = await canonizeCredential(doc, {
    documentLoader,
    expansionMap
  });
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

// Copy of jsonld-signatures.expansionMap
// since it's not exposed by the package
// Description: Disallows dropping properties when expanding by default
const strictExpansionMap = (info) => {
  if (info.unmappedProperty) {
    throw new Error(
      'The property "' +
        info.unmappedProperty +
        '" in the input ' +
        "was not defined in the context."
    );
  }
};

function sha256(string, encoding) {
  const md = forge.md.sha256.create();
  md.update(string, encoding || "utf8");
  const buffer = md.digest();
  return forge.util.binary.raw.decode(buffer.getBytes());
}

module.exports = { createCredentialDigest };

/*
npm-certas-validator

* Verify:
- index.validate(vc)
  - src.services.signatures.validateLDSignature(vc, pkloader, docLoader);
    - jsonld-signatures.verify(vc, {docLoader, suite, purpose})
      - ProofSet.verify(vc, suite, purpose, docLoader, expansionMap[default=undefined], compactProof[default=true])
        (internally sets expansionMap to strictExpansionMap)
        (our suites are not legacy)
        - {proof, vc[compacted]} = ProofSet._getProofs(vc, legacy[false], docLoader, expansionMap[strictExpansionMap], compactProof[true])
          - vc = jsonld.compact(vc, SEC_CTX_URL, docLoader, expansionMap, compactToRelative=false)
            ... here it fails, since expansionMap is not strictly set to false, so any unknown property won't be accepted
          - extract and return {proof, vc[compacted](vc.proof removed)}
        - res = ProofSet._verify(vc, suites=[suite], proofSet=[proof], purpose, docLoader, expansionMap, compactProof)
          - filters proofs that match with purpose (if this fails, we fucked up!)
          -> *verify filtered(matching) proofs (HERE COMES THE KRAKEN) that match the suite
          - return suite.verifyProof(proof, vc, purpose, docLoader, expansioMap, compactProof)
            - verifyData = suite.createVerifyData(vc, proof, docLoader, expansionMap, compactProof)
              - c14nProofOpts = suite.canonizeProof(proof, docLoader, expansionMap)
                - delete proof[jws, signatureValue, proofValue] (only one exists, btw)
                - return suite.canonize(proof, docLoader, expansionMap, skipExpansion=false)
                  - return jsonld.canonize(proof, {ALG, FMT, docLoader, expansionMap, skipExpansion, useNative: suite.useNativeCanonize[undefined!]})
              - c14nDoc = suite.canonize(vc, docLoader, expansionMap, skipExpansion[undefined])
                - return jsonld.canonize(vc, ALG, FMT, docLoader, expansionMap, skipExpansion, useNative=suite.useNativeCanonize[undefined!])
              - return util.concat(hash[c14nProofOpts, c14nDoc])
            - purpuseResult = match purpuse with signature (??)
            - return {verified: suite.verifySignature, purpuseResult}

* SIGN *
    - jsonld-signatures.sign(vc, suite, purpose, docLoader, expansionMap[undefined], compactProof[undefined])
      - return ProofSet.add(vc, suite, purpose, docLoader, expansionMap[undef], compactProof[default=true])
        (internally sets expansionMap to strictExpansionMap)
        - vc = jsonld.compact(vc, SEC_CTX_URL, docLoader, expansionMap, compactToRelative=false)
        - proof = suite.createProof(vc, purpose, docLoader, expansionMap, compactProof)
          - proof = create with @context only
          - set proof[type, created,verificationMethod]
          - updateProof (TODO?? legacy??)
          - proof = purpuse.update(proof, vc, suite[this], docLoader, expansionMap)
          - verifyData = suite.createVerifyData(doc, proof, docLoader, expansionMap, compactProof)
            (same as above)
          - create signature and add to proof
          - return proof
        - (!!TODO) proof = jsonld.compact(expandedProof*, ctx=proof.@context, docLoader, expansionMap, compactToRelative=false)
        - cleanup Proof (partially done: certas-grpc)
        - add proof
        - return vc
*/
