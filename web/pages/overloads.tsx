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
import { GetStaticProps } from 'next';
import fs from 'fs';
import path from 'path';

const JsonPage = ({ filesContent }: { filesContent: any[] }) => {
    return (
        <div>
            <pre>{JSON.stringify({ filesContent }, null, 2)}</pre>
        </div>
    );
};

export const getStaticProps: GetStaticProps = async () => {
    const directoryPath = process.cwd().split('/web')[0]; //vercel/path0/
    console.log(directoryPath, 'directoryPath');
    const ignoredFiles = [
        'overloads.tsx',
        'testScrypt.js',
        'graphql.ts',
        'yarn.lock',
        '.env',
        '.gitignore',
        'amplify.yml',
        'cella-frontend.code-workspace',
        'LICENSE.md',
        'README.md',
        'package.json',
        'vercel.json',
        'configs.json',
        'configOverloads.json',
        'parameters.json'
    ];
    const ignoredFolders = [
        'node_modules',
        '.next',
        'fake-data',
        'public',
        '.devcontainer',
        '.git',
        '.github',
        'pagesModels',
        'locales'
    ];
    const ignoredRoutes: any = [];

    const splitString = process.cwd().split('/')[1] === 'vercel' ? '/path0' : '/cella-frontend';

    const getAllFiles = (dirPath: string, arrayOfFiles: any[] = []) => {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
            const filePath = path.join(dirPath, file);
            if (ignoredRoutes.includes(filePath.split(splitString)[1])) {
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
    console.log(allFiles, 'allFiles');
    const filesContent = allFiles.map((filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        return {
            content,
            path: filePath.split(splitString)[1].split('/').slice(0, -1).join('/'),
            fileName: filePath.split('/').pop()
        };
    });

    return {
        props: {
            filesContent
        }
    };
};

export default JsonPage;
