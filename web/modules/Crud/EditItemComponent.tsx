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
import { ContentSpin } from '@components';
import { Alert, Layout, message } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';

import { FC, useEffect, useState } from 'react';
import styled from 'styled-components';
import { flatten, getModesFromPermissions, showError, useDetail, useUpdate } from '@helpers';
import { EditItemForm } from './submodules/EditItemForm';
import { FilterFieldType, ModelType } from 'models/Models';
import { useRouter } from 'next/router';
import { ModeEnum } from 'generated/graphql';
import { useAppState } from 'context/AppContext';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface IEditItemProps {
    id: string | any;
    headerComponent: any;
    dataModel: ModelType;
    routeAfterSuccess: string;
    editSteps: Array<Array<FilterFieldType>>;
    setData?: any;
    routeOnCancel?: string;
}

const EditItemComponent: FC<IEditItemProps> = (props: IEditItemProps) => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const router = useRouter();
    const [editData, setEditData] = useState<any>(null);

    const { detail, reload: reloadData } = useDetail(
        props.id,
        props.dataModel.endpoints.detail,
        props.dataModel.detailFields
    );

    useEffect(() => {
        reloadData();
    }, [router.locale]);

    useEffect(() => {
        if (detail.data[props.dataModel.endpoints.detail]) {
            let flattenedData = flatten(detail.data[props.dataModel.endpoints.detail]);

            if (props.setData) props.setData(flattenedData);

            // Hide fields if there is any hidden selected.
            if (props.dataModel.excludedDetailFields)
                flattenedData = Object.keys(flattenedData)
                    .filter((key) => !props.dataModel.excludedDetailFields!.includes(key))
                    .reduce((obj: any, key: any) => {
                        obj[key] = flattenedData[key];
                        return obj;
                    }, {});
            // Update parsed data
            setEditData(flattenedData);
        }
    }, [detail.data]);

    useEffect(() => {
        if (detail.error) {
            showError(t('messages:error-getting-data'));
        }
    }, [detail.error]);

    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);

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
                        {props.headerComponent}

                        <StyledPageContent>
                            {detail.data &&
                            !detail.isLoading &&
                            detail.data[props.dataModel.endpoints.detail] ? (
                                <EditItemForm
                                    id={props.id}
                                    details={detail.data[props.dataModel.endpoints.detail]}
                                    dataModel={props.dataModel}
                                    routeAfterSuccess={props.routeAfterSuccess}
                                    editSteps={props.editSteps}
                                    routeOnCancel={props.routeOnCancel}
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

EditItemComponent.displayName = 'EditItemComponent';

export { EditItemComponent };
