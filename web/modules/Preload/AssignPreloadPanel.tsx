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

// Bulk-assign a Load (preAssignedLoadId) to N entities of one type (delivery / order /
// purchaseOrder), from the Load's perspective. Reached from the Load detail page with
// "?loadId=". Candidate loads are constrained by direction (Pre-/Post-loading for outbound
// entities, Inbound for inbound ones), status < Dispatched, and the entity list is limited to
// records not yet assigned (+ same carrier when the entity carries one).

import { EyeTwoTone } from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import {
    findCodeByScopeAndValue,
    getLoadTypeCodesForDirection,
    getModesFromPermissions,
    pathParams,
    showError,
    showSuccess,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import type { LoadDirection } from '@helpers';
import { Button, Form, Modal, Space } from 'antd';
import { gql } from 'graphql-request';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { ModeEnum } from 'generated/graphql';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import AutoComplete from 'components/common/smart/Form/MainInputs/AutoCompleteInput';
import type { ModelType } from 'models/ModelsV2';
import { useRouter } from 'next/router';
import { FC, useEffect, useMemo, useState } from 'react';

export interface IAssignPreloadPanelProps {
    dataModel: ModelType;
    direction: LoadDirection;
    // advanced-filter field path to narrow entities to the load's carrier (undefined = no carrier)
    carrierFilterField?: string;
    bulkUpdate: { mutation: string; inputType: string };
    itemRoutes: any[];
    title: string;
    // extra advanced-filter groups to keep the entity list consistent with the direction
    // (e.g. only sales order types for an outbound load)
    extraEntityFilters?: any[];
}

const AssignPreloadPanel: FC<IAssignPreloadPanelProps> = ({
    dataModel,
    direction,
    carrierFilterField,
    bulkUpdate,
    itemRoutes,
    title,
    extraEntityFilters
}) => {
    const { permissions, configs } = useAppState();
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    // loadId is a single query param; normalize defensively (Next can type it as string[])
    const loadId = Array.isArray(router.query.loadId)
        ? router.query.loadId[0]
        : router.query.loadId;
    const modes = getModesFromPermissions(permissions, dataModel.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [form] = Form.useForm();

    const [selectedRowKeys, setSelectedRowKeys] = useState<any>([]);
    const [tableData, setTableData] = useState<any[]>([]);
    const [carrierFilter, setCarrierFilter] = useState<string | null>(null);
    const [isAssignLoading, setIsAssignLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [refetch, setRefetch] = useState(false);

    const loadStatusDispatched = useMemo(
        () => parseInt(findCodeByScopeAndValue(configs, 'load_status', 'Dispatched') ?? '0', 10),
        [configs]
    );

    // candidate loads: below Dispatched and of the right direction type
    const loadAdvancedFilters = useMemo(() => {
        const typeCodes = getLoadTypeCodesForDirection(direction, configs);
        const filters: any[] = [
            { filter: [{ searchType: 'INFERIOR', field: { status: loadStatusDispatched } }] }
        ];
        // fail-closed: if the direction's load types can't be resolved (missing/mis-labeled
        // load_type configs), filter on an impossible code so NO load is proposed rather than
        // every load, which could allow a wrong-direction pre-assignment.
        filters.push({
            filter: [
                { searchType: 'EQUAL', field: { type: typeCodes.length > 0 ? typeCodes : [-1] } }
            ]
        });
        return filters;
    }, [configs, direction, loadStatusDispatched]);

    // entity list: unassigned, and (when the entity carries a carrier) same carrier as the load
    const advancedFilters = useMemo(() => {
        const filters: any[] = [
            { filter: [{ searchType: 'EQUAL', field: { preAssignedLoadId: '**null**' } }] }
        ];
        if (carrierFilterField && carrierFilter) {
            filters.push({
                filter: [{ searchType: 'EQUAL', field: { [carrierFilterField]: carrierFilter } }]
            });
        }
        if (extraEntityFilters && extraEntityFilters.length > 0) {
            filters.push(...extraEntityFilters);
        }
        return filters;
    }, [carrierFilterField, carrierFilter, extraEntityFilters]);

    const resolveLoadCarrier = async (id: string | undefined) => {
        if (!carrierFilterField || !id) {
            setCarrierFilter(null);
            return;
        }
        try {
            const query = gql`
                query loadCarrier($filters: LoadSearchFilters) {
                    loads(filters: $filters, page: 1, itemsPerPage: 1) {
                        results {
                            id
                            carrierId
                        }
                    }
                }
            `;
            const res = await graphqlRequestClient.request(query, { filters: { id: [id] } });
            setCarrierFilter(res?.loads?.results?.[0]?.carrierId ?? null);
        } catch (e) {
            console.error('Error resolving load carrier:', e);
            setCarrierFilter(null);
        }
    };

    useEffect(() => {
        if (loadId && router.isReady) {
            form.setFieldsValue({ load: loadId });
            resolveLoadCarrier(loadId as string);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadId, router.isReady]);

    const onValuesChange = (changedValues: any) => {
        if ('load' in changedValues) {
            resolveLoadCarrier(changedValues.load);
            setSelectedRowKeys([]);
        }
    };

    // Cross-page selection via antd's preserveSelectedRowKeys: the keys array antd hands us
    // already carries the off-page selections, so we just mirror it.
    const onSelectChange = (newSelectedRowKeys: any) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };
    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        preserveSelectedRowKeys: true
    };
    const hasSelected = selectedRowKeys.length > 0;

    const handleAssign = async () => {
        const load = form.getFieldValue('load');
        if (!load) {
            showError(t('messages:please-select-one-element'));
            return;
        }
        if (!hasSelected) {
            showError(t('messages:please-select-at-least-one-element'));
            return;
        }
        setIsAssignLoading(true);
        try {
            const mutation = gql`
                mutation ${bulkUpdate.mutation}($ids: [String!]!, $input: ${bulkUpdate.inputType}!) {
                    ${bulkUpdate.mutation}(ids: $ids, input: $input)
                }
            `;
            await graphqlRequestClient.request(mutation, {
                ids: (selectedRowKeys as any[]).map((k) => String(k)),
                input: { preAssignedLoadId: load.toString() }
            });
            showSuccess(t('messages:success-assigned'));
        } catch (error) {
            console.error('Error assigning load:', error);
            showError(t('messages:error-assigning-data'));
        } finally {
            setIsAssignLoading(false);
            setShowConfirmModal(false);
            setSelectedRowKeys([]);
            setRefetch((prev) => !prev);
        }
    };

    const headerData: HeaderData = { title, routes: itemRoutes, actionsComponent: null };

    const autoCompleteInfos = {
        name: 'load',
        optionTable: { table: 'Load', fieldToDisplay: 'name' },
        initialValue: loadId ? loadId : undefined
    } as any;

    const actionButtons: ActionButtons = {
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginLeft: 16 }}>
                        <Form
                            form={form}
                            onValuesChange={onValuesChange}
                            style={{ width: '600px' }}
                        >
                            <AutoComplete
                                key={`loadSelector-${loadId || 'default'}`}
                                item={autoCompleteInfos}
                                advancedFilters={loadAdvancedFilters}
                                style={{ width: '400px' }}
                            />
                            <Button
                                type="primary"
                                onClick={() => setShowConfirmModal(true)}
                                disabled={!hasSelected || !form.getFieldValue('load')}
                                loading={isAssignLoading}
                            >
                                {t('actions:assign')}
                            </Button>
                            <span style={{ marginLeft: 16 }}>
                                {hasSelected
                                    ? `${t('messages:selected-items-number', {
                                          number: selectedRowKeys.length
                                      })}`
                                    : ''}
                            </span>
                        </Form>
                    </span>
                </div>
            ) : null
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <Modal
                title={t('actions:assign')}
                open={showConfirmModal}
                onCancel={() => setShowConfirmModal(false)}
                footer={[
                    <Button key="cancel" onClick={() => setShowConfirmModal(false)}>
                        {t('actions:cancel')}
                    </Button>,
                    <Button
                        key="confirm"
                        type="primary"
                        loading={isAssignLoading}
                        onClick={handleAssign}
                    >
                        {t('actions:confirm')}
                    </Button>
                ]}
            >
                {t('messages:selected-items-number', { number: selectedRowKeys.length })}
            </Modal>
            <ListComponent
                headerData={headerData}
                dataModel={dataModel}
                advancedFilters={advancedFilters}
                triggerDelete={undefined}
                triggerSoftDelete={undefined}
                setData={setTableData}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`${rootPath}/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={`${rootPath}/:id`}
                checkbox={carrierFilterField ? !!carrierFilter : !!form.getFieldValue('load')}
                actionButtons={actionButtons}
                rowSelection={rowSelection}
                refetch={refetch}
            />
        </>
    );
};

AssignPreloadPanel.displayName = 'AssignPreloadPanel';

export default AssignPreloadPanel;
