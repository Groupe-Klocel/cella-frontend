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
import { ContentSpin, HeaderContent } from '@components';
import { Alert, Layout } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';

import styled from 'styled-components';

import { getModesFromPermissions, showError, useCarrierIds, useDetail } from '@helpers';
import { FormDataType, FormOptionType } from 'models/Models';
import { BoxModel } from 'models/BoxModel';
import { useRouter } from 'next/router';
import { boxesRoutes } from 'modules/Boxes/Static/boxesRoutes';
import { EditBoxForm } from '../Forms/EditBoxForm';
import { ModeEnum, Table } from 'generated/graphql';
import { useAppState } from 'context/AppContext';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface IEditBoxProps {
    id: string | any;
    name: string | any;
    setData?: any;
}

const EditBox: FC<IEditBoxProps> = (props: IEditBoxProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const breadsCrumb = [
        ...boxesRoutes,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    const { detail, reload: reloadData } = useDetail(
        props.id,
        BoxModel.endpoints.detail,
        BoxModel.detailFields
    );

    useEffect(() => {
        reloadData();
    }, [router.locale]);

    useEffect(() => {
        if (detail.error) {
            showError(t('messages:error-getting-data'));
        }
    }, [detail.error]);

    const errorMessageEmptyInput = t('messages:error-message-empty-input');

    const [carrierIdOptions, setCarrierIdOptions] = useState<Array<FormOptionType>>([]);

    const carrierData = useCarrierIds({}, 1, 100, null);

    const [formData, setFormData] = useState<any>(null);

    useEffect(() => {
        // Flatten the fetched data for automatically parsing in editform.
        if (
            detail.data &&
            detail.data.handlingUnitOutbound &&
            detail.data.handlingUnitOutbound.handlingUnit
        ) {
            const flattenedData = {
                handlingUnitId: detail.data.handlingUnitOutbound.handlingUnit.id,
                stockOwnerId: detail.data.handlingUnitOutbound.handlingUnit.stockOwnerId,
                stockOwnerName: detail.data.handlingUnitOutbound.stockOwner.name,
                status: detail.data.handlingUnitOutbound.statusText,
                deliveryId: detail.data.handlingUnitOutbound.deliveryId,
                deliveryName: detail.data.handlingUnitOutbound.delivery.name,
                name: detail.data.handlingUnitOutbound.name,
                handlingUnitModelId: detail.data.handlingUnitOutbound.handlingUnitModelId,
                carrierId: detail.data.handlingUnitOutbound.carrierId,
                carrierService: detail.data.handlingUnitOutbound.carrierService,
                theoreticalWeight: detail.data.handlingUnitOutbound.theoriticalWeight,
                intermediateWeight1: detail.data.handlingUnitOutbound.intermediateWeight1,
                intermediateWeight2: detail.data.handlingUnitOutbound.intermediateWeight2,
                finalWeight: detail.data.handlingUnitOutbound.finalWeight,
                carrierBox: detail.data.handlingUnitOutbound.carrierBox,
                comment: detail.data.handlingUnitOutbound.handlingUnit.comment,
                warehouseCode: detail.data.handlingUnitOutbound.handlingUnit.warehouseCode
            };
            setFormData(flattenedData);
            if (props.setData) props.setData(flattenedData);
        }
    }, [detail.data]);

    // Update carrier selection dropdown data.
    useEffect(() => {
        if (carrierData.data && carrierData.data.carriers) {
            const newIdOpts: Array<FormOptionType> = carrierData.data.carriers!.results.map(
                ({ id, name }) => {
                    return { text: name!, key: id! };
                }
            );
            setCarrierIdOptions(newIdOpts);
        }
    }, [carrierData.data]);

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.HandlingUnitOutbound);

    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Update) ? (
                    <>
                        <Alert
                            message={t('messages:error')}
                            description={t('errors:APP-000200')}
                            type="error"
                            showIcon
                        />
                    </>
                ) : (
                    <>
                        <HeaderContent
                            title={`${t('common:box')}: ${props.name}`}
                            routes={breadsCrumb}
                            onBack={() => router.back()}
                        />
                        <StyledPageContent>
                            {formData && !detail.isLoading ? (
                                <EditBoxForm
                                    id={props.id}
                                    details={formData}
                                    dataModel={BoxModel}
                                    routeAfterSuccess={`/boxes/:id`}
                                    editSteps={[
                                        [
                                            {
                                                name: 'stockOwnerName',
                                                displayName: t('d:stockOwner'),
                                                type: FormDataType.String,
                                                disabled: true
                                            },
                                            {
                                                name: 'deliveryName',
                                                displayName: t('common:delivery'),
                                                type: FormDataType.String,
                                                disabled: true
                                            },
                                            {
                                                name: 'status',
                                                displayName: t('d:status'),
                                                type: FormDataType.String,
                                                disabled: true
                                            },
                                            {
                                                name: 'carrierId',
                                                displayName: t('common:carrier'),
                                                type: FormDataType.Dropdown,
                                                disabled: true,
                                                rules: [
                                                    {
                                                        required: true,
                                                        message: errorMessageEmptyInput
                                                    }
                                                ],
                                                subOptions: carrierIdOptions
                                            },
                                            {
                                                name: 'carrierService',
                                                type: FormDataType.String
                                            },
                                            {
                                                name: 'theoreticalWeight',
                                                displayName: t('d:theoreticalWeight'),
                                                type: FormDataType.Number
                                            },
                                            {
                                                name: 'intermediateWeight1',
                                                displayName: t('d:intermediateWeight1'),
                                                type: FormDataType.Number
                                            },
                                            {
                                                name: 'intermediateWeight2',
                                                displayName: t('d:intermediateWeight2'),
                                                type: FormDataType.Number
                                            },
                                            {
                                                name: 'finalWeight',
                                                displayName: t('d:finalWeight'),
                                                type: FormDataType.Number
                                            },
                                            {
                                                name: 'carrierBox',
                                                type: FormDataType.String
                                            },
                                            {
                                                name: 'comment',
                                                type: FormDataType.String
                                            },
                                            {
                                                name: 'warehouseCode',
                                                type: FormDataType.String
                                            }
                                        ]
                                    ]}
                                />
                            ) : (
                                <ContentSpin />
                            )}
                        </StyledPageContent>
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

EditBox.displayName = 'EditBox';

export { EditBox };
