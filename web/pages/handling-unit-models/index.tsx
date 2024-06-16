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
    EyeTwoTone,
    EditTwoTone,
    LockTwoTone,
    UnlockTwoTone
} from '@ant-design/icons';
import { AppHead, LinkButton, NumberOfPrintsModal, NumberOfPrintsModalV2 } from '@components';
import { getModesFromPermissions, META_DEFAULTS, pathParams } from '@helpers';
import { Button, Space, Modal } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { HandlingUnitModelModelV2 as model } from 'models/HandlingUnitModelModelV2';
import { handlingUnitModelsRoutes as itemRoutes } from 'modules/HandlingUnitModels/Static/handlingUnitModelsRoutes';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { FC, useState } from 'react';
import configs from '../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

const HandlingUnitModelsPage: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [reopenInfo, setReopenInfo] = useState<string | undefined>();
    const rootPath = itemRoutes[itemRoutes.length - 1].path;

    const headerData: HeaderData = {
        title: t('common:handling-unit-models'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:handling-unit-model') })}
                    path="/handling-unit-models/add"
                    type="primary"
                />
            ) : null
    };

    const confirmAction = (
        info: any | undefined,
        setInfo: any,
        action: 'delete' | 'disable' | 'enable'
    ) => {
        return () => {
            const titre =
                action == 'enable'
                    ? 'messages:enable-confirm'
                    : action == 'delete'
                    ? 'messages:delete-confirm'
                    : 'messages:disable-confirm';
            Modal.confirm({
                title: t(titre),
                onOk: () => {
                    setInfo(info);
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
                triggerReopen={{ reopenInfo, setReopenInfo }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; status: number }) => (
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
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isSoftDeletable &&
                                record.status !== configs.HANDLING_UNIT_MODEL_STATUS_CLOSED ? (
                                    <Button
                                        icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDisable, 'disable')()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {record.status == configs.HANDLING_UNIT_MODEL_STATUS_CLOSED ? (
                                    <Button
                                        icon={<UnlockTwoTone twoToneColor="#b3cad6" />}
                                        onClick={() =>
                                            confirmAction(
                                                {
                                                    id: record.id,
                                                    status: configs.HANDLING_UNIT_MODEL_STATUS_IN_PROGRESS
                                                },
                                                setReopenInfo,
                                                'enable'
                                            )()
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
                                        setIdToPrint(record.id);
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
                documentName="K_HandlingUnitModelLabel"
            />
        </>
    );
};

HandlingUnitModelsPage.layout = MainLayout;

export default HandlingUnitModelsPage;
