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
import { EditTwoTone, EyeTwoTone, InboxOutlined, PrinterOutlined } from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import {
    getModesFromPermissions,
    META_DEFAULTS,
    pathParams,
    showError,
    showSuccess
} from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import 'moment/min/locales';
import moment from 'moment';
import {
    ModeEnum,
    UpdateLoadMutation,
    UpdateLoadMutationVariables,
    useUpdateLoadMutation
} from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { FC, useState } from 'react';
import { LoadModelV2 as model } from 'models/LoadModelV2';
import { loadsRoutes as itemRoutes } from 'modules/Loads/Static/LoadsRoutes';
import configs from '../../../common/configs.json';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';

type PageComponent = FC & { layout: typeof MainLayout };

const LoadsPage: PageComponent = () => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = itemRoutes[itemRoutes.length - 1].path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);

    const headerData: HeaderData = {
        title: t('common:loads'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:load') })}
                    path={`${rootPath}/add`}
                    type="primary"
                />
            ) : null
    };

    const printLoad = async (loadId: string | Array<string>, status: any) => {
        const local = moment();
        local.locale();
        const dateLocal = local.format('l') + ', ' + local.format('LT');
        const res = await fetch(`/api/loads/print`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                loadId,
                dateLocal,
                status
            })
        });

        if (!res.ok) {
            showError(t('messages:error-print-data'));
        }
        const response = await res.json();
        if (response.url) {
            window.open(response.url, '_blank');
        } else {
            showError(t('messages:error-print-data'));
        }
    };
    // DISPATCH LOAD
    const { mutate: updateLoadMutate, isLoading: dispatch } = useUpdateLoadMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateLoadMutation,
                _variables: UpdateLoadMutationVariables,
                _context: any
            ) => {
                if (!dispatch) {
                    showSuccess(t('messages:success-dispatched'));
                    if (data?.updateLoad?.id && data?.updateLoad?.status) {
                        printLoad(data.updateLoad.id, data.updateLoad.status);
                    }
                    setTriggerRefresh(!triggerRefresh);
                }
            },
            onError: () => {
                showError(t('messages:error-dispatching-data'));
            }
        }
    );

    const dispatchLoad = ({ id, input }: UpdateLoadMutationVariables) => {
        Modal.confirm({
            title: t('messages:dispatch-load-confirm'),
            onOk: () => {
                updateLoadMutate({
                    id: id,
                    input: input
                });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                refetch={triggerRefresh}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            status: number;
                            numberHuLoaded: number;
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
                                model.isEditable &&
                                record.status !== configs.LOAD_STATUS_DISPATCHED ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable &&
                                record?.status !== configs.LOAD_STATUS_DISPATCHED &&
                                record?.numberHuLoaded > 0 ? (
                                    <Button
                                        loading={dispatch}
                                        icon={<InboxOutlined />}
                                        onClick={() =>
                                            dispatchLoad({
                                                id: record.id,
                                                input: { status: configs.LOAD_STATUS_DISPATCHED }
                                            })
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                                    <Button
                                        icon={<PrinterOutlined />}
                                        onClick={() => printLoad(record.id, record.status)}
                                    />
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

LoadsPage.layout = MainLayout;

export default LoadsPage;
