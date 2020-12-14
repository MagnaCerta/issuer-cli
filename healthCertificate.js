const uuid = require('uuid');

const SUBJECT_INFO_URL =
  'http://commonpass.org/fhir/StructureDefinition/subject-info';
const SUBJECT_NAME_INFO_URL =
  'http://commonpass.org/fhir/StructureDefinition/subject-name-info';
const SUBJECT_PHOTO_URL =
  'http://commonpass.org/fhir/StructureDefinition/subject-photo-info';

function newHealthCertificate({ type, status, lotNumber, result }) {
  console.log('Create', type, status, lotNumber, result);
  const todayStr = new Date().toISOString();
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);
  const expirationDateStr = expirationDate.toISOString();
  const vc = vcTypes[type];
  if (!vc) {
    throw new Error(`Type must be one of {${Object.keys(vcTypes)}}`);
  }

  vc.credentialSubject.id = uuid.v4();

  if (type === 'Immunization') {
    vc.credentialSubject.resourceType = type;
    vc.credentialSubject.status = status;
    vc.credentialSubject.lotNumber = lotNumber;
    vc.credentialSubject.date = todayStr;
    vc.credentialSubject.expirationDate = expirationDateStr;
  } else if (type === 'DiagnosticReport') {
    vc.credentialSubject.resourceType = type;
    vc.credentialSubject.status = status;
    // Specimen
    const specimen = {
      resourceType: 'Specimen',
      id: 'specimen1',
      type: {
        coding: [
          {
            system: 'https://www.questd.com/codes',
            code: 'KP615943B',
            display: 'Specimen collection'
          }
        ],
        text: 'Specimen collection'
      },
      receivedTime: todayStr,
      collection: {
        collectedDateTime: todayStr
      }
    };
    vc.credentialSubject.contained.push(specimen);
    vc.credentialSubject.specimen = [
      {
        type: 'Specimen',
        reference: '#specimen1'
      }
    ];
    // Observation
    _addResult(vc.credentialSubject, result);
  } else if (type === 'FHIRCredential') {
    vc.credentialSubject.fhirSource.status = status;
    vc.credentialSubject.fhirSource.meta.lastUpdated = todayStr;
    vc.credentialSubject.fhirSource.effectiveDateTime = todayStr;
    vc.credentialSubject.fhirSource.issued = todayStr;
    _addResult(vc.credentialSubject.fhirSource, result);
  } else {
    throw `Unsupported VC type ${type}`;
  }

  return vc;
}

function _addResult(doc, resultStr) {
  if (!resultStr) {
    throw new Error(`result must be one of {${Object.keys(resultComment)}}`);
  }
  const observation = {
    resourceType: 'Observation',
    id: 'r1',
    status: 'final',
    code: {
      coding: [
        {
          system: 'https://www.questd.com/codes',
          code: 'AZD1222',
          display: 'serology results'
        }
      ],
      text: 'serology results'
    },
    valueString: resultStr,
    comment: resultComment[resultStr]
  };
  doc.contained = doc.contained || [];
  doc.contained.push(observation);
  doc.result = [
    {
      type: 'Observation',
      reference: '#r1'
    }
  ];
}

function addPatientData(
  vc,
  { givenName, familyName, photo, gender, birthDate }
) {
  const patientPhotos = photo.map(p => ({ data: p }));

  if (vc.type.includes('FHIRCredential')) {
    const subjectExts = vc.credentialSubject.fhirSource.subject.extension;

    // Find Subject_Info object
    let subjectInfo;
    const subjectInfoExt = subjectExts.find(
      ext => ext.url === SUBJECT_INFO_URL
    );
    if (subjectInfoExt) {
      subjectInfoExt.extension = subjectInfoExt.extension || [];
      subjectInfo = subjectInfoExt.extension;
    } else {
      const newSubjectInfoExt = {
        url: SUBJECT_INFO_URL,
        extension: []
      };
      subjectExts.push(newSubjectInfoExt);
      subjectInfo = newSubjectInfoExt.extension;
    }

    // Add Name_Info to Subject_Info
    if (familyName && givenName) {
      vc.credentialSubject.givenName = givenName;
      vc.credentialSubject.familyName = familyName;
      subjectInfo.push({
        url: SUBJECT_NAME_INFO_URL,
        valueHumanName: {
          family: [familyName],
          given: [givenName]
        }
      });
    } else if (familyName || givenName) {
      throw 'familyName and givenName are expected to be set simultaneously';
    }

    // Add picture to Subject_Info
    if (patientPhotos.length > 0) {
      const photoInfoElement = subjectInfo.find(
        info => info.url === SUBJECT_PHOTO_URL
      );
      if (photoInfoElement) {
        photoInfoElement.valuePhoto.push(...patientPhotos);
      } else {
        subjectInfo.push({
          url: SUBJECT_PHOTO_URL,
          valuePhoto: patientPhotos
        });
      }
    }

    // I had to made up this one, so I'm not sure this is the proper way to add a picture for these credential type
  } else {
    if (patientPhotos.length === 0) {
      throw new Error('At least one photo must be provided');
    } else if (!familyName && !givenName) {
      throw new Error('familyName and givenName not set');
    }

    // Patient
    const patient = {
      resourceType: 'Patient',
      id: 'p1',
      name: [{ family: familyName, given: [givenName] }],
      photo: patientPhotos
    };
    if (gender) {
      patient.gender = gender;
    }
    if (birthDate) {
      patient.birthDate = birthDate;
    }

    addPatient_(vc.credentialSubject, patient);
  }
}

function addPatient_(doc, patient) {
  const patientRef = { type: 'Patient', reference: '#p1' };

  doc.contained.push(patient);

  // Patient -- Immunization
  if (doc.resourceType === 'Immunization') {
    doc.patient = patientRef;
  } else if (doc.resourceType === 'DiagnosticReport') { // Patient -- DiagnosticReport
    doct.subject = patientRef;
    const specimen = getById(doc.contained, 'specimen1');
    if (!specimen) {
      throw new Error(
        'Malformed document: contained does not contain specimen'
      );
    }
    specimen.subject = patientRef;
    const observation = getById(doc.contained, 'r1');
    if (!observation) {
      throw new Error(
        'Malformed document: contained does not contain observation'
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
    resourceType: 'Practitioner',
    id: 'Dr.1',
    name: [practitionerName]
  };

  const doc = vc.type.includes('FHIRCredential')
    ? vc.credentialSubject.fhirSource
    : vc.credentialSubject;
  addPractitioner_(doc, practitioner);
}

function addPractitioner_(doc, practitioner) {
  const practitionerRef = { id: '#performer1' };
  doc.contained.push(practitioner);
  // Practitioner -- Immunization
  if (doc.resourceType === 'Immunization') {
    practitionerRef.actor = { reference: 'Practitioner/Dr.1' };
    doc.practitioner = [practitionerRef];
  } else if (doc.resourceType === 'DiagnosticReport') { // Practitioner -- DiagnosticReport
    practitionerRef.actor = { reference: '#org1' };
    doc.performer = practitionerRef;
    const observation = getById(doc.contained, 'r1');
    if (!observation) {
      throw new Error(
        'Malformed document: contained does not contain observation #r1'
      );
    }
    observation.performer = practitionerRef;
  }
}

const resultComment = {
  Negative: 'Low IgG antibodies to SARS-CoV-2 (COVID-19).',
  Positive:
    'Detection of IgG antibodies may indicate exposure to SARS-CoV-2 (COVID-19). It usually takes at least 10 days after symptom onset for IgG to reach detectable levels. An IgG positive result may suggest an immune response to a primary infection with SARS-CoV-2, but the relationship between IgG positivity and immunity to SARS-CoV-2 has not yet been firmly established. Antibody tests have not been shown to definitively diagnose or exclude SARS CoV-2 infection. Diagnosis of COVID-19 is made by detection of SARS-CoV-2 RNA by molecular testing methods, consistent with a patient\'s clinical findings. This test has not been reviewed by the FDA. Negative results do not rule out SARS-CoV-2 infection particularly in those who have been in contact with the virus. Follow-up testing with a molecular diagnostic should be considered to rule out infection in these individuals. Results from antibody testing should not be used as the sole basis to diagnose or exclude SARS-CoV-2 infection or to inform infection status. Positive results could also be due to past or present infection with non-SARS-CoV-2 coronavirus strains, such as coronavirus HKU1, NL63, OC43, or 229E. This test is not to be used for the screening of donated blood.'
};

const immunizationCertificate = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://digitalinclusionfoundation.org/Immunization/v1'
  ],
  type: ['VerifiableCredential', 'Immunization'],
  credentialSubject: {
    contained: [
      {
        resourceType: 'Organization',
        id: 'manufacturer1',
        name: 'AstraZeneca; The University of Oxford; IQVIA'
      },
      {
        resourceType: 'Location',
        id: 'address1',
        address: { city: 'Houston', state: 'TX', country: 'US' }
      }
    ],
    vaccineCode: {
      coding: [{ system: 'urn:oid:1.2.36.1.20011005.17', code: 'COVID-19' }],
      text: 'Covid-19 (Coronavirus SARS-CoV-2)'
    },
    primarySource: true,
    manufacturer: { type: 'Organization', reference: '#manfacturer1' },
    location: { type: 'Location', reference: '#address1' }
  }
};

const diagnosticReport = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://digitalinclusionfoundation.org/DiagnosticReport/v1'
  ],
  type: ['VerifiableCredential', 'DiagnosticReport'],
  credentialSubject: {
    contained: [
      {
        resourceType: 'Organization',
        id: 'org1',
        name: 'QUEST DIAGNOSTICS',
        address: [
          {
            city: 'MEDFORD',
            state: 'NJ',
            country: 'US'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'https://www.questd.com/codes',
          code: 'AZD1222',
          display: 'SARS-CoV-2 serology test'
        }
      ],
      text: 'SARS-CoV-2 serology test'
    }
  }
};

const fhirCredential = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://schema.opencerta.org/proof',
    'https://schema.opencerta.org/fhir/202009'
  ],
  type: ['VerifiableCredential', 'FHIRCredential'],
  credentialSubject: {
    type: 'FHIRCredential',
    id: 'urn:fhir:566092',
    givenName: 'Lab A',
    familyName: 'Patient',
    fhirVersion: '3.5a.0',
    fhirSource: {
      id: '566092',
      meta: {
        // lastUpdated,: "2020-09-23T19:29:13.162-04:00",
        versionId: '1'
      },
      contained: [
        // {
        //   id: "8932748723984",
        //   name: "Test Facility A",
        //   resourceType: "Organization",
        // },
      ],
      category: {
        coding: [
          {
            code: 'LAB',
            system: 'http://hl7.org/fhir/DiagnosticReport-category'
          }
        ]
      },
      code: {
        coding: [
          {
            code: '94500-6',
            display: 'SARS-COV-2, NAA',
            system: 'http://loinc.org'
          }
        ]
      },
      // effectiveDateTime: "2020-07-14T23:10:45-06:00",
      // issued: "2020-07-14T23:10:45-06:00",
      // performer: {
      //   type: "Organization",
      //   reference: "#8932748723984",
      // },
      // result: [
      //   {
      //     reference: "Observation/566090"
      //   },
      //   {
      //     reference: "Observation/566091"
      //   }
      // ],
      status: 'final',
      subject: {
        extension: [
          {
            url: 'http://commonpass.org/fhir/StructureDefinition/subject-info',
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
                  'http://commonpass.org/fhir/StructureDefinition/subject-identifier-info',
                valueIdentifier: {
                  assigner: {
                    display: 'UK'
                  },
                  period: {
                    end: '2023-01-14'
                  },
                  type: {
                    coding: [
                      {
                        code: 'PPN',
                        display: 'Passport Number',
                        system: 'http://hl7.org/fhir/v2/0203'
                      }
                    ]
                  },
                  value: '9872349875987'
                }
              }
            ]
          }
        ],
        // display: "Lab A Patient",,
        reference: 'Patient/566092'
      },
      resourceType: 'DiagnosticReport'
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
  let found = false;
  objArr.forEach((obj) => {
    if (obj.id === id) {
      found = obj;
    }
  });

  return found;
}
