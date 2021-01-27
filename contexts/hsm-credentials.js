module.exports = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    {
      '@version': 1.1,
      '@protected': true,
      id: '@id',
      type: '@type',
      EcdsaSecp384r1Signature2020: {
        '@id': 'https://w3id.org/security#EcdsaSecp384r1Signature2020',
        '@context': {
          '@version': 1.1,
          '@protected': true,
          id: '@id',
          type: '@type',
          sec: 'https://w3id.org/security#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
          challenge: 'sec:challenge',
          created: {
            '@id': 'http://purl.org/dc/terms/created',
            '@type': 'xsd:dateTime'
          },
          domain: 'sec:domain',
          expires: {
            '@id': 'sec:expiration',
            '@type': 'xsd:dateTime'
          },
          jws: 'sec:jws',
          nonce: 'sec:nonce',
          proofPurpose: {
            '@id': 'sec:proofPurpose',
            '@type': '@vocab',
            '@context': {
              '@version': 1.1,
              '@protected': true,
              id: '@id',
              type: '@type',
              sec: 'https://w3id.org/security#',
              assertionMethod: {
                '@id': 'sec:assertionMethod',
                '@type': '@id',
                '@container': '@set'
              },
              authentication: {
                '@id': 'sec:authenticationMethod',
                '@type': '@id',
                '@container': '@set'
              }
            }
          },
          proofValue: 'sec:proofValue',
          verificationMethod: {
            '@id': 'sec:verificationMethod',
            '@type': '@id'
          }
        }
      }
    }
  ]
};
