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
import { ArrowLeftOutlined, UndoOutlined } from '@ant-design/icons';
import { HeaderContent, NavButton, PageContentWrapper, RadioInfosHeader } from '@components';
import { Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppDispatch, useAppState } from 'context/AppContext';
import { getMoreInfos, useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useMemo } from 'react';
import { useRouter } from 'next/router';
import { ScanRoundOrHuOrPosition } from 'modules/Preparation/equipmentPositionRelease/PagesContainer/ScanRoundOrHuOrPosition';
import { RoundOrHuOrPositionCheck } from 'modules/Preparation/equipmentPositionRelease/ChecksAndRecords/RoundOrHuOrPositionChecks';
import { ScanPosition } from 'modules/Preparation/equipmentPositionRelease/PagesContainer/ScanPosition';
import { PositionChecks } from 'modules/Preparation/equipmentPositionRelease/ChecksAndRecords/PositionChecks';
import { ScanHandlingUnit } from 'modules/Preparation/equipmentPositionRelease/PagesContainer/ScanHandlingUnit';
import { HandlingUnitChecks } from 'modules/Preparation/equipmentPositionRelease/ChecksAndRecords/HandlingUnitChecks';
import { ValidateEquipmentPositionRelease } from 'modules/Preparation/equipmentPositionRelease/Forms/ValidateEquipmentPositionRelease';

type PageComponent = FC & { layout: typeof MainLayout };

const EquipmentPositionRelease: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { parameters, configs } = useAppState();

    const configsParamsCodes = useMemo(() => {
        const findCodeByScope = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };
        const findValueByScopeAndCode = (items: any[], scope: string, code: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.code.toLowerCase() === code.toLowerCase()
            )?.value;
        };

        const equipmentHuType = findCodeByScope(parameters, 'handling_unit_type', 'EQUIPMENT');

        const packingWithControlInprogressHuoStatus = findCodeByScope(
            configs,
            'handling_unit_outbound_status',
            'Packing with control in progress'
        );

        const defaultQuantityValue = findValueByScopeAndCode(
            parameters,
            'outbound',
            'PACK_DEFAULT_QUANTITY'
        );

        const autoValidate1QuantityValue = findValueByScopeAndCode(
            parameters,
            'outbound',
            'PACK_AUTOVALIDATE_1_QUANTITY'
        );
        const defaultQuantity = (() => {
            switch (defaultQuantityValue) {
                case '1':
                    return 1;
                case '2':
                    return 2;
                default:
                    return 0;
            }
        })();
        const autoValidate1Quantity = autoValidate1QuantityValue === '1';
        return {
            defaultQuantity,
            autoValidate1Quantity,
            equipmentHuType,
            packingWithControlInprogressHuoStatus
        };
    }, [parameters, configs]);

    const processName = 'equipmentPositionRelease';

    const equipmentHuType = parseInt(configsParamsCodes.equipmentHuType);

    const state = useAppState();
    const dispatch = useAppDispatch();
    const storedObject = state[processName] || {};

    console.log(`${processName}`, storedObject);

    const round = storedObject?.step10?.data?.round;
    const equipmentHu = storedObject?.step10?.data?.equipmentHu;
    const step10Position = storedObject?.step10?.data?.position;
    const step20Position = storedObject?.step20?.data?.position;
    const destinationHuos = round?.handlingUnitOutbounds?.filter(
        (item: any) => item.handlingUnit?.type !== equipmentHuType
    );
    //box currently in progress of packing if any
    const inProgressHuo = storedObject?.step10?.data?.inProgressHuo;

    let headerDisplay: { [k: string]: any } = {};
    if (round) {
        headerDisplay[t('common:round')] = round.name;
    }
    if (equipmentHu) {
        headerDisplay[t('common:equipment')] = equipmentHu.name;
    }
    if (step20Position && round?.equipment?.checkPosition) {
        headerDisplay[t('common:pack_position')] = step20Position;
    }
    if (inProgressHuo && !round?.equipment?.checkPosition) {
        headerDisplay[t('common:huo-in-progress')] = inProgressHuo.name;
        headerDisplay[t('common:expected-article_abbr')] =
            inProgressHuo.handlingUnitContentOutbounds[0].article.name;
    }
    if (storedObject.step30?.data?.handlingUnit) {
        headerDisplay[t('common:handling-unit-final')] = storedObject.step30.data.handlingUnit;
    }

    headerDisplay = getMoreInfos(headerDisplay, storedObject, processName, t);

    const onReset = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
    };

    const previousPage = () => {
        dispatch({
            type: 'DELETE_RF_PROCESS',
            processName
        });
        router.back();
    };

    return (
        <PageContentWrapper>
            <HeaderContent
                title={t('menu:equipment-position-release')}
                actionsRight={
                    <Space>
                        {storedObject.currentStep > 10 ? (
                            <NavButton icon={<UndoOutlined />} onClick={onReset}></NavButton>
                        ) : (
                            <></>
                        )}
                        <NavButton icon={<ArrowLeftOutlined />} onClick={previousPage}></NavButton>
                    </Space>
                }
            />
            {Object.keys(headerDisplay).length === 0 ? (
                <></>
            ) : (
                <RadioInfosHeader
                    input={{
                        displayed: headerDisplay
                    }}
                ></RadioInfosHeader>
            )}
            {!storedObject['step10']?.data ? (
                <ScanRoundOrHuOrPosition
                    processName={processName}
                    stepNumber={10}
                    label={t('d:round-or-equipment-or-position')}
                    buttons={{ submitButton: true, backButton: true }}
                    checkComponent={(data: any) => <RoundOrHuOrPositionCheck dataToCheck={data} />}
                ></ScanRoundOrHuOrPosition>
            ) : (
                <></>
            )}
            {storedObject['step10']?.data && !storedObject['step20']?.data ? (
                <ScanPosition
                    processName={processName}
                    stepNumber={20}
                    label={t('common:pack_position')}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    checkComponent={(data: any) => (
                        <PositionChecks
                            dataToCheck={data}
                            handlingUnitOutboundInfos={destinationHuos}
                        />
                    )}
                    enforcedValue={step10Position ?? undefined}
                    defaultValue={
                        !round?.equipment?.checkPosition
                            ? destinationHuos
                            : inProgressHuo
                              ? [inProgressHuo]
                              : undefined
                    }
                ></ScanPosition>
            ) : (
                <></>
            )}
            {storedObject['step20']?.data && !storedObject['step30']?.data ? (
                <ScanHandlingUnit
                    processName={processName}
                    stepNumber={30}
                    label={t('common:handling-unit')}
                    buttons={{
                        submitButton: true,
                        backButton: true
                    }}
                    checkComponent={(data: any) => <HandlingUnitChecks dataToCheck={data} />}
                ></ScanHandlingUnit>
            ) : (
                <></>
            )}
            {storedObject['step30']?.data ? (
                <ValidateEquipmentPositionRelease
                    processName={processName}
                    stepNumber={40}
                    buttons={{ submitButton: true, backButton: true }}
                ></ValidateEquipmentPositionRelease>
            ) : (
                <></>
            )}
        </PageContentWrapper>
    );
};

EquipmentPositionRelease.layout = MainLayout;

export default EquipmentPositionRelease;
