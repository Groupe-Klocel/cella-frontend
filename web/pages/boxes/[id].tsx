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
import { AppHead, LinkButton, NumberOfPrintsModalV2 } from '@components';
import { HandlingUnitOutboundModelV2 as model } from 'models/HandlingUnitOutboundModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { META_DEFAULTS, getModesFromPermissions, useBoxLines } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { boxesRoutes as itemRoutes } from 'modules/Boxes/Static/boxesRoutes';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import configs from '../../../common/configs.json';
import { BoxDetailsExtra } from 'modules/Boxes/Elements/BoxDetailsExtra';
import { BarcodeOutlined } from '@ant-design/icons';
import { cancelHuoDeliveryStatus as statusForCancelation } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

const BoxPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [cancelInfo, setCancelInfo] = useState<any>();
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:boxes')} ${data?.name}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = itemRoutes[itemRoutes.length - 1].path;

    const confirmAction = (id: string | undefined, setInfo: any) => {
        return () => {
            Modal.confirm({
                title: t('messages:action-confirm'),
                onOk: () => {
                    setInfo({ id, status: configs.HANDLING_UNIT_OUTBOUND_STATUS_CANCELLED });
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
                data?.status < configs.HANDLING_UNIT_OUTBOUND_STATUS_LOAD_IN_PROGRESS ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/edit/${id}`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                model.isEditable &&
                statusForCancelation.HUO.includes(data?.status) ? (
                    <Button
                        type="primary"
                        danger
                        onClick={() => {
                            confirmAction(id as string, setCancelInfo)();
                        }}
                    >
                        {t('actions:cancel')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isDeletable &&
                data?.status == configs.HANDLING_UNIT_OUTBOUND_STATUS_CREATED ? (
                    <Button onClick={() => confirmAction(id as string, setIdToDelete)()}>
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
                <Button
                    type="primary"
                    ghost
                    onClick={() => {
                        setShowNumberOfPrintsModal(true);
                        setIdToPrint(data?.id as string);
                    }}
                    icon={<BarcodeOutlined />}
                />
                <NumberOfPrintsModalV2
                    showModal={{
                        showNumberOfPrintsModal,
                        setShowNumberOfPrintsModal
                    }}
                    dataToPrint={{ boxes: [idToPrint] }}
                    documentName="K_OutboundHandlingUnitLabel"
                    documentReference={data?.name}
                />
            </Space>
        )
    };
    // #endregion

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                extraDataComponent={<BoxDetailsExtra boxId={id} />}
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerCancel={{ cancelInfo, setCancelInfo }}
            />
        </>
    );
};

BoxPage.layout = MainLayout;

export default BoxPage;
