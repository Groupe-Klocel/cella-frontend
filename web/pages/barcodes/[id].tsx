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
import { BarcodeOutlined } from '@ant-design/icons';
import { AppHead, LinkButton, NumberOfPrintsModalV2 } from '@components';
import { META_DEFAULTS, getModesFromPermissions, pathParamsFromDictionary } from '@helpers';
import { BarcodeModelV2 as model } from 'models/BarcodeModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { barcodesRoutes as itemRoutes } from 'modules/Barcodes/Static/barcodesRoutes';
import { useRouter } from 'next/router';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';

type PageComponent = FC & { layout: typeof MainLayout };

const BarcodePage: PageComponent = () => {
    const router = useRouter();
    const { id } = router.query;
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:barcode')} ${data?.name}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = itemRoutes[itemRoutes.length - 1].path;

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
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={pathParamsFromDictionary(`${rootPath}/edit/[id]`, {
                            id: id,
                            articleLuBarcodeId: data?.articleLuBarcodes_id
                        })}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
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
                <Button
                    type="primary"
                    ghost
                    onClick={() => {
                        setShowNumberOfPrintsModal(true);
                        setIdToPrint(data?.articleLuBarcodes_id as string);
                    }}
                    icon={<BarcodeOutlined />}
                />
                <NumberOfPrintsModalV2
                    showModal={{
                        showNumberOfPrintsModal,
                        setShowNumberOfPrintsModal
                    }}
                    dataToPrint={{ id: idToPrint }}
                    documentName="K_BarcodeLabel"
                />
            </Space>
        )
    };
    // #endregion

    return (
        <>
            <>
                <AppHead title={META_DEFAULTS.title} />
                <ItemDetailComponent
                    headerData={headerData}
                    id={id!}
                    dataModel={model}
                    setData={setData}
                    triggerDelete={{ idToDelete, setIdToDelete }}
                    triggerSoftDelete={{ idToDisable, setIdToDisable }}
                />
            </>
        </>
    );
};

BarcodePage.layout = MainLayout;

export default BarcodePage;
