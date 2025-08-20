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
import { META_DEFAULTS, getModesFromPermissions } from '@helpers';
import { HandlingUnitContentInboundModelV2 as model } from 'models/HandlingUnitContentInboundModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { goodsInsRoutes as itemRoutes } from 'modules/GoodsIns/Static/goodsInsRoutes';
import { BoxLineDetailsExtra } from 'modules/Boxes/Elements/BoxLineDetailsExtra';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import { useAppState } from 'context/AppContext';
import configs from '../../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

const InboundBoxLinePage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, model.tableName);

    // #region to customize information
    const boxDetailBreadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.handlingUnitInbound_name}`,
            path: '/boxes/' + data?.handlingUnitInboundId
        }
    ];

    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const breadCrumb = [
        ...boxDetailBreadCrumb,
        {
            breadcrumbName: `${t('common:line')} ${data?.lineNumber}`
        }
    ];

    const pageTitle = `${data?.handlingUnitInbound_name} - ${t('common:line')} ${data?.lineNumber}`;
    // #endregions

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
                data?.status < configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_ESTIMATED ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/boxLine/edit/${id}`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isSoftDeletable &&
                data?.status < configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_ESTIMATED ? (
                    <Button
                        onClick={() => confirmAction(id as string, setIdToDisable)()}
                        type="primary"
                    >
                        {t('actions:disable')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isDeletable &&
                data?.status < configs.HANDLING_UNIT_CONTENT_OUTBOUND_STATUS_ESTIMATED ? (
                    <Button onClick={() => confirmAction(id as string, setIdToDelete)()}>
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
            </Space>
        )
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                extraDataComponent={<BoxLineDetailsExtra contentId={data?.handlingUnitContentId} />}
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

InboundBoxLinePage.layout = MainLayout;

export default InboundBoxLinePage;
