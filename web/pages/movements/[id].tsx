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
import { AppHead, LinkButton, ManageAssignmentModal } from '@components';
import { MovementModelV2 as model } from '@helpers';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useMemo, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { movementsRoutes as itemRoutes } from 'modules/Movements/Static/MovementRoutes';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';

type PageComponent = FC & { layout: typeof MainLayout };

const MovementPage: PageComponent = () => {
    const router = useRouter();
    const { permissions, configs, parameters } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { graphqlRequestClient } = useAuth();
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [refetch, setRefetch] = useState(false);
    const [showManageAssignmentModal, setShowManageAssignmentModal] = useState(false);
    const [assignmentManagementLoading, setAssignmentManagementLoading] = useState(false);

    const configsParamsCodes = useMemo(() => {
        const findCodeByScope = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };

        const toBeProcessedStatusCode = findCodeByScope(
            configs,
            'movement_status',
            'to be processed'
        );
        const processingInCourseStatusCode = findCodeByScope(
            configs,
            'movement_status',
            'processing in course'
        );
        const errorStatusCode = findCodeByScope(configs, 'movement_status', 'error');
        const closedStockOwnerStatusCode = findCodeByScope(configs, 'stock_owner_status', 'closed');

        return {
            toBeProcessedStatusCode,
            processingInCourseStatusCode,
            errorStatusCode,
            closedStockOwnerStatusCode
        };
    }, [configs, parameters]);

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.number}`
        }
    ];

    const pageTitle = `${t('common:movement')} ${data?.number}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const confirmAction = (id: string | undefined, setId: any) => {
        return () => {
            Modal.confirm({
                title: t('messages:action-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    const [isMovementConfirmLoading, setIsMovementConfirmLoading] = useState(false);
    const confirmMovement = (titleMessage: string) => {
        Modal.confirm({
            title: t(titleMessage),
            onOk: async () => {
                const input = {
                    status: parseInt(configsParamsCodes.processingInCourseStatusCode)
                };
                await updateMovements(input, setIsMovementConfirmLoading);
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent:
            data?.status !== configsParamsCodes.closedStockOwnerStatusCode ? (
                <Space>
                    {modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable ? (
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
                    data?.status === parseInt(configsParamsCodes.toBeProcessedStatusCode) ? (
                        <Button
                            onClick={() => confirmMovement('messages:validate-movement')}
                            type="primary"
                            loading={isMovementConfirmLoading}
                        >
                            {t('actions:validate-movement')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    data?.status >= parseInt(configsParamsCodes.toBeProcessedStatusCode) &&
                    data.status <= parseInt(configsParamsCodes.processingInCourseStatusCode) ? (
                        <Button
                            type="primary"
                            onClick={() => {
                                setShowManageAssignmentModal(true);
                            }}
                            loading={assignmentManagementLoading}
                        >
                            {!data?.assignedUser
                                ? t('actions:assign-user')
                                : t('actions:unassign-user')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Update) &&
                    data?.status === parseInt(configsParamsCodes.errorStatusCode) ? (
                        <Button
                            onClick={() => confirmMovement('messages:reprocess-error')}
                            type="primary"
                            loading={isMovementConfirmLoading}
                        >
                            {t('actions:reprocess-error')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 &&
                    modes.includes(ModeEnum.Delete) &&
                    model.isSoftDeletable &&
                    data?.status < parseInt(configsParamsCodes.processingInCourseStatusCode) ? (
                        <Button
                            onClick={() => confirmAction(id as string, setIdToDisable)()}
                            type="primary"
                        >
                            {t('actions:cancel')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isDeletable ? (
                        <Button onClick={() => confirmAction(id as string, setIdToDelete)()}>
                            {t('actions:delete')}
                        </Button>
                    ) : (
                        <></>
                    )}
                </Space>
            ) : (
                <></>
            )
    };
    // #endregion

    const updateMovements = async (input: any, setLoading: (loading: boolean) => void) => {
        setLoading(true);
        const mutation = gql`
            mutation updateMovements($input: UpdateMovementInput!, $ids: [String!]!) {
                updateMovements(input: $input, ids: $ids)
            }
        `;

        const variables = {
            ids: [data.id],
            input: input
        };

        try {
            const result = await graphqlRequestClient.request(mutation, variables);
            setLoading(false);
            showSuccess(t('messages:success-updated'));
            setRefetch((prev) => !prev);
        } catch (error) {
            showError(t('messages:error-update-data'));
            setLoading(false);
            console.log(error);
        }
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                refetch={refetch}
            />
            <ManageAssignmentModal
                showModal={{
                    showManageAssignmentModal,
                    setShowManageAssignmentModal
                }}
                updateFunction={updateMovements}
                loading={setAssignmentManagementLoading}
                userAssigned={data?.assignedUser}
                additionalInfoToUpdate={
                    data?.assignedUser
                        ? { status: parseInt(configsParamsCodes.toBeProcessedStatusCode) }
                        : undefined
                }
            />
        </>
    );
};

MovementPage.layout = MainLayout;

export default MovementPage;
