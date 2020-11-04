const uuid = require("uuid");

function newHealthCertificate({ type, status, lotNumber, result }) {
  console.log("Create", type, status, lotNumber, result);
  const todayStr = new Date().toISOString();
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);
  const expirationDateStr = expirationDate.toISOString();
  const vc = vcTypes[type];
  if (!vc) {
    throw new Error(`Type must be one of ${Object.keys(vcTypes)}`);
  }

  vc.credentialSubject.id = uuid.v4();

  if (type == "Immunization") {
    vc.credentialSubject.resourceType = type;
    vc.credentialSubject.status = status;
    vc.credentialSubject.lotNumber = lotNumber;
    vc.credentialSubject.date = todayStr;
    vc.credentialSubject.expirationDate = expirationDateStr;
  } else if (type == "DiagnosticReport") {
    vc.credentialSubject.resourceType = type;
    vc.credentialSubject.status = status;
    // Specimen
    const specimen = {
      resourceType: "Specimen",
      id: "specimen1",
      type: {
        coding: [
          {
            system: "https://www.questd.com/codes",
            code: "KP615943B",
            display: "Specimen collection",
          },
        ],
        text: "Specimen collection",
      },
      receivedTime: todayStr,
      collection: {
        collectedDateTime: todayStr,
      },
    };
    vc.credentialSubject.contained.push(specimen);
    vc.credentialSubject.specimen = [
      {
        reference: "#specimen1",
        type: "Specimen",
      },
    ];
    // Observation
    addResult_(vc.credentialSubject, result);
  } else if (type == "FHIRCredential") {
    vc.credentialSubject.fhirSource.status = status;
    vc.credentialSubject.fhirSource.meta.lastUpdated = todayStr;
    vc.credentialSubject.fhirSource.effectiveDateTime = todayStr;
    vc.credentialSubject.fhirSource.issued = todayStr;
    addResult_(vc.credentialSubject.fhirSource, result);
  } else {
    throw `Unsupported VC type ${type}`;
  }

  return vc;
}

function addResult_(doc, resultStr) {
  const observation = {
    resourceType: "Observation",
    id: "r1",
    status: "final",
    code: {
      coding: [
        {
          system: "https://www.questd.com/codes",
          code: "AZD1222",
          display: "serology results",
        },
      ],
      text: "serology results",
    },
    valueString: resultStr,
    comment: resultComment[resultStr],
  };
  doc.contained = doc.contained || [];
  doc.contained.push(observation);
  doc.result = [
    {
      reference: "#r1",
      type: "Observation",
    },
  ];
}

function addPatientData(
  vc,
  { givenName, familyName, photo, gender, birthDate }
) {
  if (photo.length == 0) {
    throw new Error("At least one photo must be provided");
  }
  // Patient
  const patient = {
    resourceType: "Patient",
    id: "p1",
    name: [{ family: familyName, given: [givenName] }],
    photo: photo.map((p) => {
      return { data: p };
    }),
  };
  if (gender) {
    patient.gender = gender;
  }
  if (birthDate) {
    patient.birthDate = birthDate;
  }
  vc.credentialSubject.contained.push(patient);
  const patientRef = { reference: "#p1", type: "Patient" };

  // Patient -- Immunization
  if (vc.credentialSubject.resourceType == "Immunization") {
    vc.credentialSubject.patient = patientRef;
  }

  // Patient -- DiagnosticReport
  else if (vc.credentialSubject.resourceType == "DiagnosticReport") {
    vc.credentialSubject.subject = patientRef;
    const specimen = getById(vc.credentialSubject.contained, "specimen1");
    if (!specimen) {
      throw new Error(
        "Malformed document: credentialSubject.contained does not contain specimen"
      );
    }
    specimen.subject = patientRef;
    const observation = getById(vc.credentialSubject.contained, "r1");
    if (!observation) {
      throw new Error(
        "Malformed document: credentialSubject.contained does not contain observation"
      );
    }
    observation.subject = patientRef;
  }
}

function addPractitionerData(vc, { givenName, familyName, prefix }) {
  const practitionerName = { family: familyName, given: [givenName] };
  if (prefix) {
    practitionerName.prefix = [prefix];
  }
  const practitioner = {
    resourceType: "practitioner1",
    id: "Dr.1",
    name: [practitionerName],
  };
  vc.credentialSubject.contained.push(practitioner);
  const practitionerRef = { id: "#performer1" };

  // Practitioner -- Immunization
  if (vc.credentialSubject.resourceType == "Immunization") {
    practitionerRef.actor = { reference: "#practitioner1" };
    vc.credentialSubject.practitioner = [practitionerRef];
  }

  // Practitioner -- DiagnosticReport
  else if (vc.credentialSubject.resourceType == "DiagnosticReport") {
    practitionerRef.actor = { reference: "#org1" };
    vc.credentialSubject.performer = practitionerRef;
    const observation = getById(vc.credentialSubject.contained, "r1");
    if (!observation) {
      throw new Error(
        "Malformed document: credentialSubject.contained does not contain observation"
      );
    }
    observation.performer = practitionerRef;
  }
}

const resultComment = {
  Positive: "Low IgG antibodies to SARS-CoV-2 (COVID-19).",
  Negative:
    "Detection of IgG antibodies may indicate exposure to SARS-CoV-2 (COVID-19). It usually takes at least 10 days after symptom onset for IgG to reach detectable levels. An IgG positive result may suggest an immune response to a primary infection with SARS-CoV-2, but the relationship between IgG positivity and immunity to SARS-CoV-2 has not yet been firmly established. Antibody tests have not been shown to definitively diagnose or exclude SARS CoV-2 infection. Diagnosis of COVID-19 is made by detection of SARS-CoV-2 RNA by molecular testing methods, consistent with a patient's clinical findings. This test has not been reviewed by the FDA. Negative results do not rule out SARS-CoV-2 infection particularly in those who have been in contact with the virus. Follow-up testing with a molecular diagnostic should be considered to rule out infection in these individuals. Results from antibody testing should not be used as the sole basis to diagnose or exclude SARS-CoV-2 infection or to inform infection status. Positive results could also be due to past or present infection with non-SARS-CoV-2 coronavirus strains, such as coronavirus HKU1, NL63, OC43, or 229E. This test is not to be used for the screening of donated blood.",
};

const immunizationCertificate = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://digitalinclusionfoundation.org/Immunization/v1",
  ],
  type: ["VerifiableCredential", "Immunization"],
  credentialSubject: {
    contained: [
      {
        resourceType: "Organization",
        id: "manufacturer1",
        name: "AstraZeneca; The University of Oxford; IQVIA",
      },
      {
        resourceType: "Location",
        id: "address1",
        address: { city: "Houston", state: "TX", country: "US" },
      },
    ],
    vaccineCode: {
      coding: [{ system: "urn:oid:1.2.36.1.2001.1005.17", code: "COVID-19" }],
      text: "Covid-19 (Coronavirus SARS-CoV-2)",
    },
    primarySource: true,
    manufacturer: { reference: "#manufacturer1", type: "Organization" },
    location: { reference: "#address1", type: "Location" },
  },
};

const diagnosticReport = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://digitalinclusionfoundation.org/DiagnosticReport/v1",
  ],
  type: ["VerifiableCredential", "DiagnosticReport"],
  credentialSubject: {
    contained: [
      {
        resourceType: "Organization",
        id: "org1",
        name: "QUEST DIAGNOSTICS",
        address: [
          {
            city: "MEDFORD",
            state: "NJ",
            country: "US",
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: "https://www.questd.com/codes",
          code: "AZD1222",
          display: "SARS-CoV-2 serology test",
        },
      ],
      text: "SARS-CoV-2 serology test",
    },
  },
};

const fhirCredential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://schema.opencerta.org/proof",
    "https://schema.opencerta.org/fhir/202009"
  ],
  type: ["VerifiableCredential", "FHIRCredential"],
  credentialSubject: {
    type: "FHIRCredential",
    id: "urn:fhir:566092",
    givenName: "Lab A",
    familyName: "Patient",
    fhirVersion: "3.5a.0",
    fhirSource: {
      id: "566092",
      meta: {
        // lastUpdated: "2020-09-23T19:29:13.162-04:00",
        versionId: "1"
      },
      contained: [
        {
          id: "8932748723984",
          name: "Test Facility A",
          resourceType: "Organization"
        }
      ],
      category: {
        coding: [
          {
            code: "LAB",
            system: "http://hl7.org/fhir/DiagnosticReport-category"
          }
        ]
      },
      code: {
        coding: [
          {
            code: "94500-6",
            display: "SARS-COV-2, NAA",
            system: "http://loinc.org"
          }
        ]
      },
      // effectiveDateTime: "2020-07-14T23:10:45-06:00",
      // issued: "2020-07-14T23:10:45-06:00",
      performer: {
        display: "Test Facility A",
        reference: "#8932748723984"
      },
      // result: [
      //   {
      //     reference: "Observation/566090"
      //   },
      //   {
      //     reference: "Observation/566091"
      //   }
      // ],
      status: "final",
      subject: {
        extension: [
          {
            url: "http://commonpass.org/fhir/StructureDefinition/subject-info",
            extension: [
              // {
              //   url:
              //     "http://commonpass.org/fhir/StructureDefinition/subject-name-info",
              //   valueHumanName: {
              //     family: ["Patient"],
              //     given: ["Lab A"]
              //   }
              // },
              // ** Fake data
              {
                url:
                  "http://commonpass.org/fhir/StructureDefinition/subject-identifier-info",
                valueIdentifier: {
                  assigner: {
                    display: "UK"
                  },
                  period: {
                    end: "2023-01-14"
                  },
                  type: {
                    coding: [
                      {
                        code: "PPN",
                        display: "Passport Number",
                        system: "http://hl7.org/fhir/v2/0203"
                      }
                    ]
                  },
                  value: "9872349875987"
                }
              }
            ]
          }
        ],
        // display: "Lab A Patient",
        reference: "Patient/566092"
      },
      resourceType: "DiagnosticReport"
    }
  }
};

const vcTypes = {
  Immunization: immunizationCertificate,
  DiagnosticReport: diagnosticReport,
  FHIRCredential: fhirCredential
};

module.exports = { newHealthCertificate, addPatientData, addPractitionerData };

function getById(objArr, id) {
  var found = false;
  objArr.forEach((obj) => {
    if (obj.id === id) {
      found = obj;
    }
  });
  return found;
}
