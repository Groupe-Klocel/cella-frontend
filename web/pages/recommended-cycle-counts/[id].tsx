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
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useMemo, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { getModesFromPermissions } from '@helpers';
import { CycleCountModelV2 as model } from '@helpers';
import { CycleCountDetailsExtra } from 'modules/CycleCounts/Elements/CycleCountDetailsExtra';
import { recommendedCycleCountsRoutes as itemRoutes } from 'modules/CycleCounts/Static/recommendedCycleCountsRoutes';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { ModeEnum } from 'generated/graphql';
import { Button, Modal, Space } from 'antd';

type PageComponent = FC & { layout: typeof MainLayout };

const CycleCountPage: PageComponent = () => {
    const router = useRouter();
    const { permissions, configs } = useAppState();
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

    const configsParamsCodes = useMemo(() => {
        const findCodeByScopeAndValue = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };

        const calculatedCycleCountStatus = findCodeByScopeAndValue(
            configs,
            'cycle_count_status',
            'calculated'
        );

        const closedCycleCountStatus = findCodeByScopeAndValue(
            configs,
            'cycle_count_status',
            'closed'
        );

        return {
            calculatedCycleCountStatus,
            closedCycleCountStatus
        };
    }, [configs]);
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

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isDeletable &&
                data?.status <= parseInt(configsParamsCodes.calculatedCycleCountStatus) ? (
                    <Button onClick={() => confirmAction(id as string, setIdToDelete, 'delete')()}>
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isSoftDeletable &&
                data?.status < parseInt(configsParamsCodes.closedCycleCountStatus) ? (
                    <Button
                        onClick={() => confirmAction(id as string, setIdToDisable, 'disable')()}
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
            <AppHead title={headerData.title} />
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
