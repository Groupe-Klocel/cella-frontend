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
    StopOutlined
} from '@ant-design/icons';
import { AppHead, LinkButton, NumberOfPrintsModal } from '@components';
import { getModesFromPermissions, META_DEFAULTS, pathParams } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { LocationModelV2 as model } from 'models/LocationModelV2';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { FC, useState } from 'react';
import { locationsRoutes as itemRoutes } from 'modules/Locations/Static/locationsRoutes';
import { PrintLocationsModalForm } from 'modules/Locations/Forms/PrintLocationsModalForm';
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

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
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
                                    }}
                                    icon={<BarcodeOutlined />}
                                />
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isSoftDeletable ? (
                                    <Button
                                        icon={<StopOutlined />}
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
            <NumberOfPrintsModal
                showModal={{
                    showNumberOfPrintsModal,
                    setShowNumberOfPrintsModal
                }}
                id={idToPrint}
                path="/api/locations/print/label"
            />
            {showRangeLocationsModal ? (
                <PrintLocationsModalForm
                    showModal={{
                        showRangeLocationsModal,
                        setShowRangeLocationsModal
                    }}
                    id={'a'}
                />
            ) : (
                <></>
            )}
        </>
    );
};

LocationPages.layout = MainLayout;

export default LocationPages;
