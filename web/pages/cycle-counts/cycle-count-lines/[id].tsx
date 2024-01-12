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
import { CycleCountLineModelV2 as model } from 'models/CycleCountLineModelV2';
import { cycleCountsRoutes as itemRoutes } from 'modules/CycleCounts/Static/cycleCountsRoutes';
import { useAppState } from 'context/AppContext';
import useTranslation from 'next-translate/useTranslation';
import { ModeEnum } from 'generated/graphql';
import { Button, Modal, Space } from 'antd';
import configs from '../../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

const CycleCountLinePage: PageComponent = () => {
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
            breadcrumbName: `${data?.cycleCount_name} - ${data?.location_name}`
        }
    ];

    const pageTitle = `${data?.cycleCount_name} - ${data?.location_name}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const confirmAction = (
        info: any | undefined,
        setInfo: any,
        action: 'delete' | 'disable' | 'enable'
    ) => {
        return () => {
            const titre =
                action == 'enable'
                    ? 'messages:enable-confirm'
                    : action == 'delete'
                    ? 'messages:delete-confirm'
                    : 'messages:disable-confirm';
            Modal.confirm({
                title: t(titre),
                onOk: () => {
                    setInfo(info);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    //RESTART HERE: Regenerate model, + page title = CC name + location name

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: `/cycle-counts/${data?.cycleCountId}`,
        actionsComponent:
            data?.status <= configs.CYCLE_COUNT_STATUS_CALCULATED ? (
                <Space>
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Delete) &&
                    model.isSoftDeletable ? (
                        <Button
                            onClick={() => confirmAction(id as string, setIdToDisable, 'disable')()}
                            type="primary"
                        >
                            {t('actions:disable')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isDeletable ? (
                        <Button
                            onClick={() => confirmAction(id as string, setIdToDelete, 'delete')()}
                        >
                            {t('actions:delete')}
                        </Button>
                    ) : (
                        <></>
                    )}
                </Space>
            ) : (
                <></>
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

CycleCountLinePage.layout = MainLayout;

export default CycleCountLinePage;
