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
import { DeleteOutlined, EditTwoTone, EyeTwoTone } from '@ant-design/icons';
import { LinkButton } from '@components';
import {
    getModesFromPermissions,
    pathParams,
    pathParamsFromDictionary,
    showError,
    showSuccess,
    useDelete
} from '@helpers';
import { Button, Divider, Modal, Space } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { CustomPermissionLineModelV2 } from '@helpers';
import { WarehouseWorkerCustomPermissionModelV2 } from '@helpers';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export interface IItemDetailsProps {
    customPermissionId?: string | any;
    customPermissionName?: string | any;
}

const CustomPermissionDetailsExtra = ({
    customPermissionId,
    customPermissionName
}: IItemDetailsProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { permissions } = useAppState();
    const lineModes = getModesFromPermissions(permissions, CustomPermissionLineModelV2.tableName);
    const assignmentModes = getModesFromPermissions(
        permissions,
        WarehouseWorkerCustomPermissionModelV2.tableName
    );
    const [idToDeleteLine, setIdToDeleteLine] = useState<string | undefined>();
    const [idToDisableLine, setIdToDisableLine] = useState<string | undefined>();
    const [idToDeleteAssignment, setIdToDeleteAssignment] = useState<string | undefined>();
    const [idToDisableAssignment, setIdToDisableAssignment] = useState<string | undefined>();

    const customPermissionLineData: HeaderData = {
        title: t('common:custom-permission-lines'),
        routes: [],
        actionsComponent:
            lineModes.length > 0 && lineModes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:custom-permission-line') })}
                    path={pathParamsFromDictionary('/custom-permissions/line/add', {
                        customPermissionId,
                        customPermissionName
                    })}
                    type="primary"
                />
            ) : null
    };

    const warehouseWorkerCustomPermissionData: HeaderData = {
        title: t('common:warehouse-worker-custom-permissions'),
        routes: [],
        actionsComponent: null
    };

    // Delete
    const {
        isLoading: deleteLineLoading,
        result: deleteLineResult,
        mutate: deleteLine
    } = useDelete(CustomPermissionLineModelV2.endpoints.delete);

    useEffect(() => {
        if (!(deleteLineResult && deleteLineResult.data)) return;

        if (deleteLineResult.success) {
            showSuccess(t('messages:success-deleted'));
            router.reload();
        } else {
            showError(t('messages:error-deleting-data'));
        }
    }, [deleteLineResult]);

    const {
        isLoading: deleteAssignmentLoading,
        result: deleteAssignmentResult,
        mutate: deleteAssignment
    } = useDelete(WarehouseWorkerCustomPermissionModelV2.endpoints.delete);

    useEffect(() => {
        if (!(deleteAssignmentResult && deleteAssignmentResult.data)) return;

        if (deleteAssignmentResult.success) {
            showSuccess(t('messages:success-deleted'));
            router.reload();
        } else {
            showError(t('messages:error-deleting-data'));
        }
    }, [deleteAssignmentResult]);

    return (
        <>
            <Divider />
            <ListComponent
                searchCriteria={{ customPermissionId: customPermissionId }}
                dataModel={CustomPermissionLineModelV2}
                headerData={customPermissionLineData}
                triggerDelete={{
                    idToDelete: idToDeleteLine,
                    setIdToDelete: setIdToDeleteLine
                }}
                triggerSoftDelete={{
                    idToDisable: idToDisableLine,
                    setIdToDisable: setIdToDisableLine
                }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
                            <Space>
                                {lineModes.length > 0 && lineModes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(
                                            '/custom-permissions/line/[id]',
                                            record.id
                                        )}
                                    />
                                ) : (
                                    <></>
                                )}
                                {lineModes.length > 0 &&
                                lineModes.includes(ModeEnum.Update) &&
                                CustomPermissionLineModelV2.isEditable ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(
                                            '/custom-permissions/line/edit/[id]',
                                            record.id
                                        )}
                                    />
                                ) : (
                                    <></>
                                )}
                                {lineModes.length > 0 &&
                                lineModes.includes(ModeEnum.Delete) &&
                                CustomPermissionLineModelV2.isDeletable ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        onClick={() =>
                                            Modal.confirm({
                                                title: t('messages:delete-confirm'),
                                                onOk: () => {
                                                    deleteLine(record.id);
                                                },
                                                okText: t('messages:confirm'),
                                                cancelText: t('messages:cancel')
                                            })
                                        }
                                        danger
                                    />
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                searchable={false}
            />
            <ListComponent
                searchCriteria={{ customPermissionId: customPermissionId }}
                dataModel={WarehouseWorkerCustomPermissionModelV2}
                headerData={warehouseWorkerCustomPermissionData}
                triggerDelete={{
                    idToDelete: idToDeleteAssignment,
                    setIdToDelete: setIdToDeleteAssignment
                }}
                triggerSoftDelete={{
                    idToDisable: idToDisableAssignment,
                    setIdToDisable: setIdToDisableAssignment
                }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
                            <Space>
                                {assignmentModes.length > 0 &&
                                assignmentModes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(
                                            '/warehouse-workers/custom-permissions/[id]',
                                            record.id
                                        )}
                                    />
                                ) : (
                                    <></>
                                )}
                                {assignmentModes.length > 0 &&
                                assignmentModes.includes(ModeEnum.Delete) &&
                                WarehouseWorkerCustomPermissionModelV2.isDeletable ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        onClick={() =>
                                            Modal.confirm({
                                                title: t('messages:delete-confirm'),
                                                onOk: () => {
                                                    deleteAssignment(record.id);
                                                },
                                                okText: t('messages:confirm'),
                                                cancelText: t('messages:cancel')
                                            })
                                        }
                                        danger
                                    />
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                searchable={false}
            />
        </>
    );
};

export { CustomPermissionDetailsExtra };
