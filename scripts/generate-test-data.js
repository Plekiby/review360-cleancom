// run from backend/ : node ../scripts/generate-test-data.js
import ExcelJS from 'exceljs';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'test-data');
await mkdir(outDir, { recursive: true });

const classes = [
  {
    name: 'MCO1A',
    students: [
      ['MCO1A-001', 'MARTIN', 'Emma', 'emma.martin@etudiant.cleancom.fr'],
      ['MCO1A-002', 'DUPONT', 'Lucas', 'lucas.dupont@etudiant.cleancom.fr'],
      ['MCO1A-003', 'BERNARD', 'Léa', 'lea.bernard@etudiant.cleancom.fr'],
      ['MCO1A-004', 'THOMAS', 'Noah', 'noah.thomas@etudiant.cleancom.fr'],
      ['MCO1A-005', 'PETIT', 'Camille', 'camille.petit@etudiant.cleancom.fr'],
      ['MCO1A-006', 'RICHARD', 'Chloé', 'chloe.richard@etudiant.cleancom.fr'],
      ['MCO1A-007', 'ROBERT', 'Louis', 'louis.robert@etudiant.cleancom.fr'],
      ['MCO1A-008', 'SIMON', 'Manon', 'manon.simon@etudiant.cleancom.fr'],
      ['MCO1A-009', 'MICHEL', 'Jade', 'jade.michel@etudiant.cleancom.fr'],
      ['MCO1A-010', 'LEFEBVRE', 'Théo', 'theo.lefebvre@etudiant.cleancom.fr'],
      ['MCO1A-011', 'LEROY', 'Sarah', 'sarah.leroy@etudiant.cleancom.fr'],
      ['MCO1A-012', 'MOREAU', 'Nathan', 'nathan.moreau@etudiant.cleancom.fr'],
      ['MCO1A-013', 'GIRARD', 'Inès', 'ines.girard@etudiant.cleancom.fr'],
      ['MCO1A-014', 'LAURENT', 'Tom', 'tom.laurent@etudiant.cleancom.fr'],
      ['MCO1A-015', 'MORIN', 'Clara', 'clara.morin@etudiant.cleancom.fr'],
      ['MCO1A-016', 'BERTRAND', 'Mathis', 'mathis.bertrand@etudiant.cleancom.fr'],
      ['MCO1A-017', 'MOREL', 'Lucie', 'lucie.morel@etudiant.cleancom.fr'],
      ['MCO1A-018', 'FOURNIER', 'Axel', 'axel.fournier@etudiant.cleancom.fr'],
      ['MCO1A-019', 'GARNIER', 'Anaïs', 'anais.garnier@etudiant.cleancom.fr'],
      ['MCO1A-020', 'BONNET', 'Hugo', 'hugo.bonnet@etudiant.cleancom.fr'],
      ['MCO1A-021', 'DUPUIS', 'Zoé', 'zoe.dupuis@etudiant.cleancom.fr'],
      ['MCO1A-022', 'FRANCOIS', 'Romain', 'romain.francois@etudiant.cleancom.fr'],
      ['MCO1A-023', 'ROBIN', 'Pauline', 'pauline.robin@etudiant.cleancom.fr'],
    ],
  },
  {
    name: 'MCO1B',
    students: [
      ['MCO1B-001', 'CHEVALIER', 'Lola', 'lola.chevalier@etudiant.cleancom.fr'],
      ['MCO1B-002', 'VINCENT', 'Antoine', 'antoine.vincent@etudiant.cleancom.fr'],
      ['MCO1B-003', 'MULLER', 'Juliette', 'juliette.muller@etudiant.cleancom.fr'],
      ['MCO1B-004', 'HENRY', 'Raphaël', 'raphael.henry@etudiant.cleancom.fr'],
      ['MCO1B-005', 'ROUSSEAU', 'Alice', 'alice.rousseau@etudiant.cleancom.fr'],
      ['MCO1B-006', 'PEREZ', 'Maxime', 'maxime.perez@etudiant.cleancom.fr'],
      ['MCO1B-007', 'LAMBERT', 'Océane', 'oceane.lambert@etudiant.cleancom.fr'],
      ['MCO1B-008', 'FONTAINE', 'Baptiste', 'baptiste.fontaine@etudiant.cleancom.fr'],
      ['MCO1B-009', 'MARCHAND', 'Elisa', 'elisa.marchand@etudiant.cleancom.fr'],
      ['MCO1B-010', 'GIRAUD', 'Clément', 'clement.giraud@etudiant.cleancom.fr'],
      ['MCO1B-011', 'RENARD', 'Maeva', 'maeva.renard@etudiant.cleancom.fr'],
      ['MCO1B-012', 'BLANC', 'Alexis', 'alexis.blanc@etudiant.cleancom.fr'],
      ['MCO1B-013', 'GUERIN', 'Ambre', 'ambre.guerin@etudiant.cleancom.fr'],
      ['MCO1B-014', 'FAURE', 'Nicolas', 'nicolas.faure@etudiant.cleancom.fr'],
      ['MCO1B-015', 'ROUSSEL', 'Morgane', 'morgane.roussel@etudiant.cleancom.fr'],
      ['MCO1B-016', 'BOURGEOIS', 'Kevin', 'kevin.bourgeois@etudiant.cleancom.fr'],
      ['MCO1B-017', 'LECLERCQ', 'Estelle', 'estelle.leclercq@etudiant.cleancom.fr'],
      ['MCO1B-018', 'COLIN', 'Dylan', 'dylan.colin@etudiant.cleancom.fr'],
      ['MCO1B-019', 'PIERRE', 'Mélanie', 'melanie.pierre@etudiant.cleancom.fr'],
      ['MCO1B-020', 'GAUTIER', 'Florian', 'florian.gautier@etudiant.cleancom.fr'],
      ['MCO1B-021', 'BRUN', 'Charlène', 'charlene.brun@etudiant.cleancom.fr'],
      ['MCO1B-022', 'DUMONT', 'Sébastien', 'sebastien.dumont@etudiant.cleancom.fr'],
    ],
  },
  {
    name: 'MCO2A',
    students: [
      ['MCO2A-001', 'LEMAIRE', 'Laurie', 'laurie.lemaire@etudiant.cleancom.fr'],
      ['MCO2A-002', 'BENOIT', 'Quentin', 'quentin.benoit@etudiant.cleancom.fr'],
      ['MCO2A-003', 'LECLERC', 'Camille', 'camille.leclerc@etudiant.cleancom.fr'],
      ['MCO2A-004', 'BARON', 'Alexis', 'alexis.baron@etudiant.cleancom.fr'],
      ['MCO2A-005', 'RENAUD', 'Noémie', 'noemie.renaud@etudiant.cleancom.fr'],
      ['MCO2A-006', 'REY', 'Pierre', 'pierre.rey@etudiant.cleancom.fr'],
      ['MCO2A-007', 'ARNAUD', 'Justine', 'justine.arnaud@etudiant.cleancom.fr'],
      ['MCO2A-008', 'MARTINEZ', 'Valentin', 'valentin.martinez@etudiant.cleancom.fr'],
      ['MCO2A-009', 'JACQUET', 'Elise', 'elise.jacquet@etudiant.cleancom.fr'],
      ['MCO2A-010', 'NOEL', 'Adrien', 'adrien.noel@etudiant.cleancom.fr'],
      ['MCO2A-011', 'MEYER', 'Tiffany', 'tiffany.meyer@etudiant.cleancom.fr'],
      ['MCO2A-012', 'LUCAS', 'Mickael', 'mickael.lucas@etudiant.cleancom.fr'],
      ['MCO2A-013', 'DURAND', 'Audrey', 'audrey.durand@etudiant.cleancom.fr'],
      ['MCO2A-014', 'SCHNEIDER', 'Julien', 'julien.schneider@etudiant.cleancom.fr'],
      ['MCO2A-015', 'ADAM', 'Laura', 'laura.adam@etudiant.cleancom.fr'],
      ['MCO2A-016', 'LECONTE', 'Benjamin', 'benjamin.leconte@etudiant.cleancom.fr'],
      ['MCO2A-017', 'FERRARI', 'Audrey', 'audrey.ferrari@etudiant.cleancom.fr'],
      ['MCO2A-018', 'GILLES', 'Tristan', 'tristan.gilles@etudiant.cleancom.fr'],
      ['MCO2A-019', 'PERRIN', 'Sophie', 'sophie.perrin@etudiant.cleancom.fr'],
      ['MCO2A-020', 'COLAS', 'Edouard', 'edouard.colas@etudiant.cleancom.fr'],
      ['MCO2A-021', 'RIVIERE', 'Marion', 'marion.riviere@etudiant.cleancom.fr'],
    ],
  },
  {
    name: 'MCO2B',
    students: [
      ['MCO2B-001', 'DELORME', 'Laetitia', 'laetitia.delorme@etudiant.cleancom.fr'],
      ['MCO2B-002', 'GROS', 'Florent', 'florent.gros@etudiant.cleancom.fr'],
      ['MCO2B-003', 'LAMY', 'Coralie', 'coralie.lamy@etudiant.cleancom.fr'],
      ['MCO2B-004', 'PAGES', 'Damien', 'damien.pages@etudiant.cleancom.fr'],
      ['MCO2B-005', 'MENARD', 'Audrey', 'audrey.menard@etudiant.cleancom.fr'],
      ['MCO2B-006', 'HUBERT', 'Cyril', 'cyril.hubert@etudiant.cleancom.fr'],
      ['MCO2B-007', 'CLEMENT', 'Amandine', 'amandine.clement@etudiant.cleancom.fr'],
      ['MCO2B-008', 'BRETON', 'Guillaume', 'guillaume.breton@etudiant.cleancom.fr'],
      ['MCO2B-009', 'POIRIER', 'Elodie', 'elodie.poirier@etudiant.cleancom.fr'],
      ['MCO2B-010', 'LACROIX', 'Remi', 'remi.lacroix@etudiant.cleancom.fr'],
      ['MCO2B-011', 'LECOMTE', 'Virginie', 'virginie.lecomte@etudiant.cleancom.fr'],
      ['MCO2B-012', 'TESSIER', 'Jonathan', 'jonathan.tessier@etudiant.cleancom.fr'],
      ['MCO2B-013', 'CHARPENTIER', 'Delphine', 'delphine.charpentier@etudiant.cleancom.fr'],
      ['MCO2B-014', 'MASSON', 'Sebastien', 'sebastien.masson@etudiant.cleancom.fr'],
      ['MCO2B-015', 'BERTIN', 'Nadège', 'nadege.bertin@etudiant.cleancom.fr'],
      ['MCO2B-016', 'RODRIGUES', 'David', 'david.rodrigues@etudiant.cleancom.fr'],
      ['MCO2B-017', 'MICHAUD', 'Aurelie', 'aurelie.michaud@etudiant.cleancom.fr'],
      ['MCO2B-018', 'PREVOST', 'Jerome', 'jerome.prevost@etudiant.cleancom.fr'],
      ['MCO2B-019', 'DUMAS', 'Stephanie', 'stephanie.dumas@etudiant.cleancom.fr'],
      ['MCO2B-020', 'BAUDOIN', 'Xavier', 'xavier.baudoin@etudiant.cleancom.fr'],
      ['MCO2B-021', 'GUILBERT', 'Nathalie', 'nathalie.guilbert@etudiant.cleancom.fr'],
      ['MCO2B-022', 'IMBERT', 'Franck', 'franck.imbert@etudiant.cleancom.fr'],
    ],
  },
];

for (const cls of classes) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Étudiants');

  ws.columns = [
    { header: 'Num', key: 'num', width: 14 },
    { header: 'Nom', key: 'nom', width: 18 },
    { header: 'Prénom', key: 'prenom', width: 18 },
    { header: 'Email', key: 'email', width: 38 },
  ];

  ws.getRow(1).font = { bold: true };

  for (const [num, nom, prenom, email] of cls.students) {
    ws.addRow({ num, nom, prenom, email });
  }

  const filePath = join(outDir, `etudiants_${cls.name}.xlsx`);
  await wb.xlsx.writeFile(filePath);
  console.log(`✅ ${filePath} (${cls.students.length} étudiants)`);
}
