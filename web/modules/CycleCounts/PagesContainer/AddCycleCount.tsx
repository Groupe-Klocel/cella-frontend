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
import { Alert, Layout } from 'antd';
import { ContentSpin, HeaderContent } from '@components';
import { AddCycleCountForm } from '../Forms/AddCycleCountForm';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import styled from 'styled-components';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { addCycleCountRoutes } from '../Static/cycleCountsRoutes';
import { useAppState } from 'context/AppContext';
import { getModesFromPermissions } from '@helpers';
import { ModeEnum, Table } from 'generated/graphql';

const StyledPageContent = styled(Layout.Content)`
    margin: 15px 30px;
`;

export const AddCycleCount = () => {
    const { t } = useTranslation('actions');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const { cycleCountModel } = router.query;
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.CycleCount);

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
                            title={t('actions:add-cycle-count')}
                            routes={addCycleCountRoutes}
                            onBack={() => router.push(`/cycle-counts`)}
                        />
                        <StyledPageContent>
                            <AddCycleCountForm cycleCountModel={cycleCountModel!} />
                        </StyledPageContent>
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};
