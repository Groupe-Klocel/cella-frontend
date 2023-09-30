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
import { ModeEnum, Table, useListConfigsForAScopeQuery } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { FC, useEffect, useState } from 'react';

import styled from 'styled-components';

import {
    getModesFromPermissions,
    showError,
    useArticleWithBarcodes,
    useDetail,
    useFeatureCodes,
    useLocationIds,
    useStockOwnerIds
} from '@helpers';
import { FormDataType, FormOptionType, ModelType } from 'models/Models';
import { EditItemForm } from 'modules/Crud/submodules/EditItemForm';
import { HandlingUnitWithContentFeatureModel } from 'models/HandlingUnitWithContentFeatureModel';
import { useRouter } from 'next/router';
import { handlingUnitContentsSubRoutes } from 'modules/HandlingUnits/Static/handlingUnitContentsRoutes';
import { useAppState } from 'context/AppContext';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface IEditHandlingUnitContentFeatureProps {
    id: string | any;
}

const EditHandlingUnitContentFeature: FC<IEditHandlingUnitContentFeatureProps> = (
    props: IEditHandlingUnitContentFeatureProps
) => {
    const { t } = useTranslation();
    const router = useRouter();
    const breadsCrumb = [
        ...handlingUnitContentsSubRoutes,
        {
            breadcrumbName: `${props.id}`
        }
    ];

    const { detail, reload: reloadData } = useDetail(
        props.id,
        HandlingUnitWithContentFeatureModel.endpoints.detail,
        HandlingUnitWithContentFeatureModel.detailFields
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

    const [fCodeOptions, setFCodeOptions] = useState<Array<FormOptionType>>([]);

    const fCodeData = useFeatureCodes({}, 1, 100, null);

    const [formData, setFormData] = useState<any>(null);

    useEffect(() => {
        // Flatten the fetched data for automatically parsing in editform.
        if (
            detail.data &&
            detail.data.handlingUnitContentFeature &&
            detail.data.handlingUnitContentFeature.featureCode.id
        ) {
            setFormData({
                featureCodeId: detail.data.handlingUnitContentFeature.featureCode.id
            });
        }
    }, [detail.data]);

    // Update feature code selection dropdown data.
    useEffect(() => {
        if (fCodeData.data && fCodeData.data.featureCodes) {
            const newIdOpts: Array<FormOptionType> = fCodeData.data.featureCodes!.results.map(
                ({ id, name }) => {
                    return { text: name!, key: id! };
                }
            );
            setFCodeOptions(newIdOpts);
        }
    }, [fCodeData.data]);

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.HandlingUnitContentFeature);

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
                            title={`${t('handling-units')} ${props.id!}`}
                            routes={breadsCrumb}
                            onBack={() => router.back()}
                        />
                        <StyledPageContent>
                            {formData && !detail.isLoading ? (
                                <EditItemForm
                                    id={props.id}
                                    details={formData}
                                    dataModel={HandlingUnitWithContentFeatureModel}
                                    routeAfterSuccess={`/handling-unit-contents/feature/:id`}
                                    editSteps={[
                                        [
                                            {
                                                name: 'featureCodeId',
                                                displayName: t('d:featureCode'),
                                                type: FormDataType.Dropdown,
                                                rules: [
                                                    {
                                                        required: true,
                                                        message: errorMessageEmptyInput
                                                    }
                                                ],
                                                subOptions: fCodeOptions,
                                                disabled: false
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

EditHandlingUnitContentFeature.displayName = 'EditHandlingUnitContentFeature';

export { EditHandlingUnitContentFeature };
