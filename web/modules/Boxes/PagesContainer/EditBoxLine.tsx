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

import { flatten, getModesFromPermissions, showError, useDetail } from '@helpers';
import { FormDataType } from 'models/Models';
import { BoxLineModel } from 'models/BoxLineModel';
import { useRouter } from 'next/router';
import { boxesRoutes } from 'modules/Boxes/Static/boxesRoutes';
import { EditBoxLineForm } from '../Forms/EditBoxLineForm';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface IEditBoxLineProps {
    id: string | any;
    name: string | any;
    setData?: any;
}

const EditBoxLine: FC<IEditBoxLineProps> = (props: IEditBoxLineProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const breadsCrumb = [
        ...boxesRoutes,
        {
            breadcrumbName: `${t('common:boxLine')} / edit / ${props.name}`
        }
    ];

    const { detail, reload: reloadData } = useDetail(
        props.id,
        BoxLineModel.endpoints.detail,
        BoxLineModel.detailFields
    );

    useEffect(() => {
        reloadData();
    }, [router.locale]);

    useEffect(() => {
        if (detail.error) {
            showError(t('messages:error-getting-data'));
        }
    }, [detail.error]);

    const [formData, setFormData] = useState<any>(null);

    useEffect(() => {
        // Flatten the fetched data for automatically parsing in editform.
        if (detail.data) {
            setFormData(flatten(detail.data));
            if (props.setData) props.setData(flatten(detail.data));
        }
    }, [detail.data]);

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.HandlingUnitContentOutbound);

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
                            title={`${t('common:boxLine')}: ${props.name}`}
                            routes={breadsCrumb}
                            onBack={() => router.back()}
                        />
                        <StyledPageContent>
                            {formData && !detail.isLoading ? (
                                <EditBoxLineForm
                                    id={props.id}
                                    details={formData}
                                    dataModel={BoxLineModel}
                                    routeAfterSuccess={`/boxes/boxLine/:id`}
                                    editSteps={[
                                        [
                                            {
                                                name: 'handlingUnitContentOutbound_handlingUnitContent_handlingUnit_stockOwner_name',
                                                displayName: t('d:stockOwner'),
                                                type: FormDataType.String,
                                                disabled: true
                                            },
                                            {
                                                name: 'handlingUnitContentOutbound_delivery_name',
                                                displayName: t('d:delivery_name'),
                                                type: FormDataType.String,
                                                disabled: true
                                            },
                                            {
                                                name: 'handlingUnitContentOutbound_handlingUnitContent_handlingUnit_handlingUnitOutbounds_name',
                                                displayName: t('common:box'),
                                                type: FormDataType.String,
                                                disabled: true
                                            },
                                            {
                                                name: 'handlingUnitContentOutbound_handlingUnitContent_article_name',
                                                displayName: t('common:article'),
                                                type: FormDataType.String,
                                                disabled: true
                                            },
                                            {
                                                name: 'handlingUnitContentOutbound_handlingUnitContent_articleLuBarcode_articleLu_lu_name',
                                                displayName: t('d:logisticUnit'),
                                                type: FormDataType.String,
                                                disabled: true
                                            },
                                            {
                                                name: 'handlingUnitContentOutbound_deliveryLine_quantityToBePicked',
                                                displayName: t('d:deliveryLine_quantityToBePicked'),
                                                type: FormDataType.String,
                                                disabled: true
                                            },
                                            {
                                                name: 'handlingUnitContentOutbound_pickedQuantity',
                                                displayName: t('d:pickedQuantity'),
                                                type: FormDataType.String,
                                                disabled: true
                                            },
                                            {
                                                name: 'handlingUnitContentOutbound_missingQuantity',
                                                displayName: t('d:missingQuantity'),
                                                type: FormDataType.String,
                                                disabled: true
                                            },
                                            {
                                                name: 'handlingUnitContentOutbound_preparationModeText',
                                                displayName: t('d:preparationModeText'),
                                                type: FormDataType.String,
                                                disabled: true
                                            },
                                            {
                                                name: 'handlingUnitContentOutbound_statusText',
                                                displayName: t('d:statusText'),
                                                type: FormDataType.String,
                                                disabled: true
                                            },
                                            {
                                                name: 'handlingUnitContentOutbound_handlingUnitContent_reservation',
                                                displayName: t('d:reservation'),
                                                type: FormDataType.String,
                                                disabled: true
                                            },
                                            {
                                                name: 'handlingUnitContentOutbound_comment',
                                                displayName: t('d:comment'),
                                                type: FormDataType.TextArea
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

EditBoxLine.displayName = 'EditBoxLine';

export { EditBoxLine };
