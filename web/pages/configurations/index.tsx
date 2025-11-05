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
import { DeleteOutlined, EditTwoTone, EyeTwoTone, LockTwoTone } from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import { getModesFromPermissions, pathParams } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { ConfigModelV2 as model } from 'models/ConfigModelV2';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState } from 'react';
import { configurationsRoutes as itemRoutes } from 'modules/Configurations/Static/configurationRoutes';
type PageComponent = FC & { layout: typeof MainLayout };

const ConfigurationPages: PageComponent = () => {
    const { permissions, configs } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const headerData: HeaderData = {
        title: t('common:configurations'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:configuration') })}
                    path={`${rootPath}/add`}
                    type="primary"
                />
            ) : null
    };

    const scopesList = Array.from(new Set(configs.map((config: any) => config.scope))).map(
        (scope) => ({ key: scope as string, text: scope as string })
    );

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
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                defaultSubOptions={[
                    {
                        scope: scopesList
                    }
                ]}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; system: boolean }) => (
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
                                model.isDeletable &&
                                record.system == false ? (
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

ConfigurationPages.layout = MainLayout;

export default ConfigurationPages;
