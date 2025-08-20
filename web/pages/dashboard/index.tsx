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
import { AppHead, HeaderContent } from '@components';
import { cookie, META_DEFAULTS, showError } from '@helpers';
import { Empty } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState } from 'react';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
type PageComponent = FC & { layout: typeof MainLayout };

const ConversionPages: PageComponent = () => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const [dashboard, setDashboard] = useState<any>();

    const getDashboard = async () => {
        const query = gql`
            mutation executeFunction($functionName: String!, $event: JSON!) {
                executeFunction(functionName: $functionName, event: $event) {
                    status
                    output
                }
            }
        `;

        const variables = {
            functionName: 'K_generateDashboard',
            event: {
                token: cookie.get('token')
            }
        };

        try {
            const dashboardResult = await graphqlRequestClient.request(query, variables);
            if (dashboardResult.executeFunction.status === 'ERROR') {
                showError(dashboardResult.executeFunction.output);
            } else if (
                dashboardResult?.executeFunction?.status === 'OK' &&
                dashboardResult?.executeFunction?.output?.status === 'KO'
            ) {
                showError(t(`errors:${dashboardResult?.executeFunction?.output?.output?.code}`));
                console.log('Backend_message', dashboardResult?.executeFunction?.output?.output);
            } else {
                if (dashboardResult?.executeFunction?.output) {
                    const decodedDashboard = Buffer.from(
                        dashboardResult?.executeFunction?.output,
                        'base64'
                    ).toString('utf-8');
                    setDashboard(decodedDashboard);
                }
            }
        } catch (error) {
            showError(t('messages:error-executing-function'));
            console.log('executeFunctionError', error);
        }
    };

    getDashboard();

    return (
        <>
            <AppHead title={t('menu:dashboard')} />
            <HeaderContent title={t('menu:dashboard')} />
            {dashboard ? (
                <div dangerouslySetInnerHTML={{ __html: dashboard }} />
            ) : (
                <Empty description={<span>{t('messages:no-data')}</span>} />
            )}
        </>
    );
};

ConversionPages.layout = MainLayout;

export default ConversionPages;
