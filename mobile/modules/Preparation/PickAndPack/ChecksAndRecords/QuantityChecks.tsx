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
import { WrapperForm, ContentSpin } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { AdvisedInventoryModal } from 'components/common/smart/Modals/AdvisedInventoryModal';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { useEffect, useState, useMemo } from 'react';

export interface IQuantityChecksProps {
    dataToCheck: any;
}

export const QuantityChecks = ({ dataToCheck }: IQuantityChecksProps) => {
    const { t } = useTranslation();

    const {
        processName,
        stepNumber,
        enteredInfo: { enteredInfo, setEnteredInfo }
    } = dataToCheck;

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

    // Secure extraction of IDs needed for inventory
    const { locationId } = useMemo(() => {
        const locId =
            storedObject['step30']?.data?.chosenLocation?.id ||
            storedObject['step10']?.data?.proposedRoundAdvisedAddresses?.[0]?.location?.id;
        return { locationId: locId };
    }, [storedObject]);

    const proceedToNextStep = () => {
        setIsModalVisible(false);
        const data: { [label: string]: any } = {};
        data['movingQuantity'] = enteredInfo;

        dispatch({
            type: 'UPDATE_BY_STEP',
            processName,
            stepName: `step${stepNumber}`,
            object: {
                ...storedObject[`step${stepNumber}`],
                data
            }
        });
    };

    // TYPED SAFE ALL
    useEffect(() => {
        if (enteredInfo) {
            const deliveryLine =
                storedObject['step10']?.data?.proposedRoundAdvisedAddresses?.[0]?.roundLineDetail
                    ?.deliveryLine;
            const targetArticleId = deliveryLine?.articleId;
            const targetStockOwnerId = deliveryLine?.stockOwnerId;
            const targetStockStatus = deliveryLine?.stockStatus;
            const targetReservation = deliveryLine?.reservation;

            let totalInitialQuantity = 0;
            const location =
                storedObject['step30']?.data?.chosenLocation ||
                storedObject['step10']?.data?.proposedRoundAdvisedAddresses?.[0]?.location;

            // Sum the quantity from all HUCs that have the same stock owner, same status, and same article and same reservation
            if (location?.handlingUnits) {
                location.handlingUnits.forEach((hu: any) => {
                    hu.handlingUnitContents?.forEach((huc: any) => {
                        if (
                            huc.articleId === targetArticleId &&
                            huc.stockOwnerId === targetStockOwnerId &&
                            huc.stockStatus === targetStockStatus &&
                            huc.reservation === targetReservation
                        ) {
                            totalInitialQuantity += huc.quantity;
                        }
                    });
                });
            }

            const remainingQuantity = totalInitialQuantity - enteredInfo;

            if (remainingQuantity <= 0) {
                setIsModalVisible(true);
            } else {
                proceedToNextStep();
            }
        }
    }, [enteredInfo]);

    const handleCancel = () => {
        setIsModalVisible(false);
        setEnteredInfo(undefined);
    };

    return (
        <WrapperForm>
            {enteredInfo && !storedObject[`step${stepNumber}`]?.data && !isModalVisible ? (
                <ContentSpin />
            ) : (
                <></>
            )}

            <AdvisedInventoryModal
                visible={isModalVisible}
                locationId={locationId}
                onSuccess={proceedToNextStep}
                onCancel={handleCancel}
            />
        </WrapperForm>
    );
};
