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
import { EyeTwoTone } from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import { getModesFromPermissions, META_DEFAULTS, pathParams } from '@helpers';
import { Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
// import { handlingUnitContentsSubRoutes as itemRoutes } from 'modules/HandlingUnits/Static/handlingUnitContentsRoutes';
import useTranslation from 'next-translate/useTranslation';
import { FC, useState } from 'react';
import { FeaturesListModelV2 as model } from 'models/FeaturesListModelV2';

type PageComponent = FC & { layout: typeof MainLayout };

const HandlingUnitContentFeaturesPage: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const modes = getModesFromPermissions(permissions, model.tableName);

    const headerData: HeaderData = {
        title: t('common:handlingUnitContentFeatures'),
        routes: [
            {
                breadcrumbName: 'menu:stock-management'
            },
            {
                path: '/handling-unit-content-features',
                breadcrumbName: 'menu:features-in-stock'
            }
        ],
        actionsComponent: null
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; handlingUnitContentId: string }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(
                                            `/handling-unit-contents/[id]`,
                                            record.handlingUnitContentId
                                        )}
                                    />
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={'/handling-unit-contents/:id'}
            />
        </>
    );
};

HandlingUnitContentFeaturesPage.layout = MainLayout;

export default HandlingUnitContentFeaturesPage;
