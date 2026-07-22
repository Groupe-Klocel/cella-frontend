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
import {
    getModesFromPermissions,
    getVisitStatusCodes,
    getVisitStatusConfig,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { useRouter } from 'next/router';
import { FC, useMemo, useState } from 'react';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { VisitorModelV2 as model } from '@helpers';
import { Button, Modal, Space, Tag, Tooltip } from 'antd';
import { LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { ModeEnum } from 'generated/graphql';
import { visitorsRoutes as itemRoutes } from 'modules/Visitors/Static/visitorsRoutes';
import { useAuth } from 'context/AuthContext';
import { VisitorDetailsExtra } from 'modules/Visitors/Elements/VisitorDetailsExtra';
import { checkOutVisit, cancelVisit } from 'modules/Visitors/Functions/visitorActions';

type PageComponent = FC & { layout: typeof MainLayout };

const VisitorPage: PageComponent = () => {
    const router = useRouter();
    const { permissions, configs } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, 'wm_visitors');
    const checkInModes = getModesFromPermissions(permissions, 'wm_visitor-check-in');
    const checkOutModes = getModesFromPermissions(permissions, 'wm_visitor-check-out');
    const { id } = router.query;
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const { graphqlRequestClient } = useAuth();
    const language = router.locale ?? 'en-US';

    const visitStatuses = useMemo(() => getVisitStatusCodes(configs), [configs]);
    const statusConfig = getVisitStatusConfig(configs, data?.status);

    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name ?? ''}`
        }
    ];

    const pageTitle = `${t('common:visitor')} ${data?.name ?? ''}`;

    const isPreCheckIn =
        data?.status === visitStatuses.toBeChecked || data?.status === visitStatuses.preRegistered;

    const confirmCheckOut = () => {
        Modal.confirm({
            title: t('messages:check-out-confirm'),
            onOk: async () => {
                try {
                    await checkOutVisit(graphqlRequestClient, data, visitStatuses.checkedOut!);
                    showSuccess(t('messages:success-updated'));
                    setTriggerRefresh((current) => !current);
                } catch (error) {
                    console.error('Error during check-out:', error);
                    showError(t('messages:error-update-data'));
                }
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const confirmCancel = () => {
        Modal.confirm({
            title: t('messages:cancel-visit-confirm'),
            onOk: async () => {
                try {
                    await cancelVisit(graphqlRequestClient, data, visitStatuses.cancelled!);
                    showSuccess(t('messages:success-updated'));
                    setTriggerRefresh((current) => !current);
                } catch (error) {
                    console.error('Error cancelling visit:', error);
                    showError(t('messages:error-update-data'));
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
                {statusConfig ? (
                    <Tag color={statusConfig?.extras?.color} style={{ fontSize: 14 }}>
                        {statusConfig?.translation?.[language] ?? statusConfig?.value}
                    </Tag>
                ) : null}
                {modes.includes(ModeEnum.Update) && data?.status === visitStatuses.preRegistered ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/edit/${id}`}
                        type="primary"
                    />
                ) : null}
                {checkInModes.includes(ModeEnum.Read) && isPreCheckIn ? (
                    <LinkButton
                        icon={<LoginOutlined />}
                        tooltip={t('actions:visitor-check-in')}
                        path={`${rootPath}/check-in/${id}`}
                        type="primary"
                    />
                ) : null}
                {checkOutModes.includes(ModeEnum.Update) &&
                data?.status === visitStatuses.checkedIn ? (
                    <Tooltip
                        placement="top"
                        title={t('actions:visitor-check-out')}
                        align={{ offset: [0, 0] }}
                        overlayStyle={{ pointerEvents: 'none' }}
                    >
                        <Button
                            type="primary"
                            icon={<LogoutOutlined />}
                            onClick={confirmCheckOut}
                        />
                    </Tooltip>
                ) : null}
                {modes.includes(ModeEnum.Update) &&
                (isPreCheckIn || data?.status === visitStatuses.checkedIn) ? (
                    <Button danger onClick={confirmCancel}>
                        {t('actions:cancel')}
                    </Button>
                ) : null}
            </Space>
        )
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                extraDataComponent={<VisitorDetailsExtra visitId={id} data={data} />}
                headerData={headerData}
                id={id!}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete: undefined, setIdToDelete: () => undefined }}
                triggerSoftDelete={{ idToDisable: undefined, setIdToDisable: () => undefined }}
                refetch={triggerRefresh}
            />
        </>
    );
};

export default VisitorPage;

VisitorPage.layout = MainLayout;
