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
import { ContentSpin, HeaderContent, LinkButton } from '@components';
import { Button, Descriptions, Divider, Modal, Select, Space, Spin, Tag } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import {
    getModesFromPermissions,
    pathParamsFromDictionary,
    showError,
    showSuccess
} from '@helpers';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import {
    ModeEnum,
    Table,
    useSimpleGetAllCarriersQuery,
    SimpleGetAllCarriersQuery
} from 'generated/graphql';
import { locationsRoutes } from 'modules/Locations/Static/locationsRoutes';
import { gql } from 'graphql-request';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

// Days of the week
const WEEK_DAYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
] as const;

export interface ILocationExtrasListProps {
    locationId: string;
    locationName?: string;
}

const LocationExtrasListComponent = ({ locationId, locationName }: ILocationExtrasListProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const { permissions, configs, parameters } = useAppState();
    const configsParamsLanguage = (router.locale || 'en').split('-')[0];
    const modes = getModesFromPermissions(permissions, Table.Location);
    const rootPath = (locationsRoutes[locationsRoutes.length - 1] as { path: string }).path;

    const configsParams = useMemo(() => {
        const findCodeByScopeAndValue = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };
        const findByScope = (items: any[], scope: string) => {
            return items.filter((item: any) => item.scope === scope);
        };
        const locationCategoryDockCode = findCodeByScopeAndValue(
            configs ?? [],
            'location_category',
            'Dock'
        );
        const dockType = findByScope(parameters ?? [], 'dock_type');
        const truckType = findByScope(parameters ?? [], 'truck_type');
        return {
            locationCategoryDockCode,
            dockType,
            truckType
        };
    }, [configs, parameters]);

    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [dockType, setDockType] = useState<string | undefined>();
    const [authorizedCarriers, setAuthorizedCarriers] = useState<string | undefined>();
    const [operatingSchedules, setOperatingSchedules] = useState<any | undefined>();
    const [authorizedTruckTypes, setAuthorizedTruckTypes] = useState<string | undefined>();

    useEffect(() => {
        if (!locationId) return;
        setLoading(true);
        setDockType(undefined);
        setAuthorizedCarriers(undefined);
        setOperatingSchedules(undefined);
        setAuthorizedTruckTypes(undefined);
        const query = gql`
            query GetLocationExtras($id: String!) {
                location(id: $id) {
                    id
                    extras
                }
            }
        `;
        graphqlRequestClient
            .request(query, { id: locationId })
            .then((data: any) => {
                const extras = data?.location?.extras ?? {};
                setDockType(extras['dock_type']);
                setAuthorizedCarriers(extras['authorized_carriers']);
                try {
                    const raw = extras['operating_schedules'];
                    if (raw) setOperatingSchedules(typeof raw === 'string' ? JSON.parse(raw) : raw);
                } catch {
                    setOperatingSchedules(undefined);
                }
                setAuthorizedTruckTypes(extras['authorized_truck_types']);
            })
            .catch(() => showError(t('messages:error-getting-data')))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationId, router.asPath, refreshKey]);

    // --- Copy config modal ---
    const [copyModalVisible, setCopyModalVisible] = useState(false);
    const [copySourceId, setCopySourceId] = useState<string | undefined>();
    const [copyLocations, setCopyLocations] = useState<
        Array<{ id: string; name: string; extras?: any }>
    >([]);
    const [copyLocationsLoading, setCopyLocationsLoading] = useState(false);
    const [copyApplying, setCopyApplying] = useState(false);

    const openCopyModal = () => {
        setCopySourceId(undefined);
        setCopyModalVisible(true);
        if (copyLocations.length === 0) {
            setCopyLocationsLoading(true);
            const query = gql`
                query GetDocks(
                    $filters: LocationSearchFilters
                    $orderBy: [LocationOrderByCriterion!]
                    $page: Int
                    $itemsPerPage: Int
                ) {
                    locations(
                        filters: $filters
                        orderBy: $orderBy
                        page: $page
                        itemsPerPage: $itemsPerPage
                    ) {
                        results {
                            id
                            name
                            extras
                        }
                    }
                }
            `;
            const variables = {
                filters: { category: parseInt(configsParams.locationCategoryDockCode) },
                orderBy: [{ field: 'name', ascending: true }],
                page: 1,
                itemsPerPage: 200
            };
            graphqlRequestClient
                .request(query, variables)
                .then((data: any) => setCopyLocations(data?.locations?.results ?? []))
                .catch(() => showError(t('messages:error-getting-data')))
                .finally(() => setCopyLocationsLoading(false));
        }
    };

    const confirmCopy = () => {
        if (!copySourceId) return;
        setCopyApplying(true);
        const sourceExtras = copyLocations.find((loc) => loc.id === copySourceId)?.extras ?? {};
        const clearAndSetMutation = gql`
            mutation CopyLocationExtras($id: String!, $input: UpdateLocationInput!) {
                updateLocation(id: $id, input: $input) {
                    id
                    extras
                }
            }
        `;
        graphqlRequestClient
            .request(clearAndSetMutation, { id: locationId, input: { extras: {} } })
            .then(() =>
                graphqlRequestClient.request(clearAndSetMutation, {
                    id: locationId,
                    input: { extras: sourceExtras }
                })
            )
            .then(() => {
                showSuccess(t('messages:success-updated'));
                setCopyModalVisible(false);
                setRefreshKey((k) => k + 1);
            })
            .catch(() => showError(t('messages:error-update-data')))
            .finally(() => setCopyApplying(false));
    };
    // --- end copy config modal ---

    // Lookup maps: id/code → display name
    const carriersQuery = useSimpleGetAllCarriersQuery<Partial<SimpleGetAllCarriersQuery>, Error>(
        graphqlRequestClient
    );

    const carrierMap = useMemo<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        carriersQuery.data?.carriers?.results?.forEach((c: any) => {
            map[c.id] = c.name;
        });
        return map;
    }, [carriersQuery.data]);

    const renderDockTypeLabel = (value?: string) => {
        if (!value) return '*';
        const param = configsParams.dockType;
        if (!param) return value;
        const found = param.find((v: any) => v.code === value);
        return found ? (found.translation?.[configsParamsLanguage] ?? found.value) : value;
    };

    const renderCarriers = (value?: string) => {
        if (!value || value === '*') return '*';
        return (
            <>
                {value
                    .split(',')
                    .filter(Boolean)
                    .map((id) => (
                        <Tag key={id}>{carrierMap[id.trim()] ?? id.trim()}</Tag>
                    ))}
            </>
        );
    };

    const renderTruckTypes = (value?: string) => {
        if (!value || value === '*') return '*';
        const param = configsParams.truckType;
        return (
            <>
                {value
                    .split(',')
                    .filter(Boolean)
                    .map((code) => {
                        const found = param?.find((v: any) => v.code === code.trim());
                        const label = found
                            ? (found.translation?.[configsParamsLanguage] ?? found.value)
                            : code.trim();
                        return <Tag key={code}>{label}</Tag>;
                    })}
            </>
        );
    };

    const renderSchedules = (schedules?: any) => {
        if (!schedules) return '-';
        return (
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>{t('d:day')}</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>{t('d:open')}</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>{t('d:periods')}</th>
                    </tr>
                </thead>
                <tbody>
                    {WEEK_DAYS.map((day) => {
                        const dayData = schedules[day];
                        if (!dayData) return null;
                        return (
                            <tr key={day}>
                                <td style={{ padding: '4px 8px' }}>{t(`d:${day}`)}</td>
                                <td style={{ padding: '4px 8px' }}>
                                    {dayData.open ? t('common:bool-yes') : t('common:bool-no')}
                                </td>
                                <td style={{ padding: '4px 8px' }}>
                                    {dayData.open && dayData.periods && dayData.periods.length > 0
                                        ? dayData.periods
                                              .map((p: any) => `${p.start} - ${p.end}`)
                                              .join(', ')
                                        : '-'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    const hasExtras =
        dockType !== undefined ||
        authorizedCarriers !== undefined ||
        operatingSchedules !== undefined ||
        authorizedTruckTypes !== undefined;

    const canEdit =
        modes.length > 0 && (modes.includes(ModeEnum.Update) || modes.includes(ModeEnum.Create));

    const editPath = pathParamsFromDictionary(`${rootPath}/extras/edit/[id]`, {
        id: locationId,
        locationName
    });

    return (
        <>
            <Divider />
            <HeaderContent
                title={t('common:dock-extras-information')}
                routes={[]}
                actionsRight={
                    canEdit ? (
                        <Space>
                            <LinkButton
                                title={hasExtras ? t('actions:edit') : t('actions:add')}
                                path={editPath}
                                type="primary"
                            />
                            <Button onClick={openCopyModal}>{t('actions:copy-config-from')}</Button>
                        </Space>
                    ) : undefined
                }
            />
            {loading ? (
                <ContentSpin />
            ) : hasExtras ? (
                <Descriptions bordered column={1} size="small" style={{ marginTop: 16 }}>
                    <Descriptions.Item label={t('d:dock_type')}>
                        {renderDockTypeLabel(dockType)}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('d:authorized_carriers')}>
                        {renderCarriers(authorizedCarriers)}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('d:operating_schedules')}>
                        {renderSchedules(operatingSchedules)}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('d:authorized_truck_types')}>
                        {renderTruckTypes(authorizedTruckTypes)}
                    </Descriptions.Item>
                </Descriptions>
            ) : (
                <div style={{ padding: '16px', color: '#999' }}>{t('messages:no-data')}</div>
            )}

            {/* Copy config modal */}
            <Modal
                title={t('actions:copy-config-from')}
                open={copyModalVisible}
                onCancel={() => setCopyModalVisible(false)}
                onOk={confirmCopy}
                okButtonProps={{ disabled: !copySourceId, loading: copyApplying }}
                okText={t('actions:submit')}
                cancelText={t('actions:cancel')}
            >
                {copyLocationsLoading ? (
                    <div style={{ textAlign: 'center', padding: '24px' }}>
                        <Spin />
                    </div>
                ) : (
                    <Select
                        showSearch
                        style={{ width: '100%' }}
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:dock')
                        })}`}
                        optionFilterProp="children"
                        value={copySourceId}
                        onChange={(val: string) => setCopySourceId(val)}
                    >
                        {copyLocations
                            .filter((loc) => loc.id !== locationId)
                            .map((loc) => (
                                <Select.Option key={loc.id} value={loc.id}>
                                    {loc.name}
                                </Select.Option>
                            ))}
                    </Select>
                )}
            </Modal>
        </>
    );
};

export { LocationExtrasListComponent };
