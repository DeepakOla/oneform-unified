// @ts-nocheck
/**
 * OneForm Platform - Standardized Field Mapping Definitions
 */

export const standardFieldTypes = {
  // Section A: Personal Information
  'person.name.full': 'Full Name',
  'person.name.first': 'First Name',
  'person.name.last': 'Last Name / Surname',
  'person.name.middle': 'Middle Name',
  'person.parent.father_name': "Father's Name",
  'person.parent.mother_name': "Mother's Name",
  'person.parent.guardian_name': "Guardian's Name",
  'person.spouse_name': "Spouse's Name",
  
  // Contact
  'person.contact.email': 'Email Address',
  'person.contact.phone': 'Phone / Mobile Number',
  'person.contact.alt_phone': 'Alternate Phone',
  
  // Personal Details
  'person.dob': 'Date of Birth',
  'person.gender': 'Gender',
  'person.age': 'Age',
  'person.blood_group': 'Blood Group',
  'person.marital_status': 'Marital Status',
  'person.nationality': 'Nationality',
  'person.religion': 'Religion',
  
  // Identity Documents (India-specific)
  'person.identity.aadhar': 'Aadhaar Number',
  'person.identity.pan': 'PAN Card Number',
  'person.identity.voter_id': 'Voter ID / EPIC',
  'person.identity.passport': 'Passport Number',
  'person.identity.driving_license': 'Driving License',
  'person.identity.ration_card': 'Ration Card Number',
  
  // Category (Indian reservation system)
  'person.category.caste': 'Caste / Category',
  'person.category.reservation': 'Reservation Category (SC/ST/OBC/General)',
  'person.category.pwd': 'Person with Disability (PwD)',
  'person.category.ews': 'Economically Weaker Section (EWS)',
  'person.category.ex_serviceman': 'Ex-Serviceman',
  
  // Address
  'person.address.line1': 'Address Line 1',
  'person.address.line2': 'Address Line 2',
  'person.address.house_no': 'House / Flat Number',
  'person.address.street': 'Street / Road',
  'person.address.locality': 'Locality / Area',
  'person.address.landmark': 'Landmark',
  'person.address.village': 'Village',
  'person.address.tehsil': 'Tehsil / Taluk / Block',
  'person.address.city': 'City / Town',
  'person.address.district': 'District',
  'person.address.state': 'State',
  'person.address.pincode': 'PIN Code',
  'person.address.country': 'Country',
  
  // Education
  'education.highest_degree': 'Highest Qualification',
  'education.institution': 'Institution / College / University',
  'education.board': 'Board / University',
  'education.year_of_passing': 'Year of Passing',
  'education.marks': 'Marks / Percentage / CGPA',
  'education.roll_number': 'Roll Number',
  'education.registration_number': 'Registration Number',
  'education.stream': 'Stream / Branch',
  
  // Employment
  'employment.occupation': 'Occupation / Profession',
  'employment.employer': 'Employer / Organization',
  'employment.designation': 'Designation / Post',
  'employment.experience': 'Experience (Years)',
  'employment.income': 'Annual Income',
  
  // Bank Details
  'bank.account_number': 'Bank Account Number',
  'bank.ifsc': 'IFSC Code',
  'bank.branch': 'Bank Branch',
  'bank.bank_name': 'Bank Name'
};

export const fieldExtractionRules = [
  // ==================== NAMES ====================
  {
    canonical: 'person.name.full',
    confidence: 0.90,
    patterns: [
      // English variations
      /^(full[\s_-]?)?name$/i,
      /applicant[\s_-]?name/i,
      /candidate[\s_-]?name/i,
      /your[\s_-]?name/i,
      
      // Hindi - हिंदी
      /नाम/,
      /पूरा[\s_-]?नाम/,
      /आवेदक[\s_-]?का[\s_-]?नाम/,
      
      // Tamil - தமிழ்
      /பெயர்/,
      /முழு[\s_-]?பெயர்/,
      
      // Telugu - తెలుగు
      /పేరు/,
      /పూర్తి[\s_-]?పేరు/,
      
      // Bengali - বাংলা
      /নাম/,
      /পুরো[\s_-]?নাম/,
      
      // Marathi - मराठी
      /नाव/,
      /पूर्ण[\s_-]?नाव/,
      
      // Gujarati - ગુજરાતી
      /નામ/,
      /પૂરું[\s_-]?નામ/,
      
      // Kannada - ಕನ್ನಡ
      /ಹೆಸರು/,
      /ಪೂರ್ಣ[\s_-]?ಹೆಸರು/,
      
      // Malayalam - മലയാളം
      /പേര്/,
      /മുഴുവൻ[\s_-]?പേര്/,
      
      // Punjabi - ਪੰਜਾਬੀ
      /ਨਾਮ/,
      /ਪੂਰਾ[\s_-]?ਨਾਮ/,
      
      // Odia - ଓଡ଼ିଆ
      /ନାମ/,
      /ସମ୍ପୂର୍ଣ୍ଣ[\s_-]?ନାମ/
    ]
  },
  
  {
    canonical: 'person.parent.father_name',
    confidence: 0.95,
    patterns: [
      // English
      /father[\s_-]?('?s)?[\s_-]?name/i,
      /father[\s_-]?name/i,
      /dad[\s_-]?name/i,
      /papa[\s_-]?name/i,
      /s\/o/i, // Son of
      /d\/o/i, // Daughter of
      
      // Hindi
      /पिता[\s_-]?(का[\s_-]?)?नाम/,
      /बाप[\s_-]?का[\s_-]?नाम/,
      
      // Tamil
      /தந்தை[\s_-]?பெயர்/,
      /அப்பா[\s_-]?பெயர்/,
      
      // Telugu
      /తండ్రి[\s_-]?పేరు/,
      /నాన్న[\s_-]?పేరు/,
      
      // Bengali
      /পিতার[\s_-]?নাম/,
      /বাবার[\s_-]?নাম/,
      
      // Marathi
      /वडिलांचे[\s_-]?नाव/,
      
      // Gujarati
      /પિતાનું[\s_-]?નામ/,
      
      // Kannada
      /ತಂದೆಯ[\s_-]?ಹೆಸರು/,
      
      // Malayalam
      /പിതാവിന്റെ[\s_-]?പേര്/,
      /അച്ഛന്റെ[\s_-]?പേര്/,
      
      // Punjabi
      /ਪਿਤਾ[\s_-]?ਦਾ[\s_-]?ਨਾਮ/,
      
      // Odia
      /ପିତାଙ୍କ[\s_-]?ନାମ/
    ]
  },
  
  {
    canonical: 'person.parent.mother_name',
    confidence: 0.95,
    patterns: [
      // English
      /mother[\s_-]?('?s)?[\s_-]?name/i,
      /mother[\s_-]?name/i,
      /mom[\s_-]?name/i,
      
      // Hindi
      /माता[\s_-]?(का[\s_-]?)?नाम/,
      /माँ[\s_-]?का[\s_-]?नाम/,
      
      // Tamil
      /தாய்[\s_-]?பெயர்/,
      /அம்மா[\s_-]?பெயர்/,
      
      // Telugu
      /తల్లి[\s_-]?పేరు/,
      /అమ్మ[\s_-]?పేరు/,
      
      // Bengali
      /মাতার[\s_-]?নাম/,
      /মায়ের[\s_-]?নাম/,
      
      // Marathi
      /आईचे[\s_-]?नाव/,
      
      // Gujarati
      /માતાનું[\s_-]?નામ/,
      
      // Kannada
      /ತಾಯಿಯ[\s_-]?ಹೆಸರು/,
      
      // Malayalam
      /മാതാവിന്റെ[\s_-]?പേര്/,
      /അമ്മയുടെ[\s_-]?പേര്/,
      
      // Punjabi
      /ਮਾਤਾ[\s_-]?ਦਾ[\s_-]?ਨਾਮ/,
      
      // Odia
      /ମାତାଙ୍କ[\s_-]?ନାମ/
    ]
  },
  
  // ==================== CONTACT ====================
  {
    canonical: 'person.contact.email',
    confidence: 0.95,
    patterns: [
      // English
      /e[\s_-]?mail/i,
      /email[\s_-]?(address|id)?/i,
      
      // Hindi
      /ईमेल/,
      /ई-मेल/,
      
      // Tamil
      /மின்னஞ்சல்/,
      
      // Telugu
      /ఇమెయిల్/,
      
      // Bengali
      /ইমেইল/,
      /ই-মেইল/,
      
      // Other languages use English "email" commonly
      /ईमेल[\s_-]?पता/
    ]
  },
  
  {
    canonical: 'person.contact.phone',
    confidence: 0.90,
    patterns: [
      // English
      /phone/i,
      /mobile/i,
      /contact[\s_-]?(no|number)?/i,
      /cell[\s_-]?(phone)?/i,
      /tel(ephone)?/i,
      /mob[\s_-]?(no|number)?/i,
      
      // Hindi
      /फ़ोन/,
      /फोन/,
      /मोबाइल/,
      /दूरभाष/,
      /संपर्क[\s_-]?नंबर/,
      
      // Tamil
      /தொலைபேசி/,
      /கைபேசி/,
      
      // Telugu
      /ఫోన్/,
      /మొబైల్/,
      
      // Bengali
      /ফোন/,
      /মোবাইল/,
      
      // Marathi
      /फोन/,
      /भ्रमणध्वनी/,
      
      // Gujarati
      /ફોન/,
      /મોબાઇલ/,
      
      // Kannada
      /ಫೋನ್/,
      /ಮೊಬೈಲ್/,
      
      // Malayalam
      /ഫോൺ/,
      /മൊബൈൽ/,
      
      // Punjabi
      /ਫ਼ੋਨ/,
      /ਮੋਬਾਈਲ/,
      
      // Odia
      /ଫୋନ୍/,
      /ମୋବାଇଲ୍/
    ]
  },
  
  // ==================== PERSONAL DETAILS ====================
  {
    canonical: 'person.dob',
    confidence: 0.95,
    patterns: [
      // English
      /d\.?o\.?b\.?/i,
      /date[\s_-]?(of[\s_-]?)?birth/i,
      /birth[\s_-]?date/i,
      /born[\s_-]?(on|date)/i,
      
      // Hindi
      /जन्म[\s_-]?(की[\s_-]?)?तारीख/,
      /जन्म[\s_-]?तिथि/,
      /जन्मतिथि/,
      
      // Tamil
      /பிறந்த[\s_-]?தேதி/,
      
      // Telugu
      /పుట్టిన[\s_-]?తేదీ/,
      /జన్మ[\s_-]?తేదీ/,
      
      // Bengali
      /জন্ম[\s_-]?তারিখ/,
      
      // Marathi
      /जन्म[\s_-]?दिनांक/,
      /जन्मतारीख/,
      
      // Gujarati
      /જન્મ[\s_-]?તારીખ/,
      
      // Kannada
      /ಹುಟ್ಟಿದ[\s_-]?ದಿನಾಂಕ/,
      /ಜನ್ಮ[\s_-]?ದಿನಾಂಕ/,
      
      // Malayalam
      /ജനന[\s_-]?തീയതി/,
      
      // Punjabi
      /ਜਨਮ[\s_-]?ਮਿਤੀ/,
      
      // Odia
      /ଜନ୍ମ[\s_-]?ତାରିଖ/
    ]
  },
  
  {
    canonical: 'person.gender',
    confidence: 0.90,
    patterns: [
      // English
      /gender/i,
      /sex/i,
      
      // Hindi
      /लिंग/,
      /जेंडर/,
      
      // Tamil
      /பாலினம்/,
      
      // Telugu
      /లింగం/,
      
      // Bengali
      /লিঙ্গ/,
      
      // Marathi
      /लिंग/,
      
      // Gujarati
      /લિંગ/,
      
      // Kannada
      /ಲಿಂಗ/,
      
      // Malayalam
      /ലിംഗം/,
      
      // Punjabi
      /ਲਿੰਗ/,
      
      // Odia
      /ଲିଙ୍ଗ/
    ]
  },
  
  // ==================== IDENTITY DOCUMENTS ====================
  {
    canonical: 'person.identity.aadhar',
    confidence: 0.98,
    patterns: [
      // English variations (including typos)
      /aadh?a?r/i,
      /adhaar/i,
      /aadhar/i,
      /aadhaar/i,
      /adhar/i,
      /uid/i,
      /uidai/i,
      /unique[\s_-]?id/i,
      
      // Hindi
      /आधार/,
      /आधार[\s_-]?संख्या/,
      /आधार[\s_-]?नंबर/,
      /आधार[\s_-]?कार्ड/,
      
      // Tamil
      /ஆதார்/,
      
      // Telugu
      /ఆధార్/,
      
      // Bengali
      /আধার/,
      
      // Marathi
      /आधार/,
      
      // Gujarati
      /આધાર/,
      
      // Kannada
      /ಆಧಾರ್/,
      
      // Malayalam
      /ആധാർ/,
      
      // Punjabi
      /ਆਧਾਰ/,
      
      // Odia
      /ଆଧାର/
    ]
  },
  
  {
    canonical: 'person.identity.pan',
    confidence: 0.98,
    patterns: [
      // English
      /pan/i,
      /pan[\s_-]?(card|no|number)?/i,
      /permanent[\s_-]?account[\s_-]?number/i,
      
      // Hindi
      /पैन/,
      /पैन[\s_-]?कार्ड/,
      /पैन[\s_-]?नंबर/,
      
      // Common across languages (use English "PAN")
      /पॅन/  // Marathi
    ]
  },
  
  {
    canonical: 'person.identity.voter_id',
    confidence: 0.95,
    patterns: [
      // English
      /voter[\s_-]?(id|card)?/i,
      /epic/i,
      /election[\s_-]?card/i,
      
      // Hindi
      /मतदाता[\s_-]?(पहचान[\s_-]?)?पत्र/,
      /वोटर[\s_-]?आईडी/,
      
      // Tamil
      /வாக்காளர்[\s_-]?அட்டை/,
      
      // Telugu
      /ఓటరు[\s_-]?గుర్తింపు/,
      
      // Bengali
      /ভোটার[\s_-]?আইডি/
    ]
  },
  
  // ==================== CATEGORY (Indian Reservation) ====================
  {
    canonical: 'person.category.caste',
    confidence: 0.90,
    patterns: [
      // English
      /caste/i,
      /category/i,
      /social[\s_-]?category/i,
      
      // Hindi
      /जाति/,
      /वर्ग/,
      /श्रेणी/,
      
      // Tamil
      /சாதி/,
      /வகுப்பு/,
      
      // Telugu
      /కులం/,
      /వర్గం/,
      
      // Bengali
      /জাতি/,
      /বর্গ/,
      
      // Marathi
      /जात/,
      /प्रवर्ग/,
      
      // Gujarati
      /જાતિ/,
      
      // Kannada
      /ಜಾತಿ/,
      /ವರ್ಗ/,
      
      // Malayalam
      /ജാതി/,
      
      // Punjabi
      /ਜਾਤੀ/,
      
      // Odia
      /ଜାତି/
    ]
  },
  
  {
    canonical: 'person.category.reservation',
    confidence: 0.95,
    patterns: [
      // Category values
      /sc/i,
      /st/i,
      /obc/i,
      /gen(eral)?/i,
      /ur/i,  // Unreserved
      /ews/i, // Economically Weaker Section
      
      // Hindi
      /अनुसूचित[\s_-]?जाति/,
      /अनुसूचित[\s_-]?जनजाति/,
      /अन्य[\s_-]?पिछड़ा[\s_-]?वर्ग/,
      /सामान्य/,
      
      // Combined patterns
      /आरक्षण[\s_-]?श्रेणी/
    ]
  },
  
  {
    canonical: 'person.category.pwd',
    confidence: 0.95,
    patterns: [
      // English
      /pwd/i,
      /p\.?w\.?d\.?/i,
      /disab(ility|led)/i,
      /differently[\s_-]?abled/i,
      /divyang/i,
      /handicap/i,
      /physically[\s_-]?challenged/i,
      
      // Hindi
      /विकलांग/,
      /दिव्यांग/,
      /विकलांगता/
    ]
  },
  
  // ==================== ADDRESS ====================
  {
    canonical: 'person.address.line1',
    confidence: 0.85,
    patterns: [
      // English
      /address[\s_-]?(line[\s_-]?)?1/i,
      /^address$/i,
      /street[\s_-]?address/i,
      /residential[\s_-]?address/i,
      
      // Hindi
      /पता/,
      /निवास[\s_-]?पता/,
      
      // Tamil
      /முகவரி/,
      
      // Telugu
      /చిరునామా/,
      
      // Bengali
      /ঠিকানা/,
      
      // Marathi
      /पत्ता/,
      
      // Gujarati
      /સરનામું/,
      
      // Kannada
      /ವಿಳಾಸ/,
      
      // Malayalam
      /വിലാസം/,
      
      // Punjabi
      /ਪਤਾ/,
      
      // Odia
      /ଠିକଣା/
    ]
  },
  
  {
    canonical: 'person.address.village',
    confidence: 0.90,
    patterns: [
      // English
      /village/i,
      /gram/i,
      
      // Hindi
      /गाँव/,
      /गांव/,
      /ग्राम/,
      
      // Tamil
      /கிராமம்/,
      
      // Telugu
      /గ్రామం/,
      
      // Bengali
      /গ্রাম/,
      
      // Marathi
      /गाव/,
      
      // Gujarati
      /ગામ/,
      
      // Kannada
      /ಗ್ರಾಮ/,
      
      // Malayalam
      /ഗ്രാമം/,
      
      // Punjabi
      /ਪਿੰਡ/,
      
      // Odia
      /ଗ୍ରାମ/
    ]
  },
  
  {
    canonical: 'person.address.tehsil',
    confidence: 0.90,
    patterns: [
      // English
      /tehsil/i,
      /taluk/i,
      /taluka/i,
      /block/i,
      /mandal/i,
      
      // Hindi
      /तहसील/,
      /तालुका/,
      /ब्लॉक/,
      
      // Tamil
      /வட்டம்/,
      /தாலுக்கா/,
      
      // Telugu
      /మండలం/,
      /తాలೂకా/,
      
      // Bengali
      /থানা/,
      /ব্লক/,
      
      // Kannada
      /ತಾಲೂಕು/
    ]
  },
  
  {
    canonical: 'person.address.district',
    confidence: 0.90,
    patterns: [
      // English
      /district/i,
      /dist/i,
      
      // Hindi
      /जिला/,
      /ज़िला/,
      
      // Tamil
      /மாவட்டம்/,
      
      // Telugu
      /జిల్లా/,
      
      // Bengali
      /জেলা/,
      
      // Marathi
      /जिल्हा/,
      
      // Gujarati
      /જિલ્લો/,
      
      // Kannada
      /ಜಿಲ್ಲೆ/,
      
      // Malayalam
      /ജില്ല/,
      
      // Punjabi
      /ਜ਼ਿਲ੍ਹਾ/,
      
      // Odia
      /ଜିଲ୍ଲା/
    ]
  },
  
  {
    canonical: 'person.address.state',
    confidence: 0.90,
    patterns: [
      // English
      /state/i,
      /province/i,
      
      // Hindi
      /राज्य/,
      /प्रदेश/,
      
      // Tamil
      /மாநிலம்/,
      
      // Telugu
      /రాష్ట్రం/,
      
      // Bengali
      /রাজ্য/,
      
      // Marathi
      /राज्य/,
      
      // Gujarati
      /રાજ્ય/,
      
      // Kannada
      /ರಾಜ್ಯ/,
      
      // Malayalam
      /സംസ്ഥാനം/,
      
      // Punjabi
      /ਰਾਜ/,
      
      // Odia
      /ରାଜ୍ୟ/
    ]
  },
  
  {
    canonical: 'person.address.pincode',
    confidence: 0.95,
    patterns: [
      // English
      /pin[\s_-]?code/i,
      /postal[\s_-]?code/i,
      /zip[\s_-]?code/i,
      /zip/i,
      /^pin$/i,
      
      // Hindi
      /पिन[\s_-]?कोड/,
      /डाक[\s_-]?कोड/,
      
      // Tamil
      /அஞ்சல்[\s_-]?குறியீடு/,
      
      // Telugu
      /పిన్[\s_-]?కోడ్/,
      
      // Bengali
      /পিন[\s_-]?কোড/
    ]
  },
  
  // ==================== EDUCATION ====================
  {
    canonical: 'education.highest_degree',
    confidence: 0.85,
    patterns: [
      // English
      /qualification/i,
      /education/i,
      /degree/i,
      /highest[\s_-]?(degree|qualification)/i,
      
      // Hindi
      /शिक्षा/,
      /योग्यता/,
      /डिग्री/,
      
      // Tamil
      /கல்வி/,
      /தகுதி/,
      
      // Telugu
      /విద్య/,
      /అర్హత/,
      
      // Bengali
      /শিক্ষাগত[\s_-]?যোগ্যতা/
    ]
  },
  
  {
    canonical: 'education.institution',
    confidence: 0.85,
    patterns: [
      // English
      /institution/i,
      /college/i,
      /university/i,
      /school/i,
      /institute/i,
      
      // Hindi
      /संस्था/,
      /कॉलेज/,
      /विश्वविद्यालय/,
      /विद्यालय/,
      
      // Tamil
      /கல்லூரி/,
      /பல்கலைக்கழகம்/
    ]
  },
  
  {
    canonical: 'education.year_of_passing',
    confidence: 0.90,
    patterns: [
      // English
      /year[\s_-]?(of[\s_-]?)?pass(ing)?/i,
      /passing[\s_-]?year/i,
      /graduation[\s_-]?year/i,
      
      // Hindi
      /उत्तीर्ण[\s_-]?वर्ष/,
      /पास[\s_-]?होने[\s_-]?का[\s_-]?वर्ष/
    ]
  },
  
  {
    canonical: 'education.marks',
    confidence: 0.85,
    patterns: [
      // English
      /marks/i,
      /percentage/i,
      /percent/i,
      /cgpa/i,
      /gpa/i,
      /grade/i,
      /score/i,
      
      // Hindi
      /अंक/,
      /प्रतिशत/,
      /ग्रेड/
    ]
  },
  
  // ==================== BANK DETAILS ====================
  {
    canonical: 'bank.account_number',
    confidence: 0.95,
    patterns: [
      // English
      /account[\s_-]?(no|number)/i,
      /bank[\s_-]?account/i,
      /a\/c[\s_-]?(no|number)?/i,
      
      // Hindi
      /खाता[\s_-]?संख्या/,
      /बैंक[\s_-]?खाता/
    ]
  },
  
  {
    canonical: 'bank.ifsc',
    confidence: 0.98,
    patterns: [
      // English
      /ifsc/i,
      /ifsc[\s_-]?code/i,
      
      // Hindi
      /आईएफएससी/
    ]
  }
];

// ==================== TRIGRAM FUZZY MATCHING ====================

/**
 * Generate trigrams from a string
 * Example: "name" → ["nam", "ame"]
 */
export function generateTrigrams(str) {
  if (!str || str.length < 3) return [];
  
  const normalized = str.toLowerCase().replace(/[\s_-]+/g, '');
  const trigrams = [];
  
  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.push(normalized.substring(i, i + 3));
  }
  
  return trigrams;
}

/**
 * Calculate similarity between two strings using trigram matching
 * Returns: 0.0 - 1.0 (1.0 = identical)
 */
export function trigramSimilarity(str1, str2) {
  const trigrams1 = generateTrigrams(str1);
  const trigrams2 = generateTrigrams(str2);
  
  if (trigrams1.length === 0 || trigrams2.length === 0) {
    return 0;
  }
  
  const set1 = new Set(trigrams1);
  const set2 = new Set(trigrams2);
  
  let intersection = 0;
  for (const t of set1) {
    if (set2.has(t)) intersection++;
  }
  
  // Jaccard similarity
  const union = set1.size + set2.size - intersection;
  return intersection / union;
}

// ==================== MAIN FIELD MAPPER ====================

/**
 * Detect canonical field type from form field info
 * Uses multi-language patterns + fuzzy matching
 * 
 * @param {Object} field - Field info { label, name, id, placeholder, type }
 * @returns {Object|null} - { canonical, confidence, source, language }
 */
export function detectFieldType(field) {
  const label = (field.label || '').trim();
  const name = (field.name || '').trim();
  const id = (field.id || '').trim();
  const placeholder = (field.placeholder || '').trim();
  
  // Combine all hints
  const combined = `${label} ${name} ${id} ${placeholder}`.trim();
  
  if (!combined) return null;
  
  // ==================== PASS 1: Exact Pattern Matching ====================
  for (const fieldDef of fieldExtractionRules) {
    for (const pattern of fieldDef.patterns) {
      if (pattern.test(label) || pattern.test(name) || pattern.test(id) || pattern.test(placeholder)) {
        return {
          canonical: fieldDef.canonical,
          confidence: fieldDef.confidence,
          source: 'pattern_match',
          matchedAgainst: pattern.toString()
        };
      }
    }
  }
  
  // ==================== PASS 2: Fuzzy Trigram Matching ====================
  // Only for English text (native scripts handled by regex above)
  if (/^[a-zA-Z\s_-]+$/.test(combined)) {
    let bestMatch = null;
    let bestScore = 0;
    
    const FUZZY_THRESHOLD = 0.6; // 60% similarity minimum
    
    // Check against common English field names
    const ENGLISH_FIELD_NAMES = {
      'person.name.full': ['full name', 'name', 'applicant name', 'candidate name'],
      'person.parent.father_name': ['father name', 'fathers name', 'father s name', 'dad name'],
      'person.parent.mother_name': ['mother name', 'mothers name', 'mother s name', 'mom name'],
      'person.contact.email': ['email', 'email address', 'e mail', 'email id'],
      'person.contact.phone': ['phone', 'mobile', 'phone number', 'mobile number', 'contact number'],
      'person.dob': ['date of birth', 'dob', 'birth date', 'birthday'],
      'person.gender': ['gender', 'sex'],
      'person.identity.aadhar': ['aadhaar', 'aadhar', 'aadhar number', 'uid', 'aadhaar number'],
      'person.identity.pan': ['pan', 'pan number', 'pan card', 'permanent account number'],
      'person.identity.voter_id': ['voter id', 'epic', 'voter card', 'election card'],
      'person.category.caste': ['caste', 'category', 'social category'],
      'person.address.line1': ['address', 'address line 1', 'street address', 'residential address'],
      'person.address.village': ['village', 'gram'],
      'person.address.tehsil': ['tehsil', 'taluk', 'taluka', 'block', 'mandal'],
      'person.address.district': ['district'],
      'person.address.state': ['state', 'province'],
      'person.address.pincode': ['pin code', 'pincode', 'postal code', 'zip code', 'zip'],
      'education.highest_degree': ['qualification', 'education', 'highest qualification', 'degree'],
      'education.institution': ['institution', 'college', 'university', 'school'],
      'education.year_of_passing': ['year of passing', 'passing year', 'graduation year'],
      'education.marks': ['marks', 'percentage', 'cgpa', 'gpa', 'grade', 'score'],
      'bank.account_number': ['account number', 'bank account', 'a/c number'],
      'bank.ifsc': ['ifsc', 'ifsc code']
    };
    
    for (const [canonical, variants] of Object.entries(ENGLISH_FIELD_NAMES)) {
      for (const variant of variants) {
        const score = trigramSimilarity(combined.toLowerCase(), variant);
        
        if (score > bestScore && score >= FUZZY_THRESHOLD) {
          bestScore = score;
          bestMatch = {
            canonical,
            confidence: Math.min(0.85, score), // Cap at 0.85 for fuzzy matches
            source: 'fuzzy_trigram',
            matchedAgainst: variant,
            similarityScore: score
          };
        }
      }
    }
    
    if (bestMatch) return bestMatch;
  }
  
  // ==================== PASS 3: Type-Based Fallback ====================
  // For fields with no label but known input type
  const inputType = (field.type || '').toLowerCase();
  
  const TYPE_HINTS = {
    'email': 'person.contact.email',
    'tel': 'person.contact.phone',
    'date': 'person.dob',  // Could be any date, but DOB is most common
    'number': null  // Too ambiguous
  };
  
  if (TYPE_HINTS[inputType]) {
    return {
      canonical: TYPE_HINTS[inputType],
      confidence: 0.70, // Lower confidence for type-only detection
      source: 'input_type',
      matchedAgainst: inputType
    };
  }
  
  return null;
}

/**
 * Batch detect fields (for efficiency)
 * 
 * @param {Array} fields - Array of field objects
 * @returns {Array} - Array of detection results
 */
function batchDetectFields(fields) {
  return fields.map(field => ({
    ...field,
    detection: detectFieldType(field)
  }));
}

/**
 * Get all supported canonical field definitions
 * 
 * @returns {Object} - { canonical: description }
 */
function getCanonicalFields() {
  return CANONICAL_FIELDS;
}

/**
 * Get supported languages
 * 
 * @returns {Array} - Array of language codes
 */
function getSupportedLanguages() {
  return [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिंदी' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' }
  ];
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    detectFieldType,
    batchDetectFields,
    getCanonicalFields,
    getSupportedLanguages,
    trigramSimilarity,
    generateTrigrams,
    FIELD_PATTERNS,
    CANONICAL_FIELDS
  };
}

if (typeof window !== 'undefined') {
  window.OneFormFieldMapper = {
    detectFieldType,
    batchDetectFields,
    getCanonicalFields,
    getSupportedLanguages,
    trigramSimilarity,
    generateTrigrams
  };
}
