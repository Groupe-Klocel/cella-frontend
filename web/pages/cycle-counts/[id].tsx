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
import MainLayout from '../../components/layouts/MainLayout';
import { META_DEFAULTS, getModesFromPermissions, showError, showSuccess } from '@helpers';
import { CycleCountModelV2 as model } from 'models/CycleCountModelV2';
import { CycleCountDetailsExtra } from 'modules/CycleCounts/Elements/CycleCountDetailsExtra';
import { cycleCountsRoutes as itemRoutes } from 'modules/CycleCounts/Static/cycleCountsRoutes';
import { useAppState } from 'context/AppContext';
import useTranslation from 'next-translate/useTranslation';
import { ModeEnum } from 'generated/graphql';
import { Button, Modal, Space } from 'antd';
import configs from '../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

const CycleCountPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    // #region to customize information if needed
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:cycle-count')} ${data?.name}`;
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
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

    // START
    const startCycleCount = (cycleCountId: string, status: Number) => {
        Modal.confirm({
            title: t('messages:start-confirm'),
            onOk: async () => {
                const cycleCounts: Array<any> = [];
                cycleCounts.push({ id: cycleCountId, status: status });

                const res = await fetch(`/api/cycle-count/start`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        cycleCounts: cycleCounts
                    })
                });

                const response = await res.json();

                if (res.ok) {
                    // start success
                    showSuccess(t('messages:success-start'));
                    router.reload();
                } else {
                    if (response.error.is_error) {
                        // specific error
                        showError(t(`errors:${response.error.code}`));
                    } else {
                        // generic error
                        showError(t('messages:error-start'));
                    }
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isDeletable &&
                data?.status == configs.CYCLE_COUNT_STATUS_CREATED &&
                data?.model == configs.CYCLE_COUNT_MODEL_RECOMMENDED ? (
                    <Button onClick={() => startCycleCount(data?.id as string, data?.status)}>
                        {t('actions:start')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isDeletable &&
                data?.status <= configs.CYCLE_COUNT_STATUS_CALCULATED ? (
                    <Button onClick={() => confirmAction(id as string, setIdToDelete)()}>
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isSoftDeletable ? (
                    <Button
                        onClick={() => confirmAction(id as string, setIdToDisable)()}
                        type="primary"
                    >
                        {t('actions:cancel')}
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
                extraDataComponent={
                    <CycleCountDetailsExtra
                        cycleCountId={id!}
                        cycleCountModel={data?.model}
                        cycleCountStatus={data?.status}
                    />
                }
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
            />
        </>
    );
};

CycleCountPage.layout = MainLayout;

export default CycleCountPage;
