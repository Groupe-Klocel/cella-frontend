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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { ModeEnum } from 'generated/graphql';
import { FC, useEffect } from 'react';
import { NextRouter } from 'next/router';
import styled from 'styled-components';
import { getModesFromPermissions, useDetail, CustomObjectModelV2 as model } from '@helpers';
import { useAppState } from 'context/AppContext';
import { customObjectsRoutes } from '../Static/customObjectsRoutes';
import { EditCustomObjectForm } from '../Forms/EditCustomObjectForm';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface EditCustomObjectProps {
    id: string | any;
    router: NextRouter;
}

const EditCustomObject: FC<EditCustomObjectProps> = ({ id, router }: EditCustomObjectProps) => {
    const { t } = useTranslation();

    const { detail, reload } = useDetail(id, model.endpoints.detail, [
        'id',
        'name',
        'category',
        'externalName',
        'description',
        'documentAttached'
    ]);

    useEffect(() => {
        reload();
    }, [id]);

    const details = detail?.data?.[model.endpoints.detail];

    const breadCrumb = [
        ...customObjectsRoutes,
        {
            breadcrumbName: `${details?.name}`
        }
    ];

    const pageTitle = `${t('common:custom-object')} ${details?.name}`;

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, model.tableName);

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
                            title={`${pageTitle}`}
                            routes={breadCrumb}
                            onBack={() => router.back()}
                        />
                        <StyledPageContent>
                            {details ? (
                                <EditCustomObjectForm customObjectId={id} details={details} />
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

EditCustomObject.displayName = 'EditCustomObject';

export { EditCustomObject };
