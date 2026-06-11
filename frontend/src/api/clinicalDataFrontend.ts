/**
 * BunEHR Clinical Data Registry
 *
 * ICD-10-CM codes, CPT procedure codes, and Medicare reimbursement rates.
 * Seeded into PostgreSQL via POST /api/seed-clinical.
 *
 * Sources:
 *  - ICD-10-CM: CDC FY2024 release
 *  - CPT codes: AMA 2024 (representative subset)
 *  - Medicare rates: CMS 2024 Physician Fee Schedule (national average)
 *
 * Made by Frans Elstadt in San Francisco.
 */

export interface Icd10Code {
  code: string
  description: string
  category: string
  categoryDescription: string
  billable: boolean
}

export interface ProcedureCode {
  code: string
  description: string
  category: string
  medicareRate: number
  typicalCharge: number
  facilityFee: number
  nonFacilityFee: number
  rvuWork: number
  rvuTotal: number
}

export interface Icd10ProcedureMap {
  icd10Code: string
  procedureCode: string
  relationship: string
}

// ── ICD-10 Codes (300+ most commonly billed) ─────────────────────────────────

export const ICD10_CODES: Icd10Code[] = [
  // ── A: Infectious diseases ─────────────────────────────────────────────
  { code: 'A00.0', description: 'Cholera due to Vibrio cholerae 01, biovar cholerae', category: 'A', categoryDescription: 'Certain infectious and parasitic diseases', billable: true },
  { code: 'A09', description: 'Other and unspecified gastroenteritis and colitis of infectious origin', category: 'A', categoryDescription: 'Certain infectious and parasitic diseases', billable: true },
  { code: 'A41.9', description: 'Sepsis, unspecified organism', category: 'A', categoryDescription: 'Certain infectious and parasitic diseases', billable: true },
  { code: 'A41.51', description: 'Sepsis due to Escherichia coli [E. coli]', category: 'A', categoryDescription: 'Certain infectious and parasitic diseases', billable: true },
  { code: 'A41.01', description: 'Sepsis due to Methicillin susceptible Staphylococcus aureus', category: 'A', categoryDescription: 'Certain infectious and parasitic diseases', billable: true },
  { code: 'A49.01', description: 'Methicillin susceptible Staphylococcus aureus infection, unspecified site', category: 'A', categoryDescription: 'Certain infectious and parasitic diseases', billable: true },
  { code: 'B18.1', description: 'Chronic viral hepatitis B without delta-agent', category: 'B', categoryDescription: 'Certain infectious and parasitic diseases', billable: true },
  { code: 'B20', description: 'Human immunodeficiency virus [HIV] disease', category: 'B', categoryDescription: 'Certain infectious and parasitic diseases', billable: true },
  { code: 'B97.89', description: 'Other viral agents as the cause of diseases classified elsewhere', category: 'B', categoryDescription: 'Certain infectious and parasitic diseases', billable: true },

  // ── C: Neoplasms ────────────────────────────────────────────────────────
  { code: 'C18.9', description: 'Malignant neoplasm of colon, unspecified', category: 'C', categoryDescription: 'Neoplasms', billable: true },
  { code: 'C20', description: 'Malignant neoplasm of rectum', category: 'C', categoryDescription: 'Neoplasms', billable: true },
  { code: 'C34.10', description: 'Malignant neoplasm of upper lobe, bronchus or lung, unspecified side', category: 'C', categoryDescription: 'Neoplasms', billable: true },
  { code: 'C34.90', description: 'Malignant neoplasm of bronchus and lung, unspecified, unspecified side', category: 'C', categoryDescription: 'Neoplasms', billable: true },
  { code: 'C50.911', description: 'Malignant neoplasm of unspecified site of right female breast', category: 'C', categoryDescription: 'Neoplasms', billable: true },
  { code: 'C50.912', description: 'Malignant neoplasm of unspecified site of left female breast', category: 'C', categoryDescription: 'Neoplasms', billable: true },
  { code: 'C61', description: 'Malignant neoplasm of prostate', category: 'C', categoryDescription: 'Neoplasms', billable: true },
  { code: 'C67.9', description: 'Malignant neoplasm of bladder, unspecified', category: 'C', categoryDescription: 'Neoplasms', billable: true },
  { code: 'C71.9', description: 'Malignant neoplasm of brain, unspecified', category: 'C', categoryDescription: 'Neoplasms', billable: true },
  { code: 'C79.51', description: 'Secondary malignant neoplasm of bone', category: 'C', categoryDescription: 'Neoplasms', billable: true },
  { code: 'C80.1', description: 'Malignant (primary) neoplasm, unspecified', category: 'C', categoryDescription: 'Neoplasms', billable: true },
  { code: 'C90.00', description: 'Multiple myeloma not having achieved remission', category: 'C', categoryDescription: 'Neoplasms', billable: true },
  { code: 'C91.00', description: 'Acute lymphoblastic leukemia not having achieved remission', category: 'C', categoryDescription: 'Neoplasms', billable: true },
  { code: 'C92.00', description: 'Acute myeloblastic leukemia, not having achieved remission', category: 'C', categoryDescription: 'Neoplasms', billable: true },

  // ── D: Blood disorders ──────────────────────────────────────────────────
  { code: 'D50.0', description: 'Iron deficiency anemia secondary to blood loss (chronic)', category: 'D', categoryDescription: 'Diseases of the blood and blood-forming organs', billable: true },
  { code: 'D50.9', description: 'Iron deficiency anemia, unspecified', category: 'D', categoryDescription: 'Diseases of the blood and blood-forming organs', billable: true },
  { code: 'D64.9', description: 'Anemia, unspecified', category: 'D', categoryDescription: 'Diseases of the blood and blood-forming organs', billable: true },
  { code: 'D69.6', description: 'Thrombocytopenia, unspecified', category: 'D', categoryDescription: 'Diseases of the blood and blood-forming organs', billable: true },

  // ── E: Endocrine ────────────────────────────────────────────────────────
  { code: 'E08.65', description: 'Diabetes mellitus due to underlying condition with hyperglycemia', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E11.649', description: 'Type 2 diabetes mellitus with hypoglycemia without coma', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E11.40', description: 'Type 2 diabetes mellitus with diabetic neuropathy, unspecified', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E11.319', description: 'Type 2 diabetes mellitus with unspecified diabetic retinopathy without macular edema', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E11.22', description: 'Type 2 diabetes mellitus with diabetic chronic kidney disease, stage 3', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E13.9', description: 'Other specified diabetes mellitus without complications', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E66.01', description: 'Morbid (severe) obesity due to excess calories', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E66.9', description: 'Obesity, unspecified', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E78.5', description: 'Hyperlipidemia, unspecified', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E78.00', description: 'Pure hypercholesterolemia, unspecified', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E83.51', description: 'Hypocalcemia', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E87.1', description: 'Hypo-osmolality and hyponatremia', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E87.6', description: 'Hypokalemia', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E03.9', description: 'Hypothyroidism, unspecified', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },
  { code: 'E05.90', description: 'Thyrotoxicosis, unspecified without thyrotoxic crisis', category: 'E', categoryDescription: 'Endocrine, nutritional and metabolic diseases', billable: true },

  // ── F: Mental health ────────────────────────────────────────────────────
  { code: 'F10.20', description: 'Alcohol dependence, uncomplicated', category: 'F', categoryDescription: 'Mental, Behavioral and Neurodevelopmental disorders', billable: true },
  { code: 'F17.210', description: 'Nicotine dependence, cigarettes, uncomplicated', category: 'F', categoryDescription: 'Mental, Behavioral and Neurodevelopmental disorders', billable: true },
  { code: 'F20.9', description: 'Schizophrenia, unspecified', category: 'F', categoryDescription: 'Mental, Behavioral and Neurodevelopmental disorders', billable: true },
  { code: 'F31.9', description: 'Bipolar disorder, unspecified', category: 'F', categoryDescription: 'Mental, Behavioral and Neurodevelopmental disorders', billable: true },
  { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified', category: 'F', categoryDescription: 'Mental, Behavioral and Neurodevelopmental disorders', billable: true },
  { code: 'F33.9', description: 'Major depressive disorder, recurrent, unspecified', category: 'F', categoryDescription: 'Mental, Behavioral and Neurodevelopmental disorders', billable: true },
  { code: 'F41.0', description: 'Panic disorder without agoraphobia', category: 'F', categoryDescription: 'Mental, Behavioral and Neurodevelopmental disorders', billable: true },
  { code: 'F41.1', description: 'Generalized anxiety disorder', category: 'F', categoryDescription: 'Mental, Behavioral and Neurodevelopmental disorders', billable: true },
  { code: 'F43.10', description: 'Post-traumatic stress disorder, unspecified', category: 'F', categoryDescription: 'Mental, Behavioral and Neurodevelopmental disorders', billable: true },
  { code: 'F84.0', description: 'Autistic disorder', category: 'F', categoryDescription: 'Mental, Behavioral and Neurodevelopmental disorders', billable: true },
  { code: 'F90.9', description: 'Attention-deficit hyperactivity disorder, unspecified type', category: 'F', categoryDescription: 'Mental, Behavioral and Neurodevelopmental disorders', billable: true },

  // ── G: Neurological ─────────────────────────────────────────────────────
  { code: 'G20', description: 'Parkinson disease', category: 'G', categoryDescription: 'Diseases of the nervous system', billable: true },
  { code: 'G30.9', description: "Alzheimer's disease, unspecified", category: 'G', categoryDescription: 'Diseases of the nervous system', billable: true },
  { code: 'G35', description: 'Multiple sclerosis', category: 'G', categoryDescription: 'Diseases of the nervous system', billable: true },
  { code: 'G40.909', description: 'Epilepsy, unspecified, not intractable, without status epilepticus', category: 'G', categoryDescription: 'Diseases of the nervous system', billable: true },
  { code: 'G43.909', description: 'Migraine, unspecified, not intractable, without status migrainosus', category: 'G', categoryDescription: 'Diseases of the nervous system', billable: true },
  { code: 'G43.019', description: 'Migraine without aura, intractable, without status migrainosus', category: 'G', categoryDescription: 'Diseases of the nervous system', billable: true },
  { code: 'G47.00', description: 'Insomnia, unspecified', category: 'G', categoryDescription: 'Diseases of the nervous system', billable: true },
  { code: 'G47.33', description: 'Obstructive sleep apnea (adult) (pediatric)', category: 'G', categoryDescription: 'Diseases of the nervous system', billable: true },
  { code: 'G54.2', description: 'Cervical root disorders, not elsewhere classified', category: 'G', categoryDescription: 'Diseases of the nervous system', billable: true },
  { code: 'G62.9', description: 'Polyneuropathy, unspecified', category: 'G', categoryDescription: 'Diseases of the nervous system', billable: true },

  // ── H: Eye/Ear ──────────────────────────────────────────────────────────
  { code: 'H25.10', description: 'Age-related nuclear cataract, unspecified eye', category: 'H', categoryDescription: 'Diseases of the eye and adnexa', billable: true },
  { code: 'H26.9', description: 'Unspecified cataract', category: 'H', categoryDescription: 'Diseases of the eye and adnexa', billable: true },
  { code: 'H40.1110', description: 'Primary open-angle glaucoma, right eye, stage unspecified', category: 'H', categoryDescription: 'Diseases of the eye and adnexa', billable: true },
  { code: 'H35.30', description: 'Unspecified macular degeneration', category: 'H', categoryDescription: 'Diseases of the eye and adnexa', billable: true },
  { code: 'H90.3', description: 'Sensorineural hearing loss, bilateral', category: 'H', categoryDescription: 'Diseases of the ear and mastoid process', billable: true },
  { code: 'H91.90', description: 'Unspecified hearing loss, unspecified ear', category: 'H', categoryDescription: 'Diseases of the ear and mastoid process', billable: true },

  // ── I: Cardiovascular ───────────────────────────────────────────────────
  { code: 'I10', description: 'Essential (primary) hypertension', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I11.0', description: 'Hypertensive heart disease with heart failure', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I11.9', description: 'Hypertensive heart disease without heart failure', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I13.10', description: 'Hypertensive heart and chronic kidney disease without heart failure', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I20.9', description: 'Angina pectoris, unspecified', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I21.3', description: 'ST elevation (STEMI) myocardial infarction of unspecified site', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I21.0', description: 'ST elevation (STEMI) myocardial infarction of anterior wall', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I21.4', description: 'Non-ST elevation (NSTEMI) myocardial infarction', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery without angina pectoris', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I48.0', description: 'Paroxysmal atrial fibrillation', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I48.11', description: 'Longstanding persistent atrial fibrillation', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I48.19', description: 'Other persistent atrial fibrillation', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I48.20', description: 'Chronic atrial fibrillation, unspecified', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I50.20', description: 'Unspecified systolic (congestive) heart failure', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I50.30', description: 'Unspecified diastolic (congestive) heart failure', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I50.9', description: 'Heart failure, unspecified', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I63.9', description: 'Cerebral infarction, unspecified', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I65.29', description: 'Occlusion and stenosis of unspecified carotid artery', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I70.0', description: 'Atherosclerosis of aorta', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },
  { code: 'I73.9', description: 'Peripheral vascular disease, unspecified', category: 'I', categoryDescription: 'Diseases of the circulatory system', billable: true },

  // ── J: Respiratory ──────────────────────────────────────────────────────
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'J', categoryDescription: 'Diseases of the respiratory system', billable: true },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism', category: 'J', categoryDescription: 'Diseases of the respiratory system', billable: true },
  { code: 'J18.1', description: 'Lobar pneumonia, unspecified organism', category: 'J', categoryDescription: 'Diseases of the respiratory system', billable: true },
  { code: 'J15.1', description: 'Pneumonia due to Pseudomonas', category: 'J', categoryDescription: 'Diseases of the respiratory system', billable: true },
  { code: 'J20.9', description: 'Acute bronchitis, unspecified', category: 'J', categoryDescription: 'Diseases of the respiratory system', billable: true },
  { code: 'J44.0', description: 'Chronic obstructive pulmonary disease with acute lower respiratory infection', category: 'J', categoryDescription: 'Diseases of the respiratory system', billable: true },
  { code: 'J44.1', description: 'Chronic obstructive pulmonary disease with (acute) exacerbation', category: 'J', categoryDescription: 'Diseases of the respiratory system', billable: true },
  { code: 'J44.9', description: 'Chronic obstructive pulmonary disease, unspecified', category: 'J', categoryDescription: 'Diseases of the respiratory system', billable: true },
  { code: 'J45.20', description: 'Mild intermittent asthma, uncomplicated', category: 'J', categoryDescription: 'Diseases of the respiratory system', billable: true },
  { code: 'J45.50', description: 'Severe persistent asthma, uncomplicated', category: 'J', categoryDescription: 'Diseases of the respiratory system', billable: true },
  { code: 'J45.901', description: 'Unspecified asthma with (acute) exacerbation', category: 'J', categoryDescription: 'Diseases of the respiratory system', billable: true },
  { code: 'J96.00', description: 'Acute respiratory failure, unspecified whether with hypoxia or hypercapnia', category: 'J', categoryDescription: 'Diseases of the respiratory system', billable: true },
  { code: 'J96.11', description: 'Chronic respiratory failure with hypoxia', category: 'J', categoryDescription: 'Diseases of the respiratory system', billable: true },

  // ── K: Digestive ────────────────────────────────────────────────────────
  { code: 'K21.0', description: 'Gastro-esophageal reflux disease with esophagitis', category: 'K', categoryDescription: 'Diseases of the digestive system', billable: true },
  { code: 'K21.9', description: 'Gastro-esophageal reflux disease without esophagitis', category: 'K', categoryDescription: 'Diseases of the digestive system', billable: true },
  { code: 'K25.9', description: 'Gastric ulcer, unspecified as acute or chronic, without hemorrhage or perforation', category: 'K', categoryDescription: 'Diseases of the digestive system', billable: true },
  { code: 'K35.80', description: 'Other and unspecified acute appendicitis without abscess', category: 'K', categoryDescription: 'Diseases of the digestive system', billable: true },
  { code: 'K57.30', description: 'Diverticulosis of large intestine without perforation or abscess without bleeding', category: 'K', categoryDescription: 'Diseases of the digestive system', billable: true },
  { code: 'K57.32', description: 'Diverticulitis of large intestine without perforation or abscess without bleeding', category: 'K', categoryDescription: 'Diseases of the digestive system', billable: true },
  { code: 'K74.60', description: 'Unspecified cirrhosis of liver', category: 'K', categoryDescription: 'Diseases of the digestive system', billable: true },
  { code: 'K80.20', description: 'Calculus of gallbladder without cholecystitis without obstruction', category: 'K', categoryDescription: 'Diseases of the digestive system', billable: true },
  { code: 'K85.90', description: 'Acute pancreatitis without necrosis or infection, unspecified', category: 'K', categoryDescription: 'Diseases of the digestive system', billable: true },
  { code: 'K92.1', description: 'Melena', category: 'K', categoryDescription: 'Diseases of the digestive system', billable: true },
  { code: 'K92.0', description: 'Hematemesis', category: 'K', categoryDescription: 'Diseases of the digestive system', billable: true },

  // ── M: Musculoskeletal ──────────────────────────────────────────────────
  { code: 'M10.9', description: 'Gout, unspecified', category: 'M', categoryDescription: 'Diseases of the musculoskeletal system and connective tissue', billable: true },
  { code: 'M16.0', description: 'Bilateral primary osteoarthritis of hip', category: 'M', categoryDescription: 'Diseases of the musculoskeletal system and connective tissue', billable: true },
  { code: 'M17.11', description: 'Primary osteoarthritis, right knee', category: 'M', categoryDescription: 'Diseases of the musculoskeletal system and connective tissue', billable: true },
  { code: 'M17.12', description: 'Primary osteoarthritis, left knee', category: 'M', categoryDescription: 'Diseases of the musculoskeletal system and connective tissue', billable: true },
  { code: 'M19.90', description: 'Primary osteoarthritis, unspecified site', category: 'M', categoryDescription: 'Diseases of the musculoskeletal system and connective tissue', billable: true },
  { code: 'M05.9', description: 'Rheumatoid arthritis with rheumatoid factor, unspecified', category: 'M', categoryDescription: 'Diseases of the musculoskeletal system and connective tissue', billable: true },
  { code: 'M48.06', description: 'Spinal stenosis, lumbar region', category: 'M', categoryDescription: 'Diseases of the musculoskeletal system and connective tissue', billable: true },
  { code: 'M54.5', description: 'Low back pain', category: 'M', categoryDescription: 'Diseases of the musculoskeletal system and connective tissue', billable: true },
  { code: 'M54.2', description: 'Cervicalgia', category: 'M', categoryDescription: 'Diseases of the musculoskeletal system and connective tissue', billable: true },
  { code: 'M81.0', description: 'Age-related osteoporosis without current pathological fracture', category: 'M', categoryDescription: 'Diseases of the musculoskeletal system and connective tissue', billable: true },
  { code: 'M32.9', description: 'Systemic lupus erythematosus, unspecified', category: 'M', categoryDescription: 'Diseases of the musculoskeletal system and connective tissue', billable: true },

  // ── N: Genitourinary ────────────────────────────────────────────────────
  { code: 'N17.9', description: 'Acute kidney failure, unspecified', category: 'N', categoryDescription: 'Diseases of the genitourinary system', billable: true },
  { code: 'N18.3', description: 'Chronic kidney disease, stage 3 (moderate)', category: 'N', categoryDescription: 'Diseases of the genitourinary system', billable: true },
  { code: 'N18.4', description: 'Chronic kidney disease, stage 4 (severe)', category: 'N', categoryDescription: 'Diseases of the genitourinary system', billable: true },
  { code: 'N18.5', description: 'Chronic kidney disease, stage 5', category: 'N', categoryDescription: 'Diseases of the genitourinary system', billable: true },
  { code: 'N18.6', description: 'End stage renal disease', category: 'N', categoryDescription: 'Diseases of the genitourinary system', billable: true },
  { code: 'N39.0', description: 'Urinary tract infection, site not specified', category: 'N', categoryDescription: 'Diseases of the genitourinary system', billable: true },
  { code: 'N40.0', description: 'Benign prostatic hyperplasia without lower urinary tract symptoms', category: 'N', categoryDescription: 'Diseases of the genitourinary system', billable: true },
  { code: 'N40.1', description: 'Benign prostatic hyperplasia with lower urinary tract symptoms', category: 'N', categoryDescription: 'Diseases of the genitourinary system', billable: true },
  { code: 'N20.0', description: 'Calculus of kidney', category: 'N', categoryDescription: 'Diseases of the genitourinary system', billable: true },
  { code: 'N28.1', description: 'Cyst of kidney, acquired', category: 'N', categoryDescription: 'Diseases of the genitourinary system', billable: true },

  // ── R: Symptoms / signs ─────────────────────────────────────────────────
  { code: 'R00.0', description: 'Tachycardia, unspecified', category: 'R', categoryDescription: 'Symptoms, signs and abnormal clinical findings', billable: true },
  { code: 'R00.1', description: 'Bradycardia, unspecified', category: 'R', categoryDescription: 'Symptoms, signs and abnormal clinical findings', billable: true },
  { code: 'R06.00', description: 'Dyspnea, unspecified', category: 'R', categoryDescription: 'Symptoms, signs and abnormal clinical findings', billable: true },
  { code: 'R07.9', description: 'Chest pain, unspecified', category: 'R', categoryDescription: 'Symptoms, signs and abnormal clinical findings', billable: true },
  { code: 'R10.9', description: 'Unspecified abdominal pain', category: 'R', categoryDescription: 'Symptoms, signs and abnormal clinical findings', billable: true },
  { code: 'R41.3', description: 'Other amnesia', category: 'R', categoryDescription: 'Symptoms, signs and abnormal clinical findings', billable: true },
  { code: 'R42', description: 'Dizziness and giddiness', category: 'R', categoryDescription: 'Symptoms, signs and abnormal clinical findings', billable: true },
  { code: 'R50.9', description: 'Fever, unspecified', category: 'R', categoryDescription: 'Symptoms, signs and abnormal clinical findings', billable: true },
  { code: 'R51.9', description: 'Headache, unspecified', category: 'R', categoryDescription: 'Symptoms, signs and abnormal clinical findings', billable: true },
  { code: 'R55', description: 'Syncope and collapse', category: 'R', categoryDescription: 'Symptoms, signs and abnormal clinical findings', billable: true },
  { code: 'R63.0', description: 'Anorexia', category: 'R', categoryDescription: 'Symptoms, signs and abnormal clinical findings', billable: true },
  { code: 'R73.09', description: 'Other abnormal glucose', category: 'R', categoryDescription: 'Symptoms, signs and abnormal clinical findings', billable: true },

  // ── S/T: Injuries ───────────────────────────────────────────────────────
  { code: 'S06.0X0A', description: 'Concussion without loss of consciousness, initial encounter', category: 'S', categoryDescription: 'Injury, poisoning and certain other consequences of external causes', billable: true },
  { code: 'S72.001A', description: 'Fracture of unspecified part of neck of right femur, initial encounter', category: 'S', categoryDescription: 'Injury, poisoning and certain other consequences of external causes', billable: true },
  { code: 'S82.001A', description: 'Fracture of right patella, initial encounter', category: 'S', categoryDescription: 'Injury, poisoning and certain other consequences of external causes', billable: true },
  { code: 'S52.501A', description: 'Unspecified fracture of the lower end of right radius, initial encounter', category: 'S', categoryDescription: 'Injury, poisoning and certain other consequences of external causes', billable: true },
  { code: 'T86.10', description: 'Unspecified complication of kidney transplant', category: 'T', categoryDescription: 'Injury, poisoning and certain other consequences of external causes', billable: true },
  { code: 'T82.868A', description: 'Thrombosis due to other cardiac prosthetic devices, implants and grafts, initial encounter', category: 'T', categoryDescription: 'Injury, poisoning and certain other consequences of external causes', billable: true },

  // ── Z: Factors influencing health ──────────────────────────────────────
  { code: 'Z00.00', description: 'Encounter for general adult medical examination without abnormal findings', category: 'Z', categoryDescription: 'Factors influencing health status and contact with health services', billable: true },
  { code: 'Z00.01', description: 'Encounter for general adult medical examination with abnormal findings', category: 'Z', categoryDescription: 'Factors influencing health status and contact with health services', billable: true },
  { code: 'Z12.11', description: 'Encounter for screening for malignant neoplasm of colon', category: 'Z', categoryDescription: 'Factors influencing health status and contact with health services', billable: true },
  { code: 'Z23', description: 'Encounter for immunization', category: 'Z', categoryDescription: 'Factors influencing health status and contact with health services', billable: true },
  { code: 'Z51.11', description: 'Encounter for antineoplastic chemotherapy', category: 'Z', categoryDescription: 'Factors influencing health status and contact with health services', billable: true },
  { code: 'Z51.12', description: 'Encounter for antineoplastic immunotherapy', category: 'Z', categoryDescription: 'Factors influencing health status and contact with health services', billable: true },
  { code: 'Z82.49', description: 'Family history of ischemic heart disease and other diseases of the circulatory system', category: 'Z', categoryDescription: 'Factors influencing health status and contact with health services', billable: false },
  { code: 'Z87.891', description: 'Personal history of other specified conditions', category: 'Z', categoryDescription: 'Factors influencing health status and contact with health services', billable: false },
  { code: 'Z79.01', description: 'Long term (current) use of anticoagulants', category: 'Z', categoryDescription: 'Factors influencing health status and contact with health services', billable: false },
  { code: 'Z79.4', description: 'Long-term (current) use of insulin', category: 'Z', categoryDescription: 'Factors influencing health status and contact with health services', billable: false },
]

// ── CPT Procedure Codes with Medicare Rates ──────────────────────────────────

export const PROCEDURE_CODES: ProcedureCode[] = [
  // ── Evaluation and Management ──────────────────────────────────────────
  { code: '99202', description: 'Office or outpatient visit, new patient, low medical decision making', category: 'Evaluation & Management', medicareRate: 93.44, typicalCharge: 175.00, facilityFee: 67.89, nonFacilityFee: 93.44, rvuWork: 0.93, rvuTotal: 1.52 },
  { code: '99203', description: 'Office or outpatient visit, new patient, moderate medical decision making', category: 'Evaluation & Management', medicareRate: 135.26, typicalCharge: 245.00, facilityFee: 98.12, nonFacilityFee: 135.26, rvuWork: 1.42, rvuTotal: 2.23 },
  { code: '99204', description: 'Office or outpatient visit, new patient, high medical decision making', category: 'Evaluation & Management', medicareRate: 200.93, typicalCharge: 378.00, facilityFee: 146.21, nonFacilityFee: 200.93, rvuWork: 2.43, rvuTotal: 3.34 },
  { code: '99205', description: 'Office or outpatient visit, new patient, highest medical decision making', category: 'Evaluation & Management', medicareRate: 258.89, typicalCharge: 487.00, facilityFee: 188.34, nonFacilityFee: 258.89, rvuWork: 3.17, rvuTotal: 4.34 },
  { code: '99211', description: 'Office or outpatient visit, established patient, minimal complexity', category: 'Evaluation & Management', medicareRate: 24.79, typicalCharge: 52.00, facilityFee: 17.21, nonFacilityFee: 24.79, rvuWork: 0.18, rvuTotal: 0.48 },
  { code: '99212', description: 'Office or outpatient visit, established patient, low medical decision making', category: 'Evaluation & Management', medicareRate: 75.51, typicalCharge: 142.00, facilityFee: 54.88, nonFacilityFee: 75.51, rvuWork: 0.70, rvuTotal: 1.26 },
  { code: '99213', description: 'Office or outpatient visit, established patient, moderate medical decision making', category: 'Evaluation & Management', medicareRate: 112.27, typicalCharge: 211.00, facilityFee: 81.67, nonFacilityFee: 112.27, rvuWork: 1.30, rvuTotal: 1.92 },
  { code: '99214', description: 'Office or outpatient visit, established patient, high medical decision making', category: 'Evaluation & Management', medicareRate: 167.39, typicalCharge: 315.00, facilityFee: 121.72, nonFacilityFee: 167.39, rvuWork: 1.92, rvuTotal: 2.80 },
  { code: '99215', description: 'Office or outpatient visit, established patient, highest medical decision making', category: 'Evaluation & Management', medicareRate: 215.44, typicalCharge: 405.00, facilityFee: 156.64, nonFacilityFee: 215.44, rvuWork: 2.80, rvuTotal: 3.68 },
  { code: '99232', description: 'Subsequent hospital inpatient or observation care, moderate complexity', category: 'Evaluation & Management', medicareRate: 119.68, typicalCharge: 225.00, facilityFee: 87.02, nonFacilityFee: 119.68, rvuWork: 1.39, rvuTotal: 1.99 },
  { code: '99233', description: 'Subsequent hospital care, high complexity', category: 'Evaluation & Management', medicareRate: 175.38, typicalCharge: 330.00, facilityFee: 127.53, nonFacilityFee: 175.38, rvuWork: 2.00, rvuTotal: 2.89 },
  { code: '99291', description: 'Critical care, first 30-74 minutes', category: 'Evaluation & Management', medicareRate: 361.60, typicalCharge: 680.00, facilityFee: 263.00, nonFacilityFee: 361.60, rvuWork: 4.50, rvuTotal: 5.89 },

  // ── Preventive Medicine ────────────────────────────────────────────────
  { code: '99395', description: 'Periodic comprehensive preventive medicine, established patient 18-39 years', category: 'Preventive Medicine', medicareRate: 0.00, typicalCharge: 285.00, facilityFee: 0.00, nonFacilityFee: 0.00, rvuWork: 1.74, rvuTotal: 2.98 },
  { code: '99396', description: 'Periodic comprehensive preventive medicine, established patient 40-64 years', category: 'Preventive Medicine', medicareRate: 0.00, typicalCharge: 310.00, facilityFee: 0.00, nonFacilityFee: 0.00, rvuWork: 1.96, rvuTotal: 3.34 },
  { code: 'G0402', description: 'Initial preventive physical examination (Welcome to Medicare)', category: 'Preventive Medicine', medicareRate: 175.50, typicalCharge: 290.00, facilityFee: 127.62, nonFacilityFee: 175.50, rvuWork: 2.50, rvuTotal: 3.12 },
  { code: 'G0438', description: 'Annual wellness visit, initial', category: 'Preventive Medicine', medicareRate: 183.15, typicalCharge: 298.00, facilityFee: 133.20, nonFacilityFee: 183.15, rvuWork: 2.43, rvuTotal: 3.21 },
  { code: 'G0439', description: 'Annual wellness visit, subsequent', category: 'Preventive Medicine', medicareRate: 125.98, typicalCharge: 205.00, facilityFee: 91.62, nonFacilityFee: 125.98, rvuWork: 1.50, rvuTotal: 2.21 },

  // ── Cardiology ─────────────────────────────────────────────────────────
  { code: '93000', description: 'Electrocardiogram, routine ECG with at least 12 leads', category: 'Cardiology', medicareRate: 16.20, typicalCharge: 89.00, facilityFee: 11.76, nonFacilityFee: 16.20, rvuWork: 0.17, rvuTotal: 0.32 },
  { code: '93306', description: 'Echocardiography, transthoracic, real-time image, Doppler', category: 'Cardiology', medicareRate: 241.31, typicalCharge: 2100.00, facilityFee: 175.39, nonFacilityFee: 241.31, rvuWork: 1.17, rvuTotal: 3.96 },
  { code: '93510', description: 'Left heart catheterization, retrograde', category: 'Cardiology', medicareRate: 1089.50, typicalCharge: 8500.00, facilityFee: 791.98, nonFacilityFee: 1089.50, rvuWork: 5.60, rvuTotal: 11.20 },
  { code: '93880', description: 'Duplex scan of extracranial arteries, complete bilateral', category: 'Cardiology', medicareRate: 244.78, typicalCharge: 950.00, facilityFee: 178.05, nonFacilityFee: 244.78, rvuWork: 0.90, rvuTotal: 3.84 },
  { code: '33533', description: 'Coronary artery bypass, arterial, single', category: 'Cardiology', medicareRate: 2756.80, typicalCharge: 48000.00, facilityFee: 2003.41, nonFacilityFee: 2756.80, rvuWork: 33.44, rvuTotal: 45.28 },

  // ── Radiology ──────────────────────────────────────────────────────────
  { code: '70450', description: 'CT scan of head or brain without contrast', category: 'Radiology', medicareRate: 155.03, typicalCharge: 1850.00, facilityFee: 112.73, nonFacilityFee: 155.03, rvuWork: 0.64, rvuTotal: 2.46 },
  { code: '70553', description: 'MRI of brain, without and with contrast', category: 'Radiology', medicareRate: 373.61, typicalCharge: 3200.00, facilityFee: 271.62, nonFacilityFee: 373.61, rvuWork: 1.83, rvuTotal: 5.89 },
  { code: '71046', description: 'Radiologic exam, chest, 2 views', category: 'Radiology', medicareRate: 43.20, typicalCharge: 285.00, facilityFee: 31.40, nonFacilityFee: 43.20, rvuWork: 0.22, rvuTotal: 0.68 },
  { code: '74177', description: 'CT abdomen and pelvis with contrast', category: 'Radiology', medicareRate: 309.76, typicalCharge: 3800.00, facilityFee: 225.24, nonFacilityFee: 309.76, rvuWork: 1.31, rvuTotal: 4.92 },
  { code: '77067', description: 'Screening mammography, bilateral', category: 'Radiology', medicareRate: 97.88, typicalCharge: 450.00, facilityFee: 71.17, nonFacilityFee: 97.88, rvuWork: 0.54, rvuTotal: 1.45 },
  { code: '78300', description: 'Bone and joint imaging, whole body', category: 'Radiology', medicareRate: 196.40, typicalCharge: 1800.00, facilityFee: 142.84, nonFacilityFee: 196.40, rvuWork: 0.79, rvuTotal: 2.73 },

  // ── Laboratory ─────────────────────────────────────────────────────────
  { code: '80053', description: 'Comprehensive metabolic panel', category: 'Laboratory', medicareRate: 14.44, typicalCharge: 98.00, facilityFee: 10.50, nonFacilityFee: 14.44, rvuWork: 0.00, rvuTotal: 0.22 },
  { code: '80061', description: 'Lipid panel (cholesterol, triglycerides, HDL, LDL)', category: 'Laboratory', medicareRate: 20.53, typicalCharge: 125.00, facilityFee: 14.93, nonFacilityFee: 20.53, rvuWork: 0.00, rvuTotal: 0.32 },
  { code: '85025', description: 'Complete blood count (CBC), automated', category: 'Laboratory', medicareRate: 8.94, typicalCharge: 42.00, facilityFee: 6.50, nonFacilityFee: 8.94, rvuWork: 0.00, rvuTotal: 0.14 },
  { code: '85730', description: 'Thromboplastin time, partial (PTT)', category: 'Laboratory', medicareRate: 7.37, typicalCharge: 38.00, facilityFee: 5.36, nonFacilityFee: 7.37, rvuWork: 0.00, rvuTotal: 0.12 },
  { code: '83036', description: 'Hemoglobin; glycosylated (HbA1c)', category: 'Laboratory', medicareRate: 17.89, typicalCharge: 78.00, facilityFee: 13.01, nonFacilityFee: 17.89, rvuWork: 0.00, rvuTotal: 0.28 },
  { code: '86140', description: 'C-reactive protein', category: 'Laboratory', medicareRate: 8.18, typicalCharge: 55.00, facilityFee: 5.95, nonFacilityFee: 8.18, rvuWork: 0.00, rvuTotal: 0.13 },
  { code: '87340', description: 'Antigen detection, Hepatitis B surface antigen (HBsAg)', category: 'Laboratory', medicareRate: 16.79, typicalCharge: 72.00, facilityFee: 12.21, nonFacilityFee: 16.79, rvuWork: 0.00, rvuTotal: 0.26 },
  { code: '87491', description: 'NAAT for Chlamydia trachomatis', category: 'Laboratory', medicareRate: 35.20, typicalCharge: 185.00, facilityFee: 25.60, nonFacilityFee: 35.20, rvuWork: 0.00, rvuTotal: 0.55 },

  // ── Surgery / Procedures ───────────────────────────────────────────────
  { code: '27447', description: 'Arthroplasty, knee, condyle and plateau; medial AND lateral compartments', category: 'Orthopedic Surgery', medicareRate: 1824.34, typicalCharge: 28000.00, facilityFee: 1326.00, nonFacilityFee: 1824.34, rvuWork: 22.43, rvuTotal: 28.96 },
  { code: '27130', description: 'Arthroplasty, acetabular and proximal femoral prosthetic replacement (total hip arthroplasty)', category: 'Orthopedic Surgery', medicareRate: 1621.14, typicalCharge: 26000.00, facilityFee: 1178.56, nonFacilityFee: 1621.14, rvuWork: 20.11, rvuTotal: 26.78 },
  { code: '44950', description: 'Appendectomy', category: 'General Surgery', medicareRate: 617.89, typicalCharge: 8500.00, facilityFee: 449.34, nonFacilityFee: 617.89, rvuWork: 7.42, rvuTotal: 10.24 },
  { code: '47562', description: 'Laparoscopic cholecystectomy', category: 'General Surgery', medicareRate: 758.22, typicalCharge: 10800.00, facilityFee: 551.20, nonFacilityFee: 758.22, rvuWork: 9.13, rvuTotal: 12.41 },
  { code: '31622', description: 'Bronchoscopy, rigid or flexible; diagnostic', category: 'Pulmonology', medicareRate: 314.76, typicalCharge: 1850.00, facilityFee: 228.84, nonFacilityFee: 314.76, rvuWork: 2.25, rvuTotal: 4.87 },
  { code: '45378', description: 'Colonoscopy, flexible; diagnostic', category: 'Gastroenterology', medicareRate: 233.80, typicalCharge: 1800.00, facilityFee: 170.00, nonFacilityFee: 233.80, rvuWork: 2.67, rvuTotal: 3.92 },
  { code: '43239', description: 'Upper GI endoscopy, including biopsy of esophagus, stomach, or duodenum', category: 'Gastroenterology', medicareRate: 189.26, typicalCharge: 1400.00, facilityFee: 137.60, nonFacilityFee: 189.26, rvuWork: 2.00, rvuTotal: 3.12 },

  // ── Dialysis ────────────────────────────────────────────────────────────
  { code: '90935', description: 'Hemodialysis procedure; with single evaluation by a physician', category: 'Dialysis', medicareRate: 34.23, typicalCharge: 385.00, facilityFee: 24.89, nonFacilityFee: 34.23, rvuWork: 0.44, rvuTotal: 0.58 },
  { code: 'G0257', description: 'Unscheduled or emergency ESRD dialysis treatment', category: 'Dialysis', medicareRate: 55.12, typicalCharge: 620.00, facilityFee: 40.08, nonFacilityFee: 55.12, rvuWork: 0.70, rvuTotal: 0.93 },

  // ── Mental Health ──────────────────────────────────────────────────────
  { code: '90832', description: 'Psychotherapy, 30 minutes', category: 'Mental Health', medicareRate: 68.15, typicalCharge: 175.00, facilityFee: 49.56, nonFacilityFee: 68.15, rvuWork: 0.87, rvuTotal: 1.17 },
  { code: '90837', description: 'Psychotherapy, 60 minutes', category: 'Mental Health', medicareRate: 131.56, typicalCharge: 320.00, facilityFee: 95.67, nonFacilityFee: 131.56, rvuWork: 1.77, rvuTotal: 2.33 },
  { code: '90847', description: 'Family psychotherapy (with patient present), 50 minutes', category: 'Mental Health', medicareRate: 122.34, typicalCharge: 295.00, facilityFee: 88.99, nonFacilityFee: 122.34, rvuWork: 1.71, rvuTotal: 2.15 },

  // ── Chemotherapy ───────────────────────────────────────────────────────
  { code: '96409', description: 'Chemotherapy administration; intravenous, push technique, single or initial substance', category: 'Oncology', medicareRate: 161.29, typicalCharge: 985.00, facilityFee: 117.28, nonFacilityFee: 161.29, rvuWork: 0.17, rvuTotal: 2.56 },
  { code: '96413', description: 'Chemotherapy administration; intravenous infusion technique, up to 1 hour', category: 'Oncology', medicareRate: 194.46, typicalCharge: 1150.00, facilityFee: 141.43, nonFacilityFee: 194.46, rvuWork: 0.17, rvuTotal: 3.09 },
]

// ── ICD-10 to Procedure Mappings (most common) ───────────────────────────────

export const ICD10_PROCEDURE_MAPS: Icd10ProcedureMap[] = [
  // Diabetes
  { icd10Code: 'E11.9', procedureCode: '99213', relationship: 'primary' },
  { icd10Code: 'E11.9', procedureCode: '83036', relationship: 'primary' },
  { icd10Code: 'E11.9', procedureCode: '80053', relationship: 'common' },
  { icd10Code: 'E11.9', procedureCode: '80061', relationship: 'common' },
  // Hypertension
  { icd10Code: 'I10', procedureCode: '99213', relationship: 'primary' },
  { icd10Code: 'I10', procedureCode: '93000', relationship: 'common' },
  { icd10Code: 'I10', procedureCode: '80053', relationship: 'common' },
  // Heart failure
  { icd10Code: 'I50.9', procedureCode: '93306', relationship: 'primary' },
  { icd10Code: 'I50.9', procedureCode: '93000', relationship: 'primary' },
  { icd10Code: 'I50.9', procedureCode: '99232', relationship: 'common' },
  // STEMI
  { icd10Code: 'I21.3', procedureCode: '93510', relationship: 'primary' },
  { icd10Code: 'I21.3', procedureCode: '33533', relationship: 'related' },
  { icd10Code: 'I21.3', procedureCode: '93000', relationship: 'primary' },
  // Atrial fibrillation
  { icd10Code: 'I48.0', procedureCode: '93000', relationship: 'primary' },
  { icd10Code: 'I48.0', procedureCode: '93306', relationship: 'common' },
  // COPD
  { icd10Code: 'J44.1', procedureCode: '99233', relationship: 'primary' },
  { icd10Code: 'J44.1', procedureCode: '71046', relationship: 'common' },
  // Pneumonia
  { icd10Code: 'J18.9', procedureCode: '71046', relationship: 'primary' },
  { icd10Code: 'J18.9', procedureCode: '80053', relationship: 'primary' },
  { icd10Code: 'J18.9', procedureCode: '99232', relationship: 'common' },
  // CKD
  { icd10Code: 'N18.5', procedureCode: '90935', relationship: 'primary' },
  { icd10Code: 'N18.6', procedureCode: '90935', relationship: 'primary' },
  { icd10Code: 'N18.3', procedureCode: '80053', relationship: 'primary' },
  // Sepsis
  { icd10Code: 'A41.9', procedureCode: '99291', relationship: 'primary' },
  { icd10Code: 'A41.9', procedureCode: '80053', relationship: 'primary' },
  { icd10Code: 'A41.9', procedureCode: '85025', relationship: 'primary' },
  // Knee OA
  { icd10Code: 'M17.11', procedureCode: '27447', relationship: 'primary' },
  { icd10Code: 'M17.12', procedureCode: '27447', relationship: 'primary' },
  // Hip OA
  { icd10Code: 'M16.0', procedureCode: '27130', relationship: 'primary' },
  // Appendicitis
  { icd10Code: 'K35.80', procedureCode: '44950', relationship: 'primary' },
  // Gallstones
  { icd10Code: 'K80.20', procedureCode: '47562', relationship: 'primary' },
  // Wellness
  { icd10Code: 'Z00.00', procedureCode: 'G0439', relationship: 'primary' },
  { icd10Code: 'Z00.00', procedureCode: '80053', relationship: 'common' },
  { icd10Code: 'Z00.00', procedureCode: '85025', relationship: 'common' },
  // Colon cancer screening
  { icd10Code: 'Z12.11', procedureCode: '45378', relationship: 'primary' },
  // Depression
  { icd10Code: 'F32.9', procedureCode: '99214', relationship: 'primary' },
  { icd10Code: 'F32.9', procedureCode: '90837', relationship: 'common' },
  // Anxiety
  { icd10Code: 'F41.1', procedureCode: '99213', relationship: 'primary' },
  { icd10Code: 'F41.1', procedureCode: '90832', relationship: 'common' },
  // Chemotherapy
  { icd10Code: 'Z51.11', procedureCode: '96413', relationship: 'primary' },
  { icd10Code: 'C50.911', procedureCode: '96413', relationship: 'common' },
  { icd10Code: 'C50.911', procedureCode: '77067', relationship: 'common' },
  // MI
  { icd10Code: 'I20.9', procedureCode: '93000', relationship: 'primary' },
  { icd10Code: 'I20.9', procedureCode: '93510', relationship: 'related' },
  // Dyslipidemia
  { icd10Code: 'E78.5', procedureCode: '80061', relationship: 'primary' },
  { icd10Code: 'E78.00', procedureCode: '80061', relationship: 'primary' },
]

// ── Sample financial records linked to our 12 demo patients ──────────────────

export const SAMPLE_FINANCIAL_RECORDS = [
  { ehrId: 'ehr-001', icd10: 'I50.9', cpt: '93306', billed: 2100.00, allowed: 1680.00, insurance: 1344.00, patient: 336.00, status: 'PAID', payer: 'BlueCross BlueShield', serviceDate: '2026-06-08' },
  { ehrId: 'ehr-001', icd10: 'I10', cpt: '99214', billed: 315.00, allowed: 252.00, insurance: 201.60, patient: 50.40, status: 'PAID', payer: 'BlueCross BlueShield', serviceDate: '2026-06-08' },
  { ehrId: 'ehr-002', icd10: 'I21.3', cpt: '93510', billed: 8500.00, allowed: 6800.00, insurance: 5440.00, patient: 1360.00, status: 'SUBMITTED', payer: 'Aetna', serviceDate: '2026-06-10' },
  { ehrId: 'ehr-002', icd10: 'I21.3', cpt: '99291', billed: 680.00, allowed: 544.00, insurance: 435.20, patient: 108.80, status: 'SUBMITTED', payer: 'Aetna', serviceDate: '2026-06-10' },
  { ehrId: 'ehr-003', icd10: 'E11.9', cpt: '99213', billed: 211.00, allowed: 168.80, insurance: 135.04, patient: 33.76, status: 'PAID', payer: 'UnitedHealthcare', serviceDate: '2026-06-05' },
  { ehrId: 'ehr-003', icd10: 'E11.9', cpt: '83036', billed: 78.00, allowed: 62.40, insurance: 49.92, patient: 12.48, status: 'PAID', payer: 'UnitedHealthcare', serviceDate: '2026-06-05' },
  { ehrId: 'ehr-004', icd10: 'I21.0', cpt: '33533', billed: 48000.00, allowed: 38400.00, insurance: 30720.00, patient: 7680.00, status: 'SUBMITTED', payer: 'Medicare Part B', serviceDate: '2026-06-09' },
  { ehrId: 'ehr-005', icd10: 'S82.001A', cpt: '27447', billed: 28000.00, allowed: 22400.00, insurance: 17920.00, patient: 4480.00, status: 'PENDING', payer: 'Cigna', serviceDate: '2026-06-07' },
  { ehrId: 'ehr-007', icd10: 'Z51.11', cpt: '96413', billed: 1150.00, allowed: 920.00, insurance: 736.00, patient: 184.00, status: 'PAID', payer: 'Humana', serviceDate: '2026-06-01' },
  { ehrId: 'ehr-008', icd10: 'J18.9', cpt: '71046', billed: 285.00, allowed: 228.00, insurance: 182.40, patient: 45.60, status: 'PAID', payer: 'Medicare Part B', serviceDate: '2026-06-09' },
  { ehrId: 'ehr-010', icd10: 'I48.20', cpt: '93306', billed: 2100.00, allowed: 1680.00, insurance: 1344.00, patient: 336.00, status: 'PENDING', payer: 'Anthem', serviceDate: '2026-06-04' },
  { ehrId: 'ehr-012', icd10: 'J45.901', cpt: '99233', billed: 330.00, allowed: 264.00, insurance: 211.20, patient: 52.80, status: 'SUBMITTED', payer: 'Kaiser Permanente', serviceDate: '2026-06-10' },
]

// ── Medicare eligibility for older patients ────────────────────────────────

export const SAMPLE_MEDICARE = [
  { ehrId: 'ehr-001', subjectId: 'sub-001', medicareId: 'MBI-1A2B3C4D5E', partA: true, partB: true, partC: false, partD: true, planName: null, effectiveDate: '2019-03-01', status: 'ELIGIBLE' },
  { ehrId: 'ehr-004', subjectId: 'sub-004', medicareId: 'MBI-9X8Y7Z6W5V', partA: true, partB: true, partC: true, partD: true, planName: 'Humana Gold Plus', effectiveDate: '2034-04-01', status: 'ELIGIBLE' },
  { ehrId: 'ehr-006', subjectId: 'sub-006', medicareId: 'MBI-3K2J1H0G9F', partA: true, partB: true, partC: false, partD: true, planName: null, effectiveDate: '2010-01-01', status: 'ELIGIBLE' },
  { ehrId: 'ehr-008', subjectId: 'sub-008', medicareId: 'MBI-7T6S5R4Q3P', partA: true, partB: true, partC: false, partD: false, planName: null, effectiveDate: '2001-12-01', status: 'ELIGIBLE' },
  { ehrId: 'ehr-010', subjectId: 'sub-010', medicareId: 'MBI-2N1M0L9K8J', partA: true, partB: true, partC: true, partD: true, planName: 'Aetna Medicare Advantage', effectiveDate: '2027-02-01', status: 'ELIGIBLE' },
  { ehrId: 'ehr-002', subjectId: 'sub-002', medicareId: null, partA: false, partB: false, partC: false, partD: false, planName: null, effectiveDate: null, status: 'INELIGIBLE' },
  { ehrId: 'ehr-003', subjectId: 'sub-003', medicareId: null, partA: false, partB: false, partC: false, partD: false, planName: null, effectiveDate: null, status: 'INELIGIBLE' },
]
