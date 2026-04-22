import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const students = [
  { Num: '2024101', Nom: 'DUPONT', Prénom: 'Alice', Email: 'alice.dupont@etudiant.fr' },
  { Num: '2024102', Nom: 'MARTIN', Prénom: 'Baptiste', Email: 'baptiste.martin@etudiant.fr' },
  { Num: '2024103', Nom: 'BERNARD', Prénom: 'Clara', Email: 'clara.bernard@etudiant.fr' },
  { Num: '2024104', Nom: 'THOMAS', Prénom: 'David', Email: 'david.thomas@etudiant.fr' },
  { Num: '2024105', Nom: 'PETIT', Prénom: 'Emma', Email: 'emma.petit@etudiant.fr' },
  { Num: '2024106', Nom: 'ROBERT', Prénom: 'Florian', Email: '' },
  { Num: '2024107', Nom: 'RICHARD', Prénom: 'Gabrielle', Email: 'gabrielle.richard@etudiant.fr' },
  { Num: '2024108', Nom: 'DURAND', Prénom: 'Hugo', Email: 'hugo.durand@etudiant.fr' },
  { Num: '2024109', Nom: 'LEROY', Prénom: 'Inès', Email: 'ines.leroy@etudiant.fr' },
  { Num: '2024110', Nom: 'MOREAU', Prénom: 'Julien', Email: 'julien.moreau@etudiant.fr' },
  // Ligne intentionnellement invalide (pas de Num) pour tester la gestion d'erreur
  { Num: '', Nom: 'SIMON', Prénom: 'Kevin', Email: 'kevin.simon@etudiant.fr' },
  { Num: '2024112', Nom: 'LAURENT', Prénom: 'Laura', Email: 'laura.laurent@etudiant.fr' },
  { Num: '2024113', Nom: 'LEFEBVRE', Prénom: 'Maxime', Email: 'maxime.lefebvre@etudiant.fr' },
  { Num: '2024114', Nom: 'MICHEL', Prénom: 'Noémie', Email: '' },
  { Num: '2024115', Nom: 'GARCIA', Prénom: 'Oscar', Email: 'oscar.garcia@etudiant.fr' },
];

const workbook = new ExcelJS.Workbook();
workbook.creator = 'Review360N';
workbook.created = new Date();

const sheet = workbook.addWorksheet('Étudiants');

// En-têtes stylisés
sheet.columns = [
  { header: 'Num',    key: 'Num',    width: 14 },
  { header: 'Nom',    key: 'Nom',    width: 18 },
  { header: 'Prénom', key: 'Prénom', width: 18 },
  { header: 'Email',  key: 'Email',  width: 34 },
];

// Style en-tête
sheet.getRow(1).eachCell((cell) => {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF667EEA' } };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = {
    bottom: { style: 'medium', color: { argb: 'FF764BA2' } },
  };
});
sheet.getRow(1).height = 22;

// Données
students.forEach((s, i) => {
  const row = sheet.addRow(s);
  row.height = 18;
  // Ligne invalide en rouge clair pour illustration
  if (!s.Num) {
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0F0' } };
    });
  }
  // Lignes alternées
  else if (i % 2 === 0) {
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    });
  }
});

// Bordures colonnes
sheet.eachRow((row) => {
  row.eachCell((cell) => {
    cell.border = {
      ...cell.border,
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    };
  });
});

const outputPath = join(__dirname, '../../../../test-import-etudiants.xlsx');
await workbook.xlsx.writeFile(outputPath);
console.log(`✅ Fichier généré : ${outputPath}`);
console.log(`   ${students.filter(s => s.Num).length} étudiants valides + 1 ligne invalide (test erreur)`);
