/* !
 * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
 */

const credentialsContext = require('credentials-context');

module.exports = new Map([
  ...credentialsContext.contexts,
  ['https://www.w3.org/2018/credentials/v1', require('./credentials-v1')],
  [
    'https://digitalinclusionfoundation.org/credentials/v1',
    require('./hsm-credentials')
  ],
  [
    'https://digitalinclusionfoundation.org/Immunization/v1',
    require('./vcImmunization')
  ],
  [
    'https://digitalinclusionfoundation.org/DiagnosticReport/v1',
    require('./vcDiagnosticReport')
  ]
]);
