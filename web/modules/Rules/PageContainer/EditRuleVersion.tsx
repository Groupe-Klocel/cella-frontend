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
    GetRuleVersionByIdQuery,
    ModeEnum,
    Table,
    useGetRuleVersionByIdQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { FC, useEffect } from 'react';
import { NextRouter } from 'next/router';
import styled from 'styled-components';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError } from '@helpers';
import { rulesRoutes as itemRoutes } from '../Static/rulesRoutes';
import { useAppState } from 'context/AppContext';
import { EditRuleVersionForm } from '../Forms/EditRuleVersionForm';

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

export interface EditRuleVersionProps {
    id: string | any;
    router: NextRouter;
}

const EditRuleVersion: FC<EditRuleVersionProps> = ({ id, router }: EditRuleVersionProps) => {
    const { t } = useTranslation();

    const { graphqlRequestClient } = useAuth();

    const { isLoading, data, error } = useGetRuleVersionByIdQuery<GetRuleVersionByIdQuery, Error>(
        graphqlRequestClient,
        {
            id: id
        }
    );

    const ruleDetailBreadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.ruleVersion?.rule?.name}`,
            path: '/rules/' + data?.ruleVersion?.ruleId
        }
    ];

    const breadCrumb = [
        ...ruleDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:version')} ${data?.ruleVersion?.version}`
        }
    ];

    useEffect(() => {
        if (error) {
            showError(t('messages:error-getting-data'));
        }
    }, [error]);

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.RuleVersion);

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
                            title={`${t('menu:rule-version')} ${data?.ruleVersion?.version}`}
                            routes={breadCrumb}
                            onBack={() => router.push(`/rules/${data?.ruleVersion?.ruleId}`)}
                        />
                        <StyledPageContent>
                            {data && !isLoading ? (
                                <EditRuleVersionForm
                                    ruleVersionId={id}
                                    details={data?.ruleVersion}
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

EditRuleVersion.displayName = 'EditRuleVersion';

export { EditRuleVersion };
