const readline = require('readline'); // eslint-disable-line @typescript-eslint/no-var-requires
const fs = require('fs'); // eslint-disable-line @typescript-eslint/no-var-requires
const doubleEntryTable = {};
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

let objectName = '';
let isEditable = false;
let isDeletable = false;
let isSoftDeletable = false;
let headers = [];

rl.question('Enter the object name: ', (name) => {
    objectName = name;
    console.log(`Object name: ${objectName}`);
    rl.question('Can an item be edited (y/n)? ', (editable) => {
        isEditable = editable === 'y' ? true : false;
        rl.question('Can an item be deleted (y/n)? ', (deletable) => {
            isDeletable = deletable === 'y' ? true : false;
            rl.question('Can an item be cancelled or closed (y/n)? ', (softDeletable) => {
                isSoftDeletable = softDeletable === 'y' ? true : false;
                console.log('Paste the table below:');
                let firstLine = true;
                rl.on('line', (line) => {
                    if (line.trim() === '') {
                        processInput();
                        rl.close();
                    } else {
                        if (firstLine) {
                            headers = line.split('\t');
                            firstLine = false;
                        } else {
                            processTableLine(line);
                        }
                    }
                });
            });
        });
    });
});

function pluralize(word) {
    const irregulars = {
        basis: 'bases',
        child: 'children',
        criterion: 'criteria',
        index: 'indices',
        matrix: 'matrices',
        parenthesis: 'parentheses',
        self: 'selves',
        series: 'series',
        person: 'people'
    };
    if (irregulars[word]) {
        return irregulars[word];
    }
    if (
        word.endsWith('s') ||
        word.endsWith('sh') ||
        word.endsWith('ch') ||
        word.endsWith('x') ||
        word.endsWith('z')
    ) {
        return word + 'es';
    }
    if (word.endsWith('y')) {
        return word.slice(0, -1) + 'ies';
    }
    return word + 's';
}

function processTableLine(line) {
    const values = line.split('\t');
    const field = values[0];
    const parameters = {};
    for (let i = 1; i < values.length; i++) {
        const header = headers[i];
        const value = values[i];
        if (header && value) {
            parameters[header] = parseValue(value);
        }
    }
    doubleEntryTable[field] = parameters;
}

function parseValue(value) {
    if (value === 'yes') {
        return true;
    } else if (value === 'no') {
        return false;
    } else if (value === 'null') {
        return null;
    } else if (!isNaN(parseInt(value))) {
        return parseInt(value);
    }
    return value;
}

function processInput() {
    console.log(`Transformation completed for object ${objectName}`);
    const fileContent = `/**
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
import { Table } from 'generated/graphql';
import { ModelType } from './ModelsV2';

export const ${objectName}ModelV2: ModelType = {
    tableName: Table.${objectName},
    resolverName: '${objectName}',
    isEditable: ${isEditable},
    isDeletable: ${isDeletable},
    isSoftDeletable: ${isSoftDeletable},

    endpoints: {
        detail: '${objectName.charAt(0).toLowerCase() + objectName.slice(1)}',
        list: '${pluralize(objectName.charAt(0).toLowerCase() + objectName.slice(1))}',
        create: 'create${objectName}',
        update: 'update${objectName}',
        delete: 'delete${objectName}'${
        isSoftDeletable
            ? `,
        softDelete: 'softDelete${objectName}'`
            : ''
    }
    },

    fieldsInfo: ${JSON.stringify(doubleEntryTable)}
};
`;
    const path = '../../models';
    fs.writeFile(`${path}/${objectName}ModelV2.tsx`, fileContent, (err) => {
        if (err) throw err;
        console.log(`Output written to ${path}/${objectName}ModelV2.tsx`);
    });
}
