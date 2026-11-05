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
import { AppHead, LinkButton, NumberOfPrintsModal, NumberOfPrintsModalV2 } from '@components';
import { getModesFromPermissions, META_DEFAULTS, pathParams } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { LocationModelV2 as model } from '@helpers';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, Key, useState } from 'react';
import { locationsRoutes as itemRoutes } from 'modules/Locations/Static/locationsRoutes';
import { PrintLocationsModalForm } from 'modules/Locations/Forms/PrintLocationsModalForm';
import { EditLocationsRenderModal } from 'modules/Locations/Forms/EditLocationsModal';
type PageComponent = FC & { layout: typeof MainLayout };

const LocationPages: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToPrint, setIdToPrint] = useState<string>();
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [showRangeLocationsModal, setShowRangeLocationsModal] = useState(false);
    const [referenceToPrint, setReferenceToPrint] = useState<string>();
    // SPE: row selection + mass update of the selected locations (EditLocationsModal)
    const [tableData, setTableData] = useState<any[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [refetch, setRefetch] = useState<boolean>(false);

    const headerData: HeaderData = {
        title: t('common:locations'),
        routes: itemRoutes,
        actionsComponent: (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                    <LinkButton
                        title={t('actions:add-location')}
                        path={`${rootPath}/add`}
                        type="primary"
                    />
                ) : null}
                {modes.length > 0 && modes.includes(ModeEnum.Delete) ? (
                    <LinkButton
                        title={t('actions:delete-location')}
                        path={`${rootPath}/delete`}
                        type="primary"
                    />
                ) : null}
                <Button
                    type="primary"
                    ghost
                    onClick={() => {
                        setShowRangeLocationsModal(true);
                    }}
                >
                    {t('actions:print-labels')}
                </Button>
            </Space>
        )
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

    // SPE: mass update. Selection is accumulated across server-paginated pages: keys of the
    // pages the user has left are kept, only the keys belonging to the page currently displayed
    // can be unselected (same mechanism as the articles and packagings lists).
    const canMassUpdate = modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable;
    const hasSelected = selectedRowKeys.length > 0;

    const onSelectChange = (newSelectedRowKeys: any[]) => {
        selectedRowKeys.forEach((key: string) => {
            if (!newSelectedRowKeys.includes(key) && tableData.map((d) => d.id).includes(key)) {
                setSelectedRowKeys((prevKeys: Key[]) => prevKeys.filter((k) => k !== key));
            }
        });
        newSelectedRowKeys.forEach((value: string) => {
            if (!selectedRowKeys?.includes(value)) {
                setSelectedRowKeys((prevKeys: Key[]) => [...prevKeys, value]);
            }
        });
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange
    };

    const actionButtons: ActionButtons = {
        actionsComponent: canMassUpdate ? (
            <>
                <span className="selected-span" style={{ marginLeft: 16 }}>
                    {hasSelected
                        ? `${t('messages:selected-items-number', {
                              number: selectedRowKeys.length
                          })}`
                        : ''}
                </span>
                <span style={{ marginLeft: 16 }}>
                    <Button
                        type="primary"
                        onClick={() => {
                            setShowEditModal(true);
                        }}
                        disabled={!hasSelected}
                    >
                        {t('actions:edit')}
                    </Button>
                </span>
                <EditLocationsRenderModal
                    visible={showEditModal}
                    rows={rowSelection}
                    showhideModal={() => {
                        setShowEditModal(!showEditModal);
                    }}
                    setRefetch={() => {
                        setRefetch(!refetch);
                    }}
                    setSelectedRowKeys={setSelectedRowKeys}
                />
            </>
        ) : null
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                actionButtons={actionButtons}
                rowSelection={rowSelection}
                refetch={refetch}
                setData={setTableData}
                checkbox={canMassUpdate}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; name: string }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <>
                                        <LinkButton
                                            icon={<EyeTwoTone />}
                                            path={pathParams(`${rootPath}/[id]`, record.id)}
                                        />
                                    </>
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                <Button
                                    type="primary"
                                    ghost
                                    onClick={() => {
                                        setShowNumberOfPrintsModal(true);
                                        setIdToPrint(record.id);
                                        setReferenceToPrint(record.name);
                                    }}
                                    icon={<BarcodeOutlined />}
                                />
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isSoftDeletable ? (
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
                documentName="K_LocationLabel"
                documentReference={referenceToPrint}
            />
            {showRangeLocationsModal ? (
                <PrintLocationsModalForm
                    showModal={{
                        showRangeLocationsModal,
                        setShowRangeLocationsModal
                    }}
                />
            ) : (
                <></>
            )}
        </>
    );
};

LocationPages.layout = MainLayout;

export default LocationPages;
