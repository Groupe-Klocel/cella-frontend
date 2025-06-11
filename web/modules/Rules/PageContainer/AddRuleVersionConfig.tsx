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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import styled from 'styled-components';
import { Alert, Layout } from 'antd';
import { useRouter } from 'next/router';
import { rulesRoutes } from '../Static/rulesRoutes';
import { RuleVersionConfigForm } from '../Forms/RuleVersionConfigForm';
import { useAppState } from 'context/AppContext';
import { getModesFromPermissions } from '@helpers';
import { ModeEnum, Table } from 'generated/graphql';

const StyledPageContent = styled(Layout.Content)`
    margin: 15px 30px;
`;

export interface ISingleItemProps {
    rule: any;
}

const AddRuleVersionConfig = (props: ISingleItemProps) => {
    const rule = props.rule;
    const { t } = useTranslation('actions');
    const router = useRouter();

    const ruleDetailBreadCrumb = [
        ...rulesRoutes,
        {
            breadcrumbName: `${rule.rule_name}`,
            path: '/rules/' + rule.ruleId
        }
    ];

    const ruleVersionDetailBreadCrumb = [
        ...ruleDetailBreadCrumb,
        {
            breadcrumbName: 'version' + `${rule.version}`,
            path: '/rules/version/' + rule.id
        }
    ];

    const breadsCrumb = [
        ...ruleVersionDetailBreadCrumb,
        {
            breadcrumbName: t('add2', { name: t('common:rule-version-config') })
        }
    ];

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.RuleVersionConfig);

    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Create) ? (
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
                            title={t('add2', { name: t('common:rule-version-config') })}
                            routes={breadsCrumb}
                            onBack={() => router.push('/rules/version/' + rule.id)}
                        />
                        <StyledPageContent>
                            <RuleVersionConfigForm
                                ruleVersionId={rule.id}
                                ruleVersion={rule.version}
                                ruleName={rule.rule_name}
                            />
                        </StyledPageContent>
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

export { AddRuleVersionConfig };
