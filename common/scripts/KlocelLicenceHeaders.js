/**
CELLA Frontend
Website and Mobile templates that can be used to communicate
with CELLA WMS APIs.
Copyright (C) 2023 KLOCEL <contact@klocel.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
**/

const fs = require("fs");
const path = require("path");

function addLicence(dir_path, templateName, extFile) {
  fs.readdirSync(dir_path).forEach((file) => {
    const file_path = path.join(dir_path, file);

    if (file.endsWith(extFile)) {
      const content = fs.readFileSync(file_path, "utf8");

      if (content.includes(templateName)) {
        console.log(`🟠 Header already exists in file : ${file_path}`);
      } else {
        fs.writeFileSync(file_path, `${templateName}\n${content}`);
        console.log(`✅ Header added to the file : ${file_path} `);
      }
    }

    if (
      fs.statSync(file_path).isDirectory() &&
      !file_path.includes("node_modules")
    ) {
      addLicence(file_path, templateName, extFile);
    }
  });
}

const TemplateGraph = `# CELLA Frontend
# Website and Mobile templates that can be used to communicate
# with CELLA WMS APIs.
# Copyright (C) 2023 KLOCEL <contact@klocel.com>

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program. If not, see <https://www.gnu.org/licenses/>.`;

const TemplateJS = `/**
CELLA Frontend
Website and Mobile templates that can be used to communicate
with CELLA WMS APIs.
Copyright (C) 2023 KLOCEL <contact@klocel.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
**/`;

const extensions = [".ts", ".tsx"];
const graphqlExtension = ".graphql";
const templatePath = "../../";

for (const extension of extensions) {
  addLicence(templatePath, TemplateJS, extension);
}
addLicence(templatePath, TemplateGraph, graphqlExtension);

console.log(`Done`);

// command prompt example made by AST if needed
// // input question
// const readline = require('readline').createInterface({
//     input: process.stdin,
//     output: process.stdout
// });
// // prompt inoput
// readline.question('Veuillez entrer votre chemin (ex:./template) >', (templatePath) => {
//     // Vérifier si le dossier existe
//     if (!fs.existsSync(templatePath) || !fs.lstatSync({ templatePath }).isDirectory()) {
//         console.log(`❌ Le dossier "${templatePath}" n'existe pas ...`);
//         return readline.close();
//     }
//     // function Demander l'extension du fichier à traiter recuperer 'templatePath'
//     function PromptQuestionExtension() {
//         readline.question('Veuillez entrer une extension parmi la liste >', (choiceLanguage) => {
//             if (extLangage.includes(choiceLanguage)) {
//                 if (choiceLanguage === extLangage[3]) {
//                     console.log(`Template ${extLangage[3]} choisis`);
//                     addLicence({ templatePath }, TemplateGraph, choiceLanguage);
//                 } else {
//                     console.log(`Template ${extLangage[0]},${extLangage[1]}`);
//                     addLicence({ templatePath }, TemplateJS, choiceLanguage);
//                 }
//                 readline.close();
//             } else {
//                 console.log('Veuillez entrer une extension valide ❌');
//                 // Rappel notre fonction si ses faux.
//                 PromptQuestionExtension();
//             }
//         });
//     }

//     PromptQuestionExtension();
// });
