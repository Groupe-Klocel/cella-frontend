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
import {
    DeleteOutlined,
    EditTwoTone,
    EyeTwoTone,
    LockTwoTone,
    BarcodeOutlined
} from '@ant-design/icons';
import { AppHead, LinkButton, NumberOfPrintsModalV2, NumberOfPrintsModal } from '@components';
import {
    getModesFromPermissions,
    META_DEFAULTS,
    pathParams,
    pathParamsFromDictionary
} from '@helpers';
import { Space, Button, Modal } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { BarcodeModelV2 as model } from 'models/BarcodeModelV2';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { barcodesRoutes as itemRoutes } from 'modules/Barcodes/Static/barcodesRoutes';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState } from 'react';
import configs from '../../../common/configs.json';
type PageComponent = FC & { layout: typeof MainLayout };

const BarcodePage: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = itemRoutes[itemRoutes.length - 1].path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();
    const [data, setData] = useState<any>();

    const headerData: HeaderData = {
        title: t('common:barcodes'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:barcode') })}
                    path={`${rootPath}/add`}
                    type="primary"
                />
            ) : null
    };

    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
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

    return (
        <>
            <AppHead title={headerData.title} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; articleLuBarcodes_id: String }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`${rootPath}/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParamsFromDictionary(`${rootPath}/edit/[id]`, {
                                            id: record.id,
                                            articleLuBarcodeId: record?.articleLuBarcodes_id
                                        })}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isDeletable ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDelete, 'delete')()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                <Button
                                    type="primary"
                                    ghost
                                    onClick={() => {
                                        setShowNumberOfPrintsModal(true);
                                        setIdToPrint(record.articleLuBarcodes_id as string);
                                    }}
                                    icon={<BarcodeOutlined />}
                                />
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={`${rootPath}/:id`}
            />
            <NumberOfPrintsModalV2
                showModal={{
                    showNumberOfPrintsModal,
                    setShowNumberOfPrintsModal
                }}
                dataToPrint={{ id: idToPrint }}
                documentName="K_BarcodeLabel"
            />
        </>
    );
};

BarcodePage.layout = MainLayout;

export default BarcodePage;
