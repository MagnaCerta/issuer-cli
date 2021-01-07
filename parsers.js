const { fromBER } = require('asn1js');
const { stringToArrayBuffer, fromBase64 } = require('pvutils');
const { Certificate } = require('pkijs');

function parseCertificatePem(pem_) {
  const pem = pem_.trim();
  let sep = '\n';
  if (pem.includes('\r\n')) {
    sep = '\r\n';
  }
  const certPem = pem.split(sep).slice(1, -1)
    .join('');
  const schema = fromBER(stringToArrayBuffer(fromBase64(certPem))).result;

  return new Certificate({ schema });
}

function getCertificateSerialNbr(cert) {
  const buff = cert.serialNumber.valueBlock.valueHex;

  return Buffer.from(buff).toString('hex');
}

module.exports = { parseCertificatePem, getCertificateSerialNbr };
