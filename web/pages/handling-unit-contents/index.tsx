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
    BarcodeOutlined,
    DeleteOutlined,
    EditTwoTone,
    EyeTwoTone,
    LockTwoTone
} from '@ant-design/icons';
import { AppHead, LinkButton, NumberOfPrintsModalV2 } from '@components';
import { getModesFromPermissions, META_DEFAULTS, pathParams } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { handlingUnitContentsSubRoutes as itemRoutes } from 'modules/HandlingUnits/Static/handlingUnitContentsRoutes';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import { HandlingUnitContentModelV2 as model } from '@helpers';
import parameters from '../../../common/parameters.json';
import configs from '../../../common/configs.json';
import { EditHandlingUnitContentsRenderModal } from 'modules/HandlingUnitContents/Forms/EditHandlingUnitContentsModal';

type PageComponent = FC & { layout: typeof MainLayout };

const HandlingUnitContentsPage: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);
    const [infoToPrint, setInfoToPrint] = useState<any>();
    const [dataToCreateMovement, setDataToCreateMovement] = useState<any>();
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [refetch, setRefetch] = useState<boolean>(false);
    const toggleRefetch = () => setRefetch((prev) => !prev);

    const headerData: HeaderData = {
        title: t('common:handlingUnitContents'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', {
                        name: t('common:handlingUnitContent')
                    })}
                    path="/handling-unit-contents/add"
                    type="primary"
                />
            ) : null
    };

    const hasSelected = selectedRows.length > 0;

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };
    const rowSelection = {
        selectedRowKeys: selectedRows.map((r) => r.id),
        onChange: (newSelectedRowKeys: any, newSelectedRows: any) => {
            setSelectedRows(newSelectedRows);
        },
        getCheckboxProps: (record: any) => ({
            disabled: record.status == configs.ARTICLE_STATUS_CLOSED
        })
    };

    const actionButtons: ActionButtons = {
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                <>
                    <>
                        <span className="selected-span" style={{ marginLeft: 16 }}>
                            {hasSelected
                                ? `${t('messages:selected-items-number', {
                                      number: selectedRows.length
                                  })}`
                                : ''}
                        </span>
                        <span style={{ marginLeft: 16 }}>
                            <Button
                                type="primary"
                                onClick={() => {
                                    setShowModal(true);
                                }}
                                disabled={!hasSelected}
                                loading={loading}
                            >
                                {t('actions:edit')}
                            </Button>
                        </span>
                        <EditHandlingUnitContentsRenderModal
                            visible={showModal}
                            rows={selectedRows}
                            setRefetch={toggleRefetch}
                            refetch={refetch}
                            showhideModal={() => {
                                setShowModal(!showModal);
                            }}
                        />
                    </>
                </>
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

    useEffect(() => {
        setSelectedRows([]);
        setSelectedRowKeys([]);
    }, [refetch]);

    return (
        <>
            <AppHead title={headerData.title} />
            <ListComponent
                headerData={headerData}
                refetch={refetch}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                isCreateAMovement={true}
                actionButtons={actionButtons}
                rowSelection={rowSelection}
                checkbox={true}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            handlingUnitId: string;
                            handlingUnit_name: string;
                            articleId: string;
                            article_name: string;
                            stockStatus: number;
                            quantity: number;
                            handlingUnit_locationId: string;
                            handlingUnit_location_name: string;
                            stockOwnerId: string;
                            stockOwner_name: string;
                            handlingUnit_barcode: string;
                            handlingUnit_category: number;
                            handlingUnit_status: number;
                        }) => (
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
                                model.isEditable /*&&
                                record.handlingUnit_status ==
                                configs.HANDLING_UNIT_STATUS_VALIDATED*/ &&
                                record.handlingUnit_category ==
                                    parameters.HANDLING_UNIT_CATEGORY_STOCK ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isSoftDeletable /*&&
                                record.handlingUnit_status ==
                                    configs.HANDLING_UNIT_STATUS_VALIDATED*/ &&
                                record.handlingUnit_category ==
                                    parameters.HANDLING_UNIT_CATEGORY_STOCK ? (
                                    <Button
                                        icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDisable, 'disable')()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isDeletable /*&&
                                record.handlingUnit_status ==
                                    configs.HANDLING_UNIT_STATUS_VALIDATED*/ &&
                                record.handlingUnit_category ==
                                    parameters.HANDLING_UNIT_CATEGORY_STOCK ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() => {
                                            confirmAction(record.id, setIdToDelete, 'delete')();
                                            setDataToCreateMovement({
                                                content: {
                                                    articleId: record.articleId,
                                                    articleName: record.article_name,
                                                    stockStatus: record.stockStatus,
                                                    quantity: record.quantity,
                                                    locationId: record.handlingUnit_locationId,
                                                    locationName: record.handlingUnit_location_name,
                                                    handlingUnitId: record.handlingUnitId,
                                                    handlingUnitName: record.handlingUnit_name,
                                                    stockOwnerId: record.stockOwnerId,
                                                    stockOwnerName: record.stockOwner_name,
                                                    handlingUnitContentId: record.id
                                                }
                                            });
                                        }}
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                <Button
                                    type="primary"
                                    ghost
                                    onClick={() => {
                                        setShowNumberOfPrintsModal(true);
                                        setInfoToPrint({
                                            handlingUnits: [
                                                { barcode: record.handlingUnit_barcode as string }
                                            ]
                                        });
                                    }}
                                    icon={<BarcodeOutlined />}
                                />
                            </Space>
                        )
                    }
                ]}
                dataToCreateMovement={dataToCreateMovement}
                routeDetailPage={'/handling-unit-contents/:id'}
            />
            <NumberOfPrintsModalV2
                showModal={{
                    showNumberOfPrintsModal,
                    setShowNumberOfPrintsModal
                }}
                dataToPrint={infoToPrint}
                documentName="K_HandlingUnitLabel"
            />
        </>
    );
};

HandlingUnitContentsPage.layout = MainLayout;

export default HandlingUnitContentsPage;
