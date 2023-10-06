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
import { DeleteOutlined, EditTwoTone, EyeTwoTone, StopOutlined } from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import { getModesFromPermissions, META_DEFAULTS, pathParams } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum, useGetConfigScopesQuery } from 'generated/graphql';
import { ConfigModelV2 as model } from 'models/ConfigModelV2';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';
import { configurationsRoutes as itemRoutes } from 'modules/Configurations/Static/configurationRoutes';
import { FormDataType } from 'models/ModelsV2';
import { useAuth } from 'context/AuthContext';
type PageComponent = FC & { layout: typeof MainLayout };

const ConfigurationPages: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const { graphqlRequestClient } = useAuth();

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

    // specific to configs view
    const listScopeConfig = useGetConfigScopesQuery(graphqlRequestClient);
    const [scopesList, setScopesList] = useState<any>();

    useEffect(() => {
        if (listScopeConfig) {
            const newParameter: Array<any> = [];

            const cData = listScopeConfig?.data?.configScopes;
            if (cData) {
                cData.forEach((item) => {
                    newParameter.push({ key: item.scope, text: item.scope });
                });
                setScopesList(newParameter);
            }
        }
    }, [listScopeConfig.data]);

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
                filterFields={[
                    {
                        name: 'scope',
                        type: FormDataType.Dropdown,
                        subOptions: scopesList
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
                                model.isEditable &&
                                record.system == false ? (
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
