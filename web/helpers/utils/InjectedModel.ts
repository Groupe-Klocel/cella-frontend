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

import { ModelType } from '../../models/ModelsV2';
let SpeModel: (() => [string | null, string, any][]) | undefined;

export function injectedModel(
    model: ModelType,
    modelName: string,
    extraInfo?: [string | null, string, any][]
): ModelType {
    let newModel = JSON.parse(JSON.stringify(model)) as ModelType;

    function insertFieldAfter(newFieldEntries: [string | null, string, any][]) {
        const fieldsInfo = Object.entries(newModel.fieldsInfo);
        const result: typeof newModel.fieldsInfo = {};

        for (const [key, value] of fieldsInfo) {
            result[key] = value;
            for (const [targetKey, newFieldKey, newFieldValue] of newFieldEntries) {
                if (key === targetKey) {
                    if (result[newFieldKey]) {
                        delete result[newFieldKey];
                    }
                    result[newFieldKey] = newFieldValue;
                }
            }
        }
        // If not inserted or targetKey is null, append at the end
        for (const [targetKey, newFieldKey, newFieldValue] of newFieldEntries) {
            if (!(newFieldKey in result) || targetKey === null) {
                result[newFieldKey] = newFieldValue;
            }
        }
        return result;
    }

    // Dynamically require to avoid static import error if file doesn't exist
    if (modelName) {
        try {
            SpeModel = require(`../../modelsSpe/${modelName}`)[modelName];
        } catch (e) {
            SpeModel = undefined;
        }
        if (SpeModel) {
            newModel.fieldsInfo = insertFieldAfter(SpeModel());
        }
    }

    if (extraInfo) {
        newModel.fieldsInfo = insertFieldAfter(extraInfo);
    }

    // console.log('AXC - InjectedModel.ts - injectedModel - newModel:', newModel);
    // console.log(Object.entries(newModel.fieldsInfo));

    return {
        tableName: newModel.tableName,
        modelName: newModel.modelName,
        resolverName: newModel.resolverName,
        isEditable: newModel.isEditable,
        isDeletable: newModel.isDeletable,
        isSoftDeletable: newModel.isSoftDeletable,

        endpoints: {
            detail: newModel.endpoints.detail,
            list: newModel.endpoints.list,
            create: newModel.endpoints.create,
            update: newModel.endpoints.update,
            delete: newModel.endpoints.delete,
            softDelete: newModel.endpoints.softDelete ?? null,
            export: newModel.endpoints.export ?? null
        },

        fieldsInfo: newModel.fieldsInfo
    };
}
