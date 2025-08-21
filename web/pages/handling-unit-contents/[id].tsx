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
import { HandlingUnitContentModelV2 as model } from 'models/HandlingUnitContentModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { META_DEFAULTS, getModesFromPermissions } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { handlingUnitContentsSubRoutes as itemRoutes } from 'modules/HandlingUnits/Static/handlingUnitContentsRoutes';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import parameters from '../../../common/parameters.json';
import { HandlingUnitContentDetailsExtra } from 'modules/HandlingUnits/Elements/HandlingUnitContentDetailsExtra';
import { BarcodeOutlined } from '@ant-design/icons';

type PageComponent = FC & { layout: typeof MainLayout };

const HandlingUnitContentPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);
    const [infoToPrint, setInfoToPrint] = useState<any>();
    const [refetchContent, setRefetchContent] = useState(false);

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.handlingUnit_name} - ${data?.article_name} x ${data?.quantity}`
        }
    ];

    const pageTitle = `${t('common:handling-unit-content')} - ${data?.handlingUnit_name} - ${
        data?.article_name
    } x ${data?.quantity}`;
    // #endregions
    console.log('HandlingUnitContentPage', { data, id, refetchContent });
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
    const dataToCreateMovement = {
        content: {
            articleId: data?.articleId,
            articleName: data?.article_name,
            stockStatus: data?.stockStatus,
            quantity: data?.quantity,
            locationId: data?.handlingUnit_locationId,
            locationName: data?.handlingUnit_location_name,
            handlingUnitId: data?.handlingUnitId,
            handlingUnitName: data?.handlingUnit_name,
            stockOwnerId: data?.stockOwnerId,
            stockOwnerName: data?.stockOwner_name,
            handlingUnitContentId: data?.id
        }
    };

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                model.isEditable &&
                /*data?.handlingUnit_status == configs.HANDLING_UNIT_STATUS_VALIDATED &&*/
                data?.handlingUnit_category == parameters.HANDLING_UNIT_CATEGORY_STOCK ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/edit/${id}`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                model.isSoftDeletable &&
                /*data?.handlingUnit_status == configs.HANDLING_UNIT_STATUS_VALIDATED &&*/
                data?.handlingUnit_category == parameters.HANDLING_UNIT_CATEGORY_STOCK ? (
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
                /*data?.handlingUnit_status == configs.HANDLING_UNIT_STATUS_VALIDATED &&*/
                data?.handlingUnit_category == parameters.HANDLING_UNIT_CATEGORY_STOCK ? (
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
                        setInfoToPrint({
                            handlingUnits: [{ barcode: data?.handlingUnit_barcode as string }]
                        });
                    }}
                    icon={<BarcodeOutlined />}
                />
                <NumberOfPrintsModalV2
                    showModal={{
                        showNumberOfPrintsModal,
                        setShowNumberOfPrintsModal
                    }}
                    dataToPrint={infoToPrint}
                    documentName="K_HandlingUnitLabel"
                />
            </Space>
        )
    };
    // #endregion

    return (
        <>
            <AppHead title={pageTitle} />
            <ItemDetailComponent
                extraDataComponent={
                    <HandlingUnitContentDetailsExtra
                        handlingUnitContentId={id}
                        handlingUnitName={data?.handlingUnit_name}
                        articleName={data?.article_name}
                        quantity={data?.quantity}
                        handlingUnit_category={data?.handlingUnit_category}
                        articleFeatureType={data?.article_featureType}
                        setRefetch={setRefetchContent}
                    />
                }
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                refetch={refetchContent}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                isCreateAMovement={true}
                dataToCreateMovement={dataToCreateMovement}
            />
        </>
    );
};

HandlingUnitContentPage.layout = MainLayout;

export default HandlingUnitContentPage;
