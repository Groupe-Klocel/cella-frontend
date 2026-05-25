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
import { AppointmentLineModelV2 as model } from '@helpers';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useMemo, useState } from 'react';
import { getModesFromPermissions } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { appointmentsRoutes as itemRoutes } from 'modules/Appointments/Static/appointmentsRoutes';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import MainLayout from 'components/layouts/MainLayout';

type PageComponent = FC & { layout: typeof MainLayout };

const AppointmentLinePage: PageComponent = () => {
    const router = useRouter();
    const { parameters, configs, permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id, count } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    // #region to customize information
    const appointmentDetailBreadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.appointment_name}`,
            path: '/appointments/' + data?.appointmentId
        }
    ];

    const breadCrumb = [
        ...appointmentDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:line')} ${count}`
        }
    ];

    const pageTitle = `${data?.appointment_name} - ${t('common:line')} ${count}`;
    // #endregions

    const configsParamsCodes = useMemo(() => {
        const findCodeByScopeAndValue = (items: any[], scope: string, value: string) => {
            return items.find((item: any) => item.scope === scope && item.value === value)?.code;
        };
        const appointmentStatusInCreation = findCodeByScopeAndValue(
            configs,
            'appointment_status',
            'In Creation'
        );
        const appointmentStatusConfirmed = findCodeByScopeAndValue(
            configs,
            'appointment_status',
            'Confirmed'
        );
        const appointmentStatusCancelled = findCodeByScopeAndValue(
            configs,
            'appointment_status',
            'Cancelled'
        );
        return {
            appointmentStatusInCreation,
            appointmentStatusConfirmed,
            appointmentStatusCancelled
        };
    }, [configs, parameters]);

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

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
        actionsComponent: (
            <Space>
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                model.isEditable &&
                data?.status < configsParamsCodes.appointmentStatusCancelled ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/line/edit/${id}`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isSoftDeletable &&
                data?.status < configsParamsCodes.appointmentStatusConfirmed ? (
                    <Button
                        onClick={() => confirmAction(id as string, setIdToDisable)()}
                        type="primary"
                    >
                        {t('actions:cancel')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isDeletable &&
                data?.status == configsParamsCodes.appointmentStatusInCreation ? (
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
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
            />
        </>
    );
};

AppointmentLinePage.layout = MainLayout;

export default AppointmentLinePage;
