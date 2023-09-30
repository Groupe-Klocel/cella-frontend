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
import useTranslation from 'next-translate/useTranslation';
import styled from 'styled-components';
import { blocksRoutes } from '../Static/blocksRoutes';
import { AddBlockLocationForm } from '../Forms/AddBlockLocationForm';
import { useRouter } from 'next/router';
import { ModeEnum, Table } from 'generated/graphql';
import { useAppState } from 'context/AppContext';
import { getModesFromPermissions } from '@helpers';

const StyledPageContent = styled(Layout.Content)`
    margin: 15px 30px;
`;

export interface ISingleItemProps {
    blockId: string | any;
    blockName: string | any;
    buildingName: string | any;
}

export const AddBlockLocations = (props: ISingleItemProps) => {
    const { t } = useTranslation('actions');
    const router = useRouter();

    const blockDetailBreadCrumb = [
        ...blocksRoutes,
        {
            breadcrumbName: `${props.blockName}`,
            path: '/blocks/' + props.blockId
        }
    ];
    const breadCrumb = [
        ...blockDetailBreadCrumb,
        {
            breadcrumbName: t('actions:add-location')
        }
    ];

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Location);

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
                            title={t('actions:add-location')}
                            routes={breadCrumb}
                            onBack={() => router.push(`/blocks/${props.blockId}`)}
                        />
                        <StyledPageContent>
                            <AddBlockLocationForm
                                blockId={props.blockId}
                                blockName={props.blockName}
                                buildingName={props.buildingName}
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
