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
import { ScanForm } from '@CommonRadio';
import { useEffect, useState } from 'react';
import { LsIsSecured } from '@helpers';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

export interface IScanEANorRefArticleProps {
    process: string;
    stepNumber: number;
    label: string;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    checkComponent: any;
    contents?: any;
}

export const ScanEANorRefArticle = ({
    process,
    stepNumber,
    label,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    checkComponent,
    contents
}: IScanEANorRefArticleProps) => {
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [scannedInfo, setScannedInfo] = useState<string>();
    const [resetForm, setResetForm] = useState<boolean>(false);
    const [articleLuBarcodesInfos, setArticleLuBarcodesInfos] = useState<any>();
    const { graphqlRequestClient } = useAuth();

    //N.B.: Version1 autorecovers information from previous step as there is only one HUC and no article scan check.
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (contents.length === 1) {
            // N.B.: in this case previous step is kept at its previous value
            const data: { [label: string]: any } = {};
            data['article'] = contents[0].article;
            data['content'] = contents[0];
            storedObject[`step${stepNumber}`] = { ...storedObject[`step${stepNumber}`], data };
            setTriggerRender(!triggerRender);
        }
        //check workflow direction and assign current step accordingly
        else if (storedObject.currentStep < stepNumber) {
            storedObject[`step${stepNumber}`] = {
                previousStep: storedObject.currentStep
            };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    console.log('ctts', contents);

    const getArticleLuBarcodes = async (
        scannedInfo: any
    ): Promise<{ [key: string]: any } | undefined> => {
        if (scannedInfo) {
            const query = gql`
                query articleLuBarcodes(
                    $advancedFilters: [ArticleLuBarcodeAdvancedSearchFilters!]
                ) {
                    articleLuBarcodes(advancedFilters: $advancedFilters) {
                        count
                        itemsPerPage
                        totalPages
                        results {
                            id
                            articleId
                            article {
                                name
                                description
                            }
                            barcodeId
                            barcode {
                                name
                            }
                            stockOwnerId
                            stockOwner {
                                name
                            }
                            articleLuId
                        }
                    }
                }
            `;

            const variables = {
                advancedFilters: {
                    filter: [
                        { searchType: 'EQUAL', field: { barcode_Name: scannedInfo } },
                        { searchType: 'EQUAL', field: { article_Name: scannedInfo } }
                    ]
                }
            };
            const ArticleLuBarcodesInfos = await graphqlRequestClient.request(query, variables);
            return ArticleLuBarcodesInfos;
        }
    };

    console.log('articleLuBarcodesInfos', articleLuBarcodesInfos);

    useEffect(() => {
        async function fetchData() {
            const result = await getArticleLuBarcodes(scannedInfo);
            if (result) setArticleLuBarcodesInfos(result);
        }
        fetchData();
    }, [scannedInfo]);

    const dataToCheck = {
        process,
        stepNumber,
        scannedInfo: { scannedInfo, setScannedInfo },
        contents,
        articleLuBarcodesInfos,
        trigger: { triggerRender, setTriggerRender },
        setResetForm
    };

    return (
        <>
            <>
                <ScanForm
                    process={process}
                    stepNumber={stepNumber}
                    label={label}
                    trigger={{ triggerRender, setTriggerRender }}
                    buttons={{ ...buttons }}
                    setScannedInfo={setScannedInfo}
                    resetForm={{ resetForm, setResetForm }}
                ></ScanForm>
                {checkComponent(dataToCheck)}
            </>
        </>
    );
};
