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
import { AppHead, LinkButton } from '@components';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { META_DEFAULTS, getModesFromPermissions } from '@helpers';
import { CycleCountMovementModelV2 as model } from 'models/CycleCountMovementModelV2';
import { cycleCountsRoutes as itemRoutes } from 'modules/CycleCounts/Static/cycleCountsRoutes';
import { useAppState } from 'context/AppContext';
import useTranslation from 'next-translate/useTranslation';
import { ModeEnum } from 'generated/graphql';
import { Button, Modal, Space } from 'antd';

type PageComponent = FC & { layout: typeof MainLayout };

const CycleCountMovementPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    // #region to customize information if needed
    const cycleCountDetailBreadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.cycleCount_name}`,
            path: '/cycle-counts/' + data?.cycleCountId
        }
    ];
    const breadCrumb = [
        ...cycleCountDetailBreadCrumb,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:cycle-count-movement')} ${data?.name}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const confirmAction = (id: string | undefined, setId: any) => {
        return () => {
            Modal.confirm({
                title: t('messages:delete-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: `/cycle-counts/${data?.cycleCountId}`,
        actionsComponent: (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isSoftDeletable ? (
                    <Button
                        onClick={() => confirmAction(id as string, setIdToDisable)()}
                        type="primary"
                    >
                        {t('actions:disable')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isDeletable ? (
                    <Button onClick={() => confirmAction(id as string, setIdToDelete)()}>
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
            </Space>
        )
    };
    // #endregion

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
            />
        </>
    );
};

CycleCountMovementPage.layout = MainLayout;

export default CycleCountMovementPage;
