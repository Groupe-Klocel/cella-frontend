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
import { AppHead } from '@components';
import { META_DEFAULTS } from '@helpers';
import MainLayout from 'components/layouts/MainLayout';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';
import { ConfigRule } from 'modules/Rules/PageContainer/ConfigRule';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';

type PageComponent = FC & { layout: typeof MainLayout };

const AddConfigInRulePage: PageComponent = () => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const rule = JSON.parse(router?.query?.rule as string);
    const type = router?.query?.type as string;
    const [ruleVersionToUpdate, setRuleVersionToUpdate] = useState<any>(null);

    const ruleVersionQuery = gql`
        query ruleVersion($id: String!) {
            ruleVersion(id: $id) {
                id
                ruleConfigurationIn
                ruleConfigurationOut
                ruleVersionConfigs {
                    id
                    order
                }
            }
        }
    `;
    useEffect(() => {
        const fetchRuleVersion = async () => {
            const ruleVersionRVariable = {
                id: rule?.id
            };
            const result = await graphqlRequestClient.request(
                ruleVersionQuery,
                ruleVersionRVariable
            );
            if (result) {
                setRuleVersionToUpdate(result.ruleVersion);
            }
        };
        fetchRuleVersion();
    }, []);

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ConfigRule rule={rule} type={type} ruleVersionToUpdate={ruleVersionToUpdate} />
        </>
    );
};

AddConfigInRulePage.layout = MainLayout;

export default AddConfigInRulePage;
