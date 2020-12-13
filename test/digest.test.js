const { createCredentialDigest } = require("../digest");
const { customLoader } = require("../documentloaders");

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("Digest creation", () => {
  const vcValid = require("./resources/vc_tosign_valid");
  const vcInvalid = require("./resources/vc_tosign_invalid");

  test("Happy: Calculate digest from valid credential", async () => {
    expect.assertions(1);
    return createCredentialDigest(vcValid, customLoader).then((digest) => {
      expect(digest).toBeInstanceOf(Uint8Array);
    });
  });

  test("Sad: Should fail to calculate digest for a VC with invalid format", async () => {
    expect.assertions(1);
    return createCredentialDigest(vcInvalid, customLoader).catch((err) => {
      expect(err).toBeInstanceOf(Error);
    });
  });
});
