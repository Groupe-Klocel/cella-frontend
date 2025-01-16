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
import { Alert, Layout } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import {
    GetRuleVersionConfigByIdQuery,
    ModeEnum,
    Table,
    useGetRuleVersionConfigByIdQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { FC, useEffect } from 'react';
import { NextRouter } from 'next/router';
import styled from 'styled-components';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError } from '@helpers';
import { rulesRoutes as itemRoutes } from '../Static/rulesRoutes';
import { useAppState } from 'context/AppContext';
import { EditRuleVersionConfigForm } from '../Forms/EditRuleVersionConfigForm';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface EditRuleVersionConfigProps {
    id: string | any;
    router: NextRouter;
}

const EditRuleVersionConfig: FC<EditRuleVersionConfigProps> = ({
    id,
    router
}: EditRuleVersionConfigProps) => {
    const { t } = useTranslation();

    const { graphqlRequestClient } = useAuth();

    const { isLoading, data, error } = useGetRuleVersionConfigByIdQuery<
        GetRuleVersionConfigByIdQuery,
        Error
    >(graphqlRequestClient, {
        id: id
    });

    const ruleDetailBreadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.ruleVersionConfig?.ruleVersion?.rule?.name}`,
            path: '/rules/' + data?.ruleVersionConfig?.ruleVersion?.ruleId
        }
    ];

    const ruleVersionDetailBreadCrumb = [
        ...ruleDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:version')} ${
                data?.ruleVersionConfig?.ruleVersion?.version
            }`,
            path: '/rules/version/' + data?.ruleVersionConfig?.ruleVersionId
        }
    ];

    const breadCrumb = [
        ...ruleVersionDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:order')} ${data?.ruleVersionConfig?.order}`
        }
    ];

    useEffect(() => {
        if (error) {
            showError(t('messages:error-getting-data'));
        }
    }, [error]);

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Location);

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
                            title={`${t('menu:order')} ${data?.ruleVersionConfig?.order}`}
                            routes={breadCrumb}
                            onBack={() =>
                                router.push(
                                    `/rules/version/${data?.ruleVersionConfig?.ruleVersionId}`
                                )
                            }
                        />
                        <StyledPageContent>
                            {data && !isLoading ? (
                                <EditRuleVersionConfigForm
                                    ruleVersionConfigId={id}
                                    details={data?.ruleVersionConfig}
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

EditRuleVersionConfig.displayName = 'EditRuleVersionConfig';

export { EditRuleVersionConfig };
