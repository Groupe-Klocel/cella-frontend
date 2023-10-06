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
    StopOutlined,
    CaretRightOutlined
} from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import { getModesFromPermissions, META_DEFAULTS, pathParams } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { CycleCountModelV2 as model } from 'models/CycleCountModelV2';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';
import { cycleCountsRoutes as itemRoutes } from 'modules/CycleCounts/Static/cycleCountsRoutes';
import configs from '../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

const CycleCountPages: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = itemRoutes[itemRoutes.length - 1].path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [idToStart, setIdToStart] = useState<string | undefined>();

    const headerData: HeaderData = {
        title: t('common:cycle-counts'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:cycle-count') })}
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
    const confirmStart = (id: string | undefined, setId: any, action: 'start') => {
        return () => {
            Modal.confirm({
                title: t('messages:start-cycle-count'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    // useEffect(() => {
    //     if (props.triggerDelete && props.triggerDelete.idToDelete) {
    //         callDelete(props.triggerDelete.idToDelete);
    //         props.triggerDelete.setIdToDelete(undefined);
    //     }
    // }, [props.triggerDelete]);

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
                        render: (record: { id: string; status: number; model: number }) => (
                            <Space>
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Read) &&
                                record.status == configs.CYCLE_COUNT_STATUS_CREATED &&
                                record.model == configs.CYCLE_COUNT_MODEL_RECOMMENDED ? (
                                    <Button
                                        icon={<CaretRightOutlined />}
                                        onClick={() =>
                                            confirmStart(record.id, setIdToStart, 'start')()
                                        }
                                    />
                                ) : (
                                    <></>
                                )}
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
                                // For this version, we can only cancel a CC if it is not started
                                // record.status > configs.CYCLE_COUNT_STATUS_CALCULATED &&
                                // record.status < configs.CYCLE_COUNT_STATUS_VALIDATED
                                record.status < configs.CYCLE_COUNT_STATUS_PASS_1_IN_PROGRESS ? (
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
                                model.isDeletable &&
                                record.status <= configs.CYCLE_COUNT_STATUS_CALCULATED ? (
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
        </>
    );
};

CycleCountPages.layout = MainLayout;

export default CycleCountPages;
