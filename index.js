const { Command } = require("commander");
const keypair = require("./keypair");
const csr = require("./csr");
const vc = require("./vc");
const preprocess = require("./preprocess");

const cli = new Command();
cli.version("0.0.1");

// Key creation
cli
  .command("keypair <name>")
  .alias("key")
  .description("Create public and private signing key pair")
  .requiredOption("--orgId <orgId>", "Organization ID")
  .option("--token <token>", "API TOKEN")
  .option("--username <username>", "Practitioner first name")
  .option("--password <password>", "Practitioner last name")
  .action(keypair.create);

// CSR (X509)
cli
  .command("certification-request <csrFile>")
  .alias("csr")
  .description("Create CSR")
  .requiredOption("--orgId <orgId>", "Organization ID")
  .requiredOption("--cn <commonName>", "Common Name")
  .requiredOption("--org <organization>", "Organization Name")
  .requiredOption("--country <country>", "Country")
  .requiredOption("--email <email>", "E-mail", preprocess.concat, [])
  .option("--token <token>", "API TOKEN")
  .option("--username <username>", "Practitioner first name")
  .option("--password <password>", "Practitioner last name")
  .action(csr.create);

// Certificates (X509)
cli
  .command("certificate <certFile>")
  .alias("cert")
  .description("Create certificate from CSR")
  .requiredOption("--csrFile <file>", "Certification request input")
  .requiredOption("--orgId <orgId>", "Organization ID")
  .option("--token <token>", "API TOKEN")
  .option("--username <username>", "Practitioner first name")
  .option("--password <password>", "Practitioner last name")
  .action(csr.sign);

// Verifiable credentials
const vcCommand = cli
  .command("vc")
  .description("Manage Health Certificates (verifiable credentials)");

vcCommand
  .command("create <healthCertFile>")
  .requiredOption(
    "--type <Immunization|DiagnosticReport>",
    "Health Certificate type"
  )
  .requiredOption("--status <status>", "Test status")
  .option("--lotNumber <lotId>", "Lot Number (Immunization only)")
  .option("--result <result>", "Test result (DiagnosticResult only)")
  .action(vc.create);

vcCommand
  .command("patient <healthCertFile>")
  .requiredOption("--givenName <givenName>", "Patient first name")
  .requiredOption("--familyName <familyName>", "Patient last name")
  .requiredOption(
    "--photo <file>",
    "Add patient pictures",
    preprocess.concat,
    []
  )
  .option("--gender <gender>", "Patient gender")
  .option("--birthDate <date>", "Birth Date")
  .action(vc.addPatient);

vcCommand
  .command("practitioner <healthCertFile>")
  .requiredOption("--givenName <givenName>", "Practitioner first name")
  .requiredOption("--familyName <familyName>", "Practitioner last name")
  .option("--prefix <prefix>", "Practitioner prefix (eg. Dr., Mrs.)")
  .action(vc.addPractitioner);

vcCommand
  .command("sign <healthCertFile>")
  .option("--issuer <certFile>", "Sign using existing Certificate")
  .option("--digitalpenId <digitalpenId>", "Digital pen serial number")
  .option("--token <token>", "API TOKEN")
  .option("--username <username>", "Practitioner first name")
  .option("--password <password>", "Practitioner last name")
  .action(vc.sign);

vcCommand
  .command("validate <healthCertFile>")
  .option("--token <token>", "API TOKEN")
  .option("--username <username>", "Practitioner first name")
  .option("--password <password>", "Practitioner last name")
  .action(vc.validate);

cli.parseAsync(process.argv).catch(console.log);
