# OpenCerta iCertas (Health Certificates) CLI

iCerta signed with a (X509) Certificate key.

## Commands

```
Commands:
  keypair|key [options] <name>                   Create public and private signing key pair
  certification-request|csr [options] <csrFile>  Create CSR
  certificate|cert [options] <certFile>          Create certificate from CSR
  vc                                             Manage Health Certificates (verifiable credentials)
  help [command]                                 display help for command
```

## Example

Mostly all calls require authentication, that's why you'll need to provide your credentials using `--user username --pwd password`. Alternatively, if you already have a token, you can replace `--user username --pwd password` by `--token apiToken`.

0. Setup: Install required packages

`npm install`


1. Create a ECDSA key pair

`node index.js keypair --orgId organizationId --username username --password password keyName`

creates a ECDSA key pair and stores public key as `${keyName}.pem`.


2. Create a X509 certificate

2.1. Create Certification Request (CSR)

`node index.js csr --orgId organizationId --cn 'Practitioner Name' --org 'Organization Name' --country US --email practitioner@lab.organization.com --username username --password password csrFile.csr`


2.2. Create Certificate from CSR

`node index.js cert --csrFile csrFile.csr --orgId organizationId --username username --password password certificate.cert`


3. Create Health certificate (VC: Verifiable credential)

If you already have a VC to be signed, skip to step 3.4

3.1. Create Immunization certificate

`node index.js vc create --type Immunization --status completed --lotNumber ABCDEF immunization.json`


3.2. Add Patient data to certificate

`node index.js vc patient --givenName First --familyName Last --photo samplepictures/patient1.jpg --gender male --birthDate 1977-09-10 immunization.json`

At least one photo is required. To add more photos, add as many `--photos <fileName>` as necessary:

`node index.js vc patient --givenName First --familyName Last --photo samplepictures/patient1.jpg --photo photo2.jpg --photo anotherphoto.png --gender male --birthDate 1977-09-10 immunization.json`

Calling `node index.js vc patient` several times for the same file will add more patients, but won't be referenced anywhere else within the document. Future versions might handle this behaviour properly.


3.3. Add practitioner data

`node index.js vc practitioner --givenName PractitionerFirst --familyName PractitionerLast --prefix Dr. immunization.json`

3.4. Sign

Using digital pen Id (certificate serial number)

`node index.js vc sign --digitalpenId digitalpenId --username username --password password immunization.json`

Alternatively, if you have the digital pen (PEM certificate) file:

`node index.js vc sign --issuer certificate.cert --username username --password password immunization.json`

4. (Optional): Validate signature with X509 certificate file public key

`node index.js vc validate --username username --password password immunization.json`

5. (Optional): Create QR-encoded certa

`node index.js vc qrencode --outfile immunization.png --username username --password password immunization.json`