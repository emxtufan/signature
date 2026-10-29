// Textul procesului-verbal, folosit atât în pagină cât și în documentul Word/PDF.

export const COMPANY = 'GREENTECH PROFESSIONALS SRL';
export const COMPANY_IDS = 'CUI: RO 36582140 | Nr. Reg. Com.: J40/12984/2016';
export const TITLE = 'PROCES-VERBAL DE INSTRUIRE A ANGAJAȚILOR';
export const SUBTITLE = 'privind protecția datelor cu caracter personal – GDPR (Regulamentul UE 2016/679)';

export const SECTIONS: { title: string; text: string }[] = [
  {
    title: '1. Cadrul general și principiile GDPR',
    text: 'Instruirea a vizat dispozițiile Regulamentului (UE) 2016/679 privind protecția persoanelor fizice în ceea ce privește prelucrarea datelor cu caracter personal. Au fost prezentate principiile: legalitatea, echitatea și transparența; limitarea legată de scop; reducerea la minimum a datelor; exactitatea datelor; limitarea legată de stocare; integritatea și confidențialitatea.',
  },
  {
    title: '2. Obligația de confidențialitate',
    text: 'Angajații au fost informați că au obligația de a păstra confidențialitatea datelor cu caracter personal la care au acces, atât pe durata contractului de muncă, cât și după încetarea acestuia. Este interzisă comunicarea, copierea sau utilizarea acestor date în alte scopuri decât cele necesare îndeplinirii sarcinilor de serviciu.',
  },
  {
    title: '3. Măsuri tehnice și organizatorice',
    text: 'Au fost prezentate măsurile obligatorii: biroul și ecranul curat; blocarea calculatorului la părăsirea postului de lucru; interzicerea partajării parolelor; folosirea exclusivă a adreselor de email de serviciu; interzicerea conectării dispozitivelor de stocare neautorizate.',
  },
  {
    title: '4. Procedura în caz de incident de securitate',
    text: 'Orice incident, pierdere, acces neautorizat sau suspiciune privind securitatea datelor se raportează imediat conducerii sau persoanei responsabile GDPR, în maximum 1 oră, pentru ca societatea să poată notifica ANSPDCP în termenul legal de 72 de ore.',
  },
  {
    title: '5. Răspunderea în caz de încălcare',
    text: 'Încălcarea regulilor de protecție a datelor constituie abatere disciplinară și se sancționează conform Codului Muncii și Regulamentului Intern, fără a exclude răspunderea patrimonială, contravențională, civilă sau penală.',
  },
];

export const DECLARATION = `Subsemnații, angajați ai ${COMPANY}, declarăm prin semnătură că am participat la instruirea privind protecția datelor cu caracter personal, am luat la cunoștință conținutul prezentat și ne angajăm să respectăm regulile și procedurile menționate.`;
