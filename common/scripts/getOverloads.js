const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const unzipper = require("unzipper");
const { pipeline } = require("stream");
const { promisify } = require("util");

const pipelineAsync = promisify(pipeline);

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
  "modelsSpe",
];

const ignoredRoutes = [];

const includesRoutes = [
  "/web/public/light-theme.css",
  "/web/public/dark-theme.css",
];

const SPE = [
  ...overloadConfig.SpeUpdate,
  ...overloadConfig.SpeNew,
  ...overloadConfig.SpeMaybe,
];

async function downloadReleaseZip(owner, repo, releaseTag) {
  try {
    const releaseResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/tags/${releaseTag}`
    );
    if (!releaseResponse.ok) {
      throw new Error(
        `Failed to get release: ${releaseResponse.status} ${releaseResponse.statusText}`
      );
    }
    const releaseData = await releaseResponse.json();
    const zipUrl = releaseData.zipball_url;

    const zipResponse = await fetch(zipUrl);
    if (!zipResponse.ok) {
      throw new Error(
        `Failed to download zip: ${zipResponse.status} ${zipResponse.statusText}`
      );
    }

    const zipPath = path.join(__dirname, `${repo}-${releaseTag}.zip`);
    const fileStream = fs.createWriteStream(zipPath);
    await pipelineAsync(zipResponse.body, fileStream);

    return zipPath;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

async function readZipContents(zipPath) {
  try {
    const directory = await unzipper.Open.file(zipPath);
    const filesContent = [];

    for (const file of directory.files) {
      if (!file.path.endsWith("/")) {
        // Skip directories
        const content = await file.buffer();
        filesContent.push({
          fileName: path.basename(file.path),
          filePath: "/" + file.path.split("/").slice(1, -1).join("/"),
          content: content.toString("utf-8"),
        });
      }
    }

    return filesContent;
  } catch (error) {
    console.error("Error reading zip contents:", error);
    return [];
  }
}

function compareFiles(currentFiles, previousFiles) {
  const updatedFiles = [];

  currentFiles.forEach((currentFile) => {
    const previousFile = previousFiles.find(
      (file) =>
        file.filePath === currentFile.filePath &&
        file.fileName === currentFile.fileName
    );

    if (!previousFile || previousFile.content !== currentFile.content) {
      if (SPE.includes(currentFile.filePath + "/" + currentFile.fileName)) {
        console.log(
          "🔴🔴🔴 SPE file updated since the last release: " +
            currentFile.filePath +
            "/" +
            currentFile.fileName
        );
      }
    }
  });

  return updatedFiles;
}

async function fetchData() {
  const owner = "Groupe-Klocel";
  const repo = "cella-frontend";
  const releaseTag = overloadConfig.overloadReleaseTag;
  const previousReleaseTag = overloadConfig.previousOverloadReleaseTag;

  const currentZipPath = await downloadReleaseZip(owner, repo, releaseTag);
  const previousZipPath = await downloadReleaseZip(
    owner,
    repo,
    previousReleaseTag
  );

  if (!currentZipPath || !previousZipPath) {
    return;
  }

  const currentFiles = await readZipContents(currentZipPath);
  const previousFiles = await readZipContents(previousZipPath);

  const updatedFiles = compareFiles(currentFiles, previousFiles);

  try {
    console.log("PreBuild in progress...");
    const data = await readZipContents(currentZipPath);

    let filesCreated = 0;
    if (data) {
      const dataFiltered = data.filter(
        (item) =>
          !ignoredFiles.includes(item.fileName) &&
          !item.filePath
            .split("/")
            .some((folder) => ignoredFolders.includes(folder)) &&
          (!ignoredRoutes.includes(item.filePath + "/" + item.fileName) ||
            includesRoutes.includes(item.filePath + "/" + item.fileName))
      );

      // Read all files&
      const getAllFiles = (dirPath, arrayOfFiles = []) => {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
          const filePath = path.join(dirPath, file);

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

      const directoryPath = process.cwd().split("/").slice(0, -1).join("/");
      console.log("directoryPath:", directoryPath);
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
          const fileInData = dataFiltered.find(
            (item) =>
              item.filePath + "/" + item.fileName ===
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
        dataFiltered.map(async (item) => {
          const itemPath = ".." + item.filePath;
          try {
            const dataFile = fs.readFileSync(
              itemPath + "/" + item.fileName,
              "utf8"
            );
            if (
              dataFile.includes("//$$$$$SPE$$$$$//") &&
              item.fileName !== "getOverloads.js"
            ) {
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
