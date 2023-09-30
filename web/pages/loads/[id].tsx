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
import { AppHead, LinkButton } from '@components';
import { META_DEFAULTS, getModesFromPermissions, showError, showSuccess } from '@helpers';
import { LoadDetailsExtra } from 'modules/Loads/Elements/LoadDetailsExtra';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import useTranslation from 'next-translate/useTranslation';
import { LoadModelV2 as model } from 'models/LoadModelV2';
import { loadsRoutes as itemRoutes } from 'modules/Loads/Static/LoadsRoutes';
import { Button, Modal, Space } from 'antd';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import {
    ModeEnum,
    UpdateLoadMutation,
    UpdateLoadMutationVariables,
    useUpdateLoadMutation
} from 'generated/graphql';
import configs from '../../../common/configs.json';
import { useAuth } from 'context/AuthContext';
import 'moment/min/locales';
import moment from 'moment';

type PageComponent = FC & { layout: typeof MainLayout };

const LoadsPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const { id } = router.query;
    const { graphqlRequestClient } = useAuth();
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:load')} ${data?.name}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = itemRoutes[itemRoutes.length - 1].path;

    const chooseAction = async (loadId: string | undefined, action: 'print' | 'label') => {
        const local = moment();
        local.locale();
        const dateLocal = local.format('l') + ', ' + local.format('LT');

        if (action == 'print') {
            const res = await fetch(`/api/loads/print`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    loadId,
                    dateLocal,
                    status: data?.status
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
        } else {
            const res = await fetch(`/api/loads/print/label`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    loadId
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
        }
    };

    const printLoad = async (loadId: string | Array<string>) => {
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
                status: data?.status
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
            onSuccess: async (
                data: UpdateLoadMutation,
                _variables: UpdateLoadMutationVariables,
                _context: any
            ) => {
                if (!dispatch) {
                    showSuccess(t('messages:success-dispatched'));
                    if (data?.updateLoad?.id) {
                        printLoad(data.updateLoad.id);
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

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                data?.status != configs.LOAD_STATUS_DISPATCHED &&
                model.isEditable ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/edit/${id}`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                data?.status !== configs.LOAD_STATUS_DISPATCHED &&
                model.isEditable ? (
                    <Button
                        loading={dispatch}
                        onClick={() =>
                            dispatchLoad({
                                id: data.id,
                                input: { status: configs.LOAD_STATUS_DISPATCHED }
                            })
                        }
                    >
                        {t('actions:dispatch')}
                    </Button>
                ) : (
                    <></>
                )}
                {/* Print List of boxes and code bar of load */}
                {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                    <Button onClick={() => chooseAction(data.id, 'print')}>
                        {t('actions:print')}
                    </Button>
                ) : (
                    <></>
                )}
                {/* Print just code bar of load */}
                {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                    <Button onClick={() => chooseAction(data.id, 'label')}>
                        {t('actions:load-label')}
                    </Button>
                ) : (
                    <></>
                )}
            </Space>
        )
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                extraDataComponent={<LoadDetailsExtra loadId={id!} />}
                headerData={headerData}
                id={id!}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                refetch={triggerRefresh}
            />
        </>
    );
};

LoadsPage.layout = MainLayout;

export default LoadsPage;
