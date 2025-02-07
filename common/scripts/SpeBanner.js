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
const overloadConfig = require("../configOverloads.json");

const SPE = [
  ...overloadConfig.SpeUpdate,
  ...overloadConfig.SpeNew,
  ...overloadConfig.SpeMaybe,
];

function addLicence(dir_path, SpeName, extFile) {
  fs.readdirSync(dir_path).forEach((file) => {
    const file_path = path.join(dir_path, file);

    if (file.endsWith(extFile)) {
      let content = fs.readFileSync(file_path, "utf8");

      if (content.includes(SpeName)) {
        const newContent = content
          .split("\n")
          .filter((line, index, lines) => {
            if (line.includes(SpeName)) {
              // Skip the line containing SpeName
              // Also skip the next line if it's empty
              return false;
            }
            // Skip the line if the previous line contained SpeName and this line is empty
            if (
              index > 0 &&
              lines[index - 1].includes(SpeName) &&
              line.trim() === ""
            ) {
              return false;
            }
            return true;
          })
          .join("\n");
        fs.writeFileSync(file_path, newContent);
        console.log(`🔴 Totem deleted from the file : ${file_path}`);
        content = newContent;
      }
      if (
        SPE.includes(file_path.split("..")[1]) &&
        extensions.includes(extFile)
      ) {
        const parts = content.split("**/");
        const newContent = `${parts[0]}**/\n${SpeName}\n${parts[1]}`;
        fs.writeFileSync(file_path, newContent);
        console.log(`✅ Totem added to the file : ${file_path}`);
      } else if (
        SPE.includes(file_path.split("..")[1]) &&
        extFile === ".graphql"
      ) {
        const parts = content.split("\n");
        const commentEndIndex = parts.findIndex((line) =>
          line.trim().startsWith("query" || "mutation")
        );
        const newContent = [
          ...parts.slice(0, commentEndIndex),
          SpeName,
          ...parts.slice(commentEndIndex),
        ].join("\n");
        fs.writeFileSync(file_path, newContent);
        console.log(`✅ Totem added to the file : ${file_path}`);
      }
    }

    if (
      fs.statSync(file_path).isDirectory() &&
      !file_path.includes("node_modules")
    ) {
      addLicence(file_path, SpeName, extFile);
    }
  });
}

const SpeGraph = `# //$$$$$SPE$$$$$//`;

const SpeJS = `//$$$$$SPE$$$$$//`;

const extensions = [".ts", ".tsx"];
const graphqlExtension = ".graphql";
const templatePath = "../";

for (const extension of extensions) {
  addLicence(templatePath, SpeJS, extension);
}
addLicence(templatePath, SpeGraph, graphqlExtension);

console.log(`Done`);
