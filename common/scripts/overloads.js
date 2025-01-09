const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const overloadConfig = require("../configOverloads.json");

const ignoredFiles = [
  "overloads.tsx",
  "testScrypt.js",
  "graphql.ts",
  "yarn.lock",
  ".env",
  ".gitignore",
  "amplify.yml",
  "cella-frontend.code-workspace",
  "LICENSE.md",
  "README.md",
  "package.json",
  "vercel.json",
  "configs.json",
  "configOverloads.json",
  "parameters.json",
];
const ignoredFolders = [
  "node_modules",
  ".next",
  "fake-data",
  "public",
  ".devcontainer",
  ".git",
  ".github",
  "pagesModels",
  "locales",
];
const ignoredRoutes = [];

async function fetchData() {
  try {
    console.log("PreBuild in progress...");
    const response = await fetch(overloadConfig.url);
    const data = await response.text();
    let filesCreated = 0;
    if (data) {
      const dataSplited = data.split("<pre>")[1].split("</pre>")[0].trim();
      const dataParsed = JSON.parse(
        dataSplited
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#x27;/g, "'")
          .replace(/&#x60;/g, "`")
          .replace(/&amp;/g, "&")
      );

      // Read all files&
      const directoryPath =
        process.cwd().split("/")[1] === "vercel"
          ? process.cwd().split("/path0")[0] + "/path0"
          : process.cwd().split(overloadConfig.clientFolder)[0] +
            overloadConfig.clientFolder;
      console.log("directoryPath:", directoryPath);
      const getAllFiles = (dirPath, arrayOfFiles = []) => {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
          const filePath = path.join(dirPath, file);
          if (ignoredRoutes.includes(filePath.split(directoryPath).pop())) {
            return;
          }
          if (fs.statSync(filePath).isDirectory()) {
            if (!ignoredFolders.includes(file)) {
              arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
            }
          } else if (!ignoredFiles.includes(file)) {
            arrayOfFiles.push(filePath);
          }
        });

        return arrayOfFiles;
      };
      const allFiles = getAllFiles(directoryPath);

      const getAllFilesNotInData = () => {
        const filesNotInData = [];
        let filesSpe = 0;
        allFiles.forEach((file) => {
          // Check if the file data to find //$$$$$SPE$$$$$// is in the file
          const fileData = fs.readFileSync(file, "utf8");
          if (fileData.includes("//$$$$$SPE$$$$$//")) {
            filesSpe = filesSpe + 1;
            return; // Skip the file if it contains //$$$$$SPE$$$$$//
          }
          const fileInData = dataParsed.filesContent.find(
            (item) =>
              item.path.split(directoryPath).pop() + "/" + item.fileName ===
              file.split(directoryPath).pop()
          );
          if (!fileInData) {
            filesNotInData.push(file);
          }
        });
        console.log("filesSpe:", filesSpe);
        return filesNotInData;
      };

      // delete all files not in data

      const filesNotInData = getAllFilesNotInData();
      await Promise.all(
        filesNotInData.map(async (file) => {
          try {
            fs.unlinkSync(file);
            console.log("File deleted:", file);
          } catch (err) {
            console.error("Error deleting file:", err);
          }
        })
      );

      await Promise.all(
        dataParsed.filesContent.map(async (item) => {
          const itemPath = ".." + item.path;
          try {
            const dataFile = fs.readFileSync(
              itemPath + "/" + item.fileName,
              "utf8"
            );
            if (dataFile.includes("//$$$$$SPE$$$$$//")) {
              return;
            }
          } catch (err) {
            if (err.code === "ENOENT") {
              // Create the directory if it doesn't exist
              await fs.promises.mkdir(itemPath, {
                recursive: true,
              });
              filesCreated = filesCreated + 1;
            }
            if (err.code === "EISDIR") {
              console.log("File is a directory!", itemPath, item.fileName);
            }
            if (err.code === "EROFS") {
              console.log("File system is read-only!", itemPath, item.fileName);
            }
            if (
              err.code !== "ENOENT" &&
              err.code !== "EISDIR" &&
              err.code !== "EROFS"
            ) {
              throw err;
            }
          }
          return fs.promises.writeFile(
            itemPath + "/" + item.fileName,
            item.content
          );
        })
      );
    }
    console.log(filesCreated, "files created!");
    console.log("PreBuild done!");
    return "done";
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

fetchData();
