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
//SPECIFIC FOR RECEPTION
//DESCRIPTION: retrieve information from local storage and validate them for database updates

import { WrapperForm, StyledForm, RadioButtons, ContentSpin } from '@components';
import { showError, showSuccess, LsIsSecured } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';

export interface IValidateBoxPreparationProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
    headerContent: { [label: string]: any };
}

export const ValidateBoxPreparationForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons,
    headerContent: { setHeaderContent }
}: IValidateBoxPreparationProps) => {
    const { t } = useTranslation('common');
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // TYPED SAFE ALL
    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
        setTriggerRender(!triggerRender);
    }, []);
    // retrieve values for update contents/boxline and create movement
    const { step10, step25, step30, step50 } = storedObject;

    const box = step10?.data?.box;
    const boxLine = step10?.data?.proposedBoxLine;
    const pickedLocation = step25?.data.chosenLocation;
    const articleInfo: { [k: string]: any } = {};
    articleInfo.articleId = step30.data.articleLuBarcode.articleId;
    articleInfo.articleName = step30.data.articleLuBarcode.article.name;
    articleInfo.stockOwnerId = step30.data.articleLuBarcode.stockOwnerId;
    articleInfo.stockOwnerName = step30.data.articleLuBarcode.stockOwner.name;
    const movingQuantity = step50?.data?.movingQuantity;

    //ValidateBoxPreparation-1a: fetch front API
    const onFinish = async () => {
        setIsLoading(true);
        const res = await fetch(`/api/preparation-management/validateBoxPrep/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                box,
                boxLine,
                pickedLocation,
                articleInfo,
                movingQuantity
            })
        });
        if (res.ok) {
            const response = await res.json();
            storage.remove(process);
            showSuccess(t('messages:box-preparation-success'));
            if (response.response.updatedBox) {
                const box = response.response.updatedBox;
                if (box.status !== configs.HANDLING_UNIT_OUTBOUND_STATUS_PREPARED) {
                    const storedObject: any = {};
                    const boxLines = box.handlingUnitContentOutbounds
                        .filter(
                            (boxLine: any) =>
                                boxLine.pickedQuantity === null ||
                                boxLine.pickedQuantity < boxLine.quantityToBePicked
                        )
                        .sort((a: any, b: any) => {
                            return a.pickedQuantity === null && b.pickedQuantity === null
                                ? a.lineNumber - b.lineNumber
                                : a.pickedQuantity === null
                                ? -1
                                : b.pickedQuantity === null
                                ? 1
                                : a.pickedQuantity - b.pickedQuantity;
                        });
                    const data = { box, proposedBoxLine: boxLines[0] };
                    storedObject['currentStep'] = 20;
                    storedObject[`step10`] = { previousStep: 0, data };
                    storedObject[`step20`] = { previousStep: 10 };
                    storage.set(process, JSON.stringify(storedObject));
                }
            }
            setTriggerRender(!triggerRender);
        } else {
            showError(t('messages:box-preparation-failed'));
        }
        if (res) {
            setIsLoading(false);
        }
    };

    //ValidateBoxPreparation-1b: handle back to previous - previous step settings (specific since check is automatic)
    const onBack = () => {
        setTriggerRender(!triggerRender);
        for (
            let i =
                storedObject[`step${storedObject[`step${stepNumber}`].previousStep}`].previousStep;
            i <= stepNumber;
            i++
        ) {
            delete storedObject[`step${i}`]?.data;
        }
        storedObject.currentStep =
            storedObject[`step${storedObject[`step${stepNumber}`].previousStep}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    return (
        <WrapperForm>
            {!isLoading ? (
                <StyledForm
                    name="basic"
                    layout="vertical"
                    onFinish={onFinish}
                    autoComplete="off"
                    scrollToFirstError
                    size="small"
                >
                    <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
                </StyledForm>
            ) : (
                <ContentSpin />
            )}
        </WrapperForm>
    );
};
