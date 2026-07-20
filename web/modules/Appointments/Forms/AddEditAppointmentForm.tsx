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

import { Alert, Layout, Form, Button, Space, Modal, Select, Slider, InputNumber } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/fr';
import 'dayjs/locale/de';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { gql } from 'graphql-request';
import { useRouter } from 'next/router';

import { ModelType } from 'models/ModelsV2';
import { ModeEnum } from 'generated/graphql';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import { ContentSpin } from '@components';
import DatePickerInput from 'components/common/smart/Form/MainInputs/DatePickerInput';
import TextAreaInput from 'components/common/smart/Form/MainInputs/TextAreaInput';
import StringInput from 'components/common/smart/Form/MainInputs/StringInput';
import AutoComplete from 'components/common/smart/Form/MainInputs/AutoCompleteInput';
import {
    getModesFromPermissions,
    showError,
    checkUndefinedValues,
    getLanguageCode,
    useTranslationWithFallback as useTranslation,
    showSuccess,
    setUTCDateTime,
    flatten,
    getReservedCarrierExclusionFilters,
    findCodeByScopeAndValue,
    getAppointmentDirection,
    getLoadTypeCodesForDirection,
    getInboundLoadTypeCodes,
    getOrderTypeCodesForDirection,
    isAppointmentLinkEnabled,
    isCarrierAppointmentUser
} from '@helpers';

const { Option } = Select;

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

const DAYS_MAP = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
} as const;

type DayNumber = keyof typeof DAYS_MAP;
type DayName = (typeof DAYS_MAP)[DayNumber];

const ALL_HOURS_IN_DAY = Array.from({ length: 24 }, (_, i) => i);
const ALL_MINUTES_IN_HOUR = Array.from({ length: 60 }, (_, i) => i);

export interface IAddEditItemFormProps {
    headerComponent: any;
    dataModel: ModelType;
    routeAfterSuccess: string;
    initialProps?: any;
    extraData?: any;
    routeOnCancel?: string;
    id?: string;
    setData?: any;
}

interface ExistingAppointment {
    id: string;
    appointmentDateBegin: string;
    appointmentDateEnd: string;
    locationId: string;
}

interface OperatingSchedules {
    operating_schedules?: Record<
        DayName,
        { open: boolean; periods?: { start: string; end: string }[] }
    >;
    authorized_carriers?: string;
}

const parseLocationExtras = (location: any): OperatingSchedules | null => {
    if (!location?.extras) return null;
    try {
        return typeof location.extras === 'string' ? JSON.parse(location.extras) : location.extras;
    } catch (e) {
        console.error('Failed parsing location metadata configuration profiles', e);
        return null;
    }
};

const isLocationOpenAtTime = (location: any, targetTime: Dayjs): boolean => {
    if (!location) return false;
    const extras = parseLocationExtras(location);
    if (!extras?.operating_schedules) return false;

    const dayName = DAYS_MAP[targetTime.day() as DayNumber];
    const schedule = extras.operating_schedules[dayName];

    if (!schedule?.open) return false;
    if (!schedule.periods || schedule.periods.length === 0) return true;

    const currentFormatted = targetTime.format('HH:mm');

    return schedule.periods.some((period) => {
        const startFormatted = targetTime
            .hour(Number(period.start.split(':')[0]))
            .minute(Number(period.start.split(':')[1]))
            .format('HH:mm');
        const endFormatted = targetTime
            .hour(Number(period.end.split(':')[0]))
            .minute(Number(period.end.split(':')[1]))
            .format('HH:mm');
        return currentFormatted >= startFormatted && currentFormatted <= endFormatted;
    });
};

const isLocationTimeOverlapping = (
    locationId: string,
    startTime: Dayjs,
    endTime: Dayjs,
    appointments: ExistingAppointment[],
    currentId?: string
): boolean => {
    return appointments.some((booking) => {
        if (booking.locationId !== locationId || (currentId && booking.id === currentId))
            return false;
        const bookingStart = dayjs(setUTCDateTime(booking.appointmentDateBegin));
        const bookingEnd = dayjs(setUTCDateTime(booking.appointmentDateEnd));
        return startTime.isBefore(bookingEnd) && endTime.isAfter(bookingStart);
    });
};

const getBuildingTimeBoundaries = (buildingLocations: any[], dayName: DayName) => {
    let minHour = 24,
        maxHour = -1,
        hasAnyOpenLocation = false;

    buildingLocations.forEach((loc) => {
        const extras = parseLocationExtras(loc);
        const schedule = extras?.operating_schedules?.[dayName];

        if (schedule?.open) {
            hasAnyOpenLocation = true;
            if (!schedule.periods || schedule.periods.length === 0) {
                minHour = 0;
                maxHour = 23;
            } else {
                schedule.periods.forEach((period) => {
                    const startHour = parseInt(period.start.split(':')[0], 10);
                    const endHour = parseInt(period.end.split(':')[0], 10);
                    if (startHour < minHour) minHour = startHour;
                    if (endHour > maxHour) maxHour = endHour;
                });
            }
        }
    });

    return { minHour, maxHour, hasAnyOpenLocation };
};

const AddEditAppointmentForm: FC<IAddEditItemFormProps> = (props) => {
    const { permissions, configs, parameters } = useAppState();
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [form] = Form.useForm();

    // carrier users get a restricted form (no dock, no recurrence, no appointment-line selects)
    const isCarrier = isCarrierAppointmentUser(permissions);
    // pallet types for the truck composition, admin-managed via parameter scope
    // appointment_palette_type (so types can be added/removed without code changes)
    const paletteParams = useMemo(
        () =>
            (parameters ?? [])
                .filter((p: any) => p.scope === 'appointment_palette_type')
                .map((p: any) => ({ code: String(p.code), translation: p.translation, value: p.value })),
        [parameters]
    );

    const [lookup, setLookup] = useState<{
        initialized: boolean;
        locations: any[];
        carriers: any[];
        stockOwners: any[];
        existingAppointments: ExistingAppointment[];
        filteredLocations: any[];
    }>({
        initialized: false,
        locations: [],
        carriers: [],
        stockOwners: [],
        existingAppointments: [],
        filteredLocations: []
    });

    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [formSubmitting, setFormSubmitting] = useState(false);

    const selectedBuildingId = Form.useWatch('reference3', form);
    const selectedCarrierId = Form.useWatch('carrierId', form);
    const selectedLocationId = Form.useWatch('locationId', form);
    const selectedDuration = Form.useWatch('appointmentDuration', form);
    const selectedRecurrenceType = Form.useWatch('recurrenceType', form);
    const selectedDateBegin = Form.useWatch('appointmentDateBegin', form);
    const selectedAppointmentType = Form.useWatch('appointmentType', form);
    const selectedStockOwnerId = Form.useWatch('stockOwnerId', form);

    // in/out direction of the appointment drives which loads/deliveries/orders/POs are proposed
    const direction = getAppointmentDirection(selectedAppointmentType, configs);
    const isOutbound = direction === 'outbound';
    const isInbound = direction === 'inbound';
    // which entity types can be linked to an appointment (DB configs, scope "appointment")
    const linkLoads = isAppointmentLinkEnabled(configs, 'loads');
    const linkUnloads = isAppointmentLinkEnabled(configs, 'unloads');
    const linkDeliveries = isAppointmentLinkEnabled(configs, 'deliveries');
    const linkOrders = isAppointmentLinkEnabled(configs, 'orders');
    const linkPurchaseOrders = isAppointmentLinkEnabled(configs, 'purchase_orders');

    // AntD keeps values of hidden/unmounted fields; the entity selects are filtered by
    // direction + carrier + stock owner, so changing any of those would otherwise leave stale
    // IDs that get submitted as wrong-direction / wrong-carrier appointment lines. Clear them
    // whenever one of those filters actually changes (skip the first establishment so a preload
    // isn't clobbered).
    const prevSelectionFiltersRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        const key = `${direction ?? ''}|${selectedCarrierId ?? ''}|${selectedStockOwnerId ?? ''}`;
        if (
            prevSelectionFiltersRef.current !== undefined &&
            prevSelectionFiltersRef.current !== key
        ) {
            form.setFieldsValue({
                loads: undefined,
                deliveries: undefined,
                orders: undefined,
                purchaseOrders: undefined
            });
        }
        prevSelectionFiltersRef.current = key;
    }, [direction, selectedCarrierId, selectedStockOwnerId, form]);

    const language = getLanguageCode(router);
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    // the dayjs 'en' locale ships without a formats object: fall back to explicit patterns
    const localeFormats = dayjs.Ls[language]?.formats;
    const localeDateTimeFormat = `${localeFormats?.L ?? (language === 'en' ? 'MM/DD/YYYY' : 'DD/MM/YYYY')} ${localeFormats?.LT ?? 'HH:mm'}`;
    const operationalRequiredMode = props.id ? ModeEnum.Update : ModeEnum.Create;

    const configsParamsCodes = useMemo(() => {
        const findConfigCode = (scope: string, val: string) =>
            configs.find((item: any) => item.scope === scope && item.value === val)?.code;

        return {
            // "Visit" is a visitor-only appointment type handled through the visitor
            // management screens; the truck appointment form only offers in/out types.
            appointmentTypes: configs.filter(
                (item: any) => item.scope === 'appointment_type' && !/visit/i.test(item.value)
            ),
            appointmentStatusInCreation: parseInt(
                findConfigCode('appointment_status', 'In Creation') || '0',
                10
            ),
            loadStatusCreated: parseInt(findConfigCode('load_status', 'Created') || '0', 10),
            loadStatusDispatched: parseInt(findConfigCode('load_status', 'Dispatched') || '0', 10),
            loadTypePreLoading: parseInt(findConfigCode('load_type', 'Pre-loading') || '0', 10),
            loadTypeInbound: getInboundLoadTypeCodes(configs)[0],
            locationCategoryDock: findConfigCode('location_category', 'Dock'),
            // status is an Int -> parse the resolved code; keep undefined when absent so the
            // exclusion filter drops the status clause (only isVirtual is then applied).
            carrierClosedStatus: (() => {
                const code = findCodeByScopeAndValue(configs, 'carrier_status', 'closed');
                return code != null ? parseInt(code, 10) : undefined;
            })()
        };
    }, [configs]);

    // advanced filters for the entity multi-selects, keyed by direction + carrier:
    // loads restricted to the direction's types & below Dispatched; deliveries not shipped;
    // orders restricted to the direction's order types; all narrowed by carrier when one is set.
    const entityAdvancedFilters = useMemo(() => {
        if (direction !== 'outbound' && direction !== 'inbound') return null;
        const deliveryDispatched = parseInt(
            findCodeByScopeAndValue(configs, 'delivery_status', 'Dispatched') ?? '0',
            10
        );
        const carrierClause = selectedCarrierId
            ? [{ filter: [{ searchType: 'EQUAL', field: { carrierId: selectedCarrierId } }] }]
            : [];
        const carrierShipClause = selectedCarrierId
            ? [
                  {
                      filter: [
                          {
                              searchType: 'EQUAL',
                              field: { carrierShippingMode_CarrierId: selectedCarrierId }
                          }
                      ]
                  }
              ]
            : [];
        // stock owner constraint applies to deliveries/orders/purchase orders (not loads)
        const stockOwnerClause = selectedStockOwnerId
            ? [{ filter: [{ searchType: 'EQUAL', field: { stockOwnerId: selectedStockOwnerId } }] }]
            : [];
        const loadTypeCodes = getLoadTypeCodesForDirection(direction, configs);
        const orderTypeCodes = getOrderTypeCodesForDirection(direction, configs);
        return {
            loads: [
                {
                    filter: [
                        {
                            searchType: 'INFERIOR',
                            field: { status: configsParamsCodes.loadStatusDispatched }
                        }
                    ]
                },
                // fail-closed: if the direction's load types can't be resolved (missing/mis-labeled
                // load_type configs), filter on an impossible code so NO load is selectable rather
                // than every non-dispatched load, which could link a wrong-direction load.
                {
                    filter: [
                        {
                            searchType: 'EQUAL',
                            field: { type: loadTypeCodes.length ? loadTypeCodes : [-1] }
                        }
                    ]
                },
                ...carrierClause
            ],
            deliveries: [
                { filter: [{ searchType: 'INFERIOR', field: { status: deliveryDispatched } }] },
                ...carrierShipClause,
                ...stockOwnerClause
            ],
            orders: [
                // fail-closed: same rationale as loads — an unresolved order_type must select
                // nothing rather than orders of any direction.
                {
                    filter: [
                        {
                            searchType: 'EQUAL',
                            field: { orderType: orderTypeCodes.length ? orderTypeCodes : [-1] }
                        }
                    ]
                },
                ...carrierShipClause,
                ...stockOwnerClause
            ],
            purchaseOrders: [...stockOwnerClause]
        };
    }, [
        direction,
        selectedCarrierId,
        selectedStockOwnerId,
        configs,
        configsParamsCodes.loadStatusDispatched
    ]);

    const buildings = useMemo(() => {
        const uniqueMap = new Map();
        lookup.locations.forEach((loc) => {
            const b = loc.block?.building;
            if (b?.id) uniqueMap.set(b.id, b);
        });
        return Array.from(uniqueMap.values());
    }, [lookup.locations]);

    const selectableLocations = useMemo(() => {
        if (!selectedBuildingId) return [];
        return lookup.locations.filter((loc) => {
            if (loc.block?.building?.id !== selectedBuildingId) return false;
            if (!selectedCarrierId) return true;

            const extras = parseLocationExtras(loc);
            return (
                !extras?.authorized_carriers ||
                extras.authorized_carriers === '*' ||
                extras.authorized_carriers.split(',').includes(selectedCarrierId)
            );
        });
    }, [lookup.locations, selectedBuildingId, selectedCarrierId]);

    const filteredCarriers = useMemo(() => {
        if (!selectedLocationId) return lookup.carriers;
        const currentLoc = lookup.locations.find((loc) => loc.id === selectedLocationId);
        const extras = parseLocationExtras(currentLoc);
        if (!extras?.authorized_carriers || extras.authorized_carriers === '*')
            return lookup.carriers;

        const authorizedIds = extras.authorized_carriers.split(',');
        return lookup.carriers.filter((carrier) => authorizedIds.includes(carrier.id));
    }, [lookup.locations, lookup.carriers, selectedLocationId]);

    // keep the currently-selected carrier as an option even when it is filtered out (not
    // authorized for the location, or reserved/closed), otherwise the Select renders the raw
    // id instead of the carrier name in edit mode.
    const carrierOptions = useMemo(() => {
        if (!selectedCarrierId) return filteredCarriers;
        if (filteredCarriers.some((c: any) => c.id === selectedCarrierId)) return filteredCarriers;
        const fromAll = lookup.carriers.find((c: any) => c.id === selectedCarrierId);
        const fallback = fromAll ?? {
            id: selectedCarrierId,
            name: props.initialProps?.initialData?.carrier?.name ?? selectedCarrierId
        };
        return [fallback, ...filteredCarriers];
    }, [filteredCarriers, lookup.carriers, selectedCarrierId, props.initialProps]);

    // when a single carrier is available and none is selected yet, pick it automatically
    useEffect(() => {
        if (!lookup.initialized) return;
        if (!selectedCarrierId && filteredCarriers.length === 1) {
            form.setFieldsValue({ carrierId: filteredCarriers[0].id });
        }
    }, [lookup.initialized, filteredCarriers, selectedCarrierId, form]);

    const initialPropsError = props.initialProps?.error;
    const initialDataId = props.initialProps?.initialData?.id;

    useEffect(() => {
        if (lookup.initialized) return;

        if (props.id && initialPropsError) {
            showError(t('messages:error-fetching-data'));
            router.back();
            return;
        }

        const fetchLookupData = async () => {
            const locQuery = gql`
                query l($f: LocationSearchFilters) {
                    locations(filters: $f) {
                        results {
                            id
                            name
                            block {
                                id
                                name
                                building {
                                    id
                                    name
                                }
                            }
                            extras
                        }
                    }
                }
            `;
            const carrQuery = gql`
                query c($advancedFilters: [CarrierAdvancedSearchFilters!]) {
                    carriers(advancedFilters: $advancedFilters) {
                        results {
                            id
                            name
                            status
                            isVirtual
                        }
                    }
                }
            `;
            const stockQuery = gql`
                query s {
                    stockOwners {
                        results {
                            id
                            name
                        }
                    }
                }
            `;
            const aptQuery = gql`
                query a {
                    appointments {
                        results {
                            id
                            appointmentDateBegin
                            appointmentDateEnd
                            locationId
                        }
                    }
                }
            `;

            try {
                const [locRes, carrRes, stockRes, aptRes] = await Promise.all([
                    graphqlRequestClient.request(locQuery, {
                        filters: { category: configsParamsCodes.locationCategoryDock }
                    }),
                    graphqlRequestClient.request(carrQuery, {
                        advancedFilters: getReservedCarrierExclusionFilters(
                            configsParamsCodes.carrierClosedStatus
                        )
                    }),
                    graphqlRequestClient.request(stockQuery),
                    graphqlRequestClient.request(aptQuery)
                ]);

                const locs = locRes.locations.results || [];
                const totalBookings = aptRes?.appointments?.results || [];
                const initialData = props.initialProps?.initialData;

                if (props.id && initialData) props.setData(flatten(initialData));

                if (props.id && initialData && locs.length > 0) {
                    const begin = dayjs(setUTCDateTime(initialData.appointmentDateBegin));
                    const end = dayjs(setUTCDateTime(initialData.appointmentDateEnd));
                    const associatedBuildingId = locs.find(
                        (l: any) => l.id === initialData.locationId
                    )?.block?.building?.id;

                    form.setFieldsValue({
                        ...initialData,
                        appointmentType: initialData.appointmentType?.toString(),
                        appointmentDateBegin: begin,
                        appointmentDuration: end.diff(begin, 'minute'),
                        reference3: associatedBuildingId,
                        recurrenceType: 'none',
                        recurrenceCount: 1
                    });

                    // preload the truck composition (pallet counts + instructions) from content JSON
                    const rawContent = initialData.content;
                    const content =
                        typeof rawContent === 'string'
                            ? (() => {
                                  try {
                                      return JSON.parse(rawContent);
                                  } catch {
                                      return null;
                                  }
                              })()
                            : rawContent;
                    if (content) {
                        const compPatch: Record<string, any> = {};
                        if (content.palettes) {
                            compPatch.composition = Object.entries(content.palettes).map(
                                ([code, n]) => ({ paletteType: String(code), quantity: n })
                            );
                        }
                        if (content.instructions)
                            compPatch.compositionInstructions = content.instructions;
                        form.setFieldsValue(compPatch);
                    }
                }

                setLookup({
                    initialized: true,
                    locations: locs,
                    carriers: carrRes.carriers.results || [],
                    stockOwners: stockRes.stockOwners.results || [],
                    existingAppointments: props.id
                        ? totalBookings.filter((apt: any) => apt.id !== props.id)
                        : totalBookings,
                    filteredLocations: []
                });
            } catch (e) {
                showError(t('messages:error-fetching-data'));
                console.error(e);
            }
        };

        fetchLookupData();
    }, [props.id, initialPropsError, initialDataId, lookup.initialized]);

    useEffect(() => {
        if (!lookup.initialized || props.id || !router.isReady) return;

        const { start, end, locationId } = router.query;
        const patchValues: Record<string, any> = {};

        if (start) {
            patchValues.appointmentDateBegin = dayjs(start as string);
        }

        if (start && end) {
            const beginDt = dayjs(start as string);
            const endDt = dayjs(end as string);
            const durationInMinutes = endDt.diff(beginDt, 'minute');

            if (durationInMinutes >= 5 && durationInMinutes <= 1440) {
                patchValues.appointmentDuration = durationInMinutes;
            }
        }

        if (locationId) {
            const associatedLocation = lookup.locations.find((l: any) => l.id === locationId);
            const associatedBuildingId = associatedLocation?.block?.building?.id;

            if (associatedBuildingId) {
                patchValues.reference3 = associatedBuildingId;
                patchValues.locationId = locationId as string;
            }
        }

        if (Object.keys(patchValues).length > 0) {
            form.setFieldsValue(patchValues);
        }
    }, [lookup.initialized, props.id, router.isReady, router.query, form, lookup.locations]);

    useEffect(() => {
        if (!lookup.initialized || !selectedBuildingId || !selectedDateBegin) {
            if (lookup.filteredLocations.length > 0) {
                setLookup((prev) => ({ ...prev, filteredLocations: [] }));
            }
            return;
        }

        let active = true;
        const fetchFilteredLocations = async () => {
            const query = gql`
                mutation executeFunction($functionName: String!, $event: JSON!) {
                    executeFunction(functionName: $functionName, event: $event) {
                        status
                        output
                    }
                }
            `;
            try {
                const res = await graphqlRequestClient.request(query, {
                    functionName: 'add_dock_to_appointment',
                    event: {
                        input: {
                            appointment_id: props.id,
                            building_id: selectedBuildingId,
                            carrier_id: selectedCarrierId,
                            appointment_date_begin: dayjs(selectedDateBegin),
                            appointment_date_end: dayjs(selectedDateBegin).add(
                                selectedDuration || 60,
                                'minute'
                            )
                        }
                    }
                });

                if (!active) return;
                const output = res.executeFunction;

                if (output.status === 'ERROR') {
                    showError(output.output);
                } else if (output.status === 'OK' && output.output.status === 'KO') {
                    showError(t(`errors:${output.output.output.code}`));
                } else {
                    const results = output.output.output || [];
                    setLookup((prev) => ({ ...prev, filteredLocations: results }));
                    if (
                        selectedLocationId &&
                        !results.some((loc: any) => loc.id === selectedLocationId)
                    ) {
                        form.setFieldsValue({ locationId: undefined });
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };

        fetchFilteredLocations();
        return () => {
            active = false;
        };
    }, [
        selectedBuildingId,
        selectedCarrierId,
        selectedDateBegin,
        selectedDuration,
        lookup.initialized
    ]);

    useEffect(() => {
        const handleWindowClose = (e: BeforeUnloadEvent) => {
            if (unsavedChanges) {
                e.preventDefault();
                return (e.returnValue = t('messages:confirm-leaving-page'));
            }
        };
        const handleBrowseAway = () => {
            if (unsavedChanges && !window.confirm(t('messages:confirm-leaving-page'))) {
                router.events.emit('routeChangeError');
                throw 'Route change clean exit cancellation.';
            }
        };

        window.addEventListener('beforeunload', handleWindowClose);
        router.events.on('routeChangeStart', handleBrowseAway);
        return () => {
            window.removeEventListener('beforeunload', handleWindowClose);
            router.events.off('routeChangeStart', handleBrowseAway);
        };
    }, [unsavedChanges, router.events, t]);

    const handleFormValuesChange = (changedValues: any, allValues: any) => {
        setUnsavedChanges(true);

        if ('locationId' in changedValues && changedValues.locationId) {
            const bId = lookup.locations.find((loc) => loc.id === changedValues.locationId)?.block
                ?.building?.id;
            if (bId && bId !== allValues.reference3) {
                form.setFieldsValue({ reference3: bId });
            }
        }

        const timeOrLocChanged =
            'appointmentDateBegin' in changedValues ||
            'appointmentDuration' in changedValues ||
            'locationId' in changedValues;
        if (
            timeOrLocChanged &&
            allValues.locationId &&
            allValues.appointmentDateBegin &&
            allValues.appointmentDuration
        ) {
            const start = dayjs(setUTCDateTime(allValues.appointmentDateBegin));
            const end = start.add(allValues.appointmentDuration, 'minute');
            const targetLoc = lookup.locations.find((loc) => loc.id === allValues.locationId);

            if (targetLoc) {
                const isValid =
                    isLocationOpenAtTime(targetLoc, start) &&
                    isLocationOpenAtTime(targetLoc, end) &&
                    !isLocationTimeOverlapping(
                        allValues.locationId,
                        start,
                        end,
                        lookup.existingAppointments,
                        props.id
                    );
                if (!isValid) form.setFieldsValue({ locationId: undefined });
            }
        }

        if ('carrierId' in changedValues && allValues.locationId) {
            const currentLoc = lookup.locations.find((loc) => loc.id === allValues.locationId);
            const extras = parseLocationExtras(currentLoc);
            if (extras?.authorized_carriers && extras.authorized_carriers !== '*') {
                if (!extras.authorized_carriers.split(',').includes(changedValues.carrierId)) {
                    form.setFieldsValue({ locationId: undefined });
                }
            }
        }
    };

    const disabledDate = (current: Dayjs) => {
        if (!current || current.isBefore(dayjs().startOf('day'))) return true;
        if (!selectedBuildingId || selectableLocations.length === 0) return false;

        const dayName = DAYS_MAP[current.day() as DayNumber];
        return !selectableLocations.some(
            (loc) => parseLocationExtras(loc)?.operating_schedules?.[dayName]?.open === true
        );
    };

    const disabledTime = (current: Dayjs | null) => {
        if (!current || !selectedBuildingId || selectableLocations.length === 0) {
            return { disabledHours: () => [], disabledMinutes: () => [] };
        }

        const dayName = DAYS_MAP[current.day() as DayNumber];
        const { minHour, maxHour, hasAnyOpenLocation } = getBuildingTimeBoundaries(
            selectableLocations,
            dayName
        );

        if (!hasAnyOpenLocation) {
            return {
                disabledHours: () => ALL_HOURS_IN_DAY,
                disabledMinutes: () => ALL_MINUTES_IN_HOUR
            };
        }

        return {
            disabledHours: () => ALL_HOURS_IN_DAY.filter((h) => h < minHour || h > maxHour),
            disabledMinutes: (hour: number) =>
                hour < minHour || hour > maxHour ? ALL_MINUTES_IN_HOUR : []
        };
    };

    const executeValidationAndSave = async () => {
        try {
            setUnsavedChanges(false);
            setFormSubmitting(true);
            const values = await form.validateFields();

            const recurrenceType = values.recurrenceType || 'none';
            const recurrenceCount = values.recurrenceCount || 1;
            const baseBeginDate = dayjs(values.appointmentDateBegin);
            const duration = values.appointmentDuration;

            const rawFormValues = form.getFieldsValue([
                'name',
                'appointmentType',
                'reference3',
                'locationId',
                'carrierId',
                'loads',
                'deliveries',
                'orders',
                'purchaseOrders',
                'stockOwnerId',
                'driverName',
                'driverPhoneNumber',
                'driverEmail',
                'truckLicensePlate',
                'trailerLicensePlate',
                'contactComment',
                'reference1',
                'reference2'
            ]);

            const sanitizedFormValues: Record<string, any> = Object.fromEntries(
                Object.entries(rawFormValues).map(([key, val]) => [key, val === '' ? null : val])
            );

            const {
                loads: selectedLoadsData,
                deliveries: selectedDeliveriesData,
                orders: selectedOrdersData,
                purchaseOrders: selectedPurchaseOrdersData,
                ...payloadBase
            } = sanitizedFormValues;
            const appointmentTypeInt = payloadBase.appointmentType
                ? parseInt(payloadBase.appointmentType, 10)
                : null;
            const submitDirection = getAppointmentDirection(payloadBase.appointmentType, configs);

            // truck composition (pallets per type + free instructions) stored in the content JSON.
            // the editor is a Form.List of {paletteType, quantity} rows; last row wins on duplicates.
            const palettes: Record<string, number> = {};
            const compositionRows = form.getFieldValue('composition') ?? [];
            compositionRows.forEach((row: any) => {
                if (row && row.paletteType != null && row.quantity != null && row.quantity !== '') {
                    palettes[String(row.paletteType)] = Number(row.quantity);
                }
            });
            const compositionInstructions = form.getFieldValue('compositionInstructions') || null;
            const compositionContent =
                Object.keys(palettes).length > 0 || compositionInstructions
                    ? { palettes, instructions: compositionInstructions }
                    : undefined;

            const toIdArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);
            // one appointmentLine input per selected item, using the matching foreign key
            const selectionInputs = (appointmentId: string) => [
                ...toIdArray(selectedLoadsData).map((id: string) => ({
                    appointmentId,
                    loadId: id
                })),
                ...toIdArray(selectedDeliveriesData).map((id: string) => ({
                    appointmentId,
                    deliveryId: id
                })),
                ...toIdArray(selectedOrdersData).map((id: string) => ({
                    appointmentId,
                    orderId: id
                })),
                ...toIdArray(selectedPurchaseOrdersData).map((id: string) => ({
                    appointmentId,
                    purchaseOrderId: id
                }))
            ];
            const hasExplicitSelection = selectionInputs('x').length > 0;

            const createLineMutation = gql`
                mutation cLine($input: CreateAppointmentLineInput!) {
                    createAppointmentLine(input: $input) {
                        id
                    }
                }
            `;

            const createLinesForSelection = async (appointmentId: string) => {
                for (const input of selectionInputs(appointmentId)) {
                    await graphqlRequestClient.request(createLineMutation, {
                        input: { ...input, stockOwnerId: payloadBase.stockOwnerId ?? undefined }
                    });
                }
            };

            // default load type follows the appointment direction (inbound -> Inbound load). It
            // comes from a DB config (e.g. Inbound=300); when it isn't defined for this warehouse
            // the callers below skip the default-load creation and don't report a false success.
            const defaultLoadType =
                submitDirection === 'inbound'
                    ? configsParamsCodes.loadTypeInbound
                    : configsParamsCodes.loadTypePreLoading;
            const defaultLoadTypeValid =
                defaultLoadType != null && !Number.isNaN(defaultLoadType);
            const createDefaultLoad = async (appointmentId: string, appointmentName: string) => {
                const createLoadMutation = gql`
                    mutation cLoad($input: CreateLoadInput!) {
                        createLoad(input: $input) {
                            id
                        }
                    }
                `;
                const loadResult = await graphqlRequestClient.request(createLoadMutation, {
                    input: {
                        name: appointmentName,
                        status: configsParamsCodes.loadStatusCreated,
                        type: defaultLoadType,
                        carrierId: payloadBase.carrierId
                    }
                });
                await graphqlRequestClient.request(createLineMutation, {
                    input: { appointmentId, loadId: loadResult.createLoad.id }
                });
            };

            // ask the user (creation only, when nothing was selected) whether to create a default load
            const askCreateDefaultLoad = () =>
                new Promise<boolean>((resolve) => {
                    Modal.confirm({
                        title: t('messages:create-default-load-confirm'),
                        okText: t('common:bool-yes'),
                        cancelText: t('common:bool-no'),
                        onOk: () => resolve(true),
                        onCancel: () => resolve(false)
                    });
                });

            const createMutation = gql`
                mutation cApt($input: CreateAppointmentInput!) {
                    createAppointment(input: $input) {
                        id
                        name
                    }
                }
            `;

            if (props.id || recurrenceType === 'none') {
                const endDate = baseBeginDate.add(duration, 'minute');
                const chosenLoc = lookup.locations.find((l) => l.id === values.locationId);

                if (
                    chosenLoc &&
                    (!isLocationOpenAtTime(chosenLoc, baseBeginDate) ||
                        !isLocationOpenAtTime(chosenLoc, endDate) ||
                        isLocationTimeOverlapping(
                            values.locationId,
                            baseBeginDate,
                            endDate,
                            lookup.existingAppointments,
                            props.id
                        ))
                ) {
                    showError(t('messages:time-slot-overlapping'));
                    setFormSubmitting(false);
                    return;
                }

                const inputPayload = {
                    ...payloadBase,
                    appointmentDateBegin: baseBeginDate,
                    appointmentDateEnd: endDate,
                    appointmentType: appointmentTypeInt,
                    ...(compositionContent ? { content: compositionContent } : {})
                };
                let resultId = props.id;

                if (props.id) {
                    const updateMutation = gql`
                        mutation uApt($id: String!, $input: UpdateAppointmentInput!) {
                            updateAppointment(id: $id, input: $input) {
                                id
                            }
                        }
                    `;
                    await graphqlRequestClient.request(updateMutation, {
                        id: props.id,
                        input: inputPayload
                    });
                    // on edit, add any newly selected associations (removal is done from the
                    // appointment lines list on the detail page)
                    if (hasExplicitSelection) {
                        await createLinesForSelection(props.id);
                    }
                    showSuccess(t('messages:success-updated'));
                } else {
                    const result = await graphqlRequestClient.request(createMutation, {
                        input: {
                            ...inputPayload,
                            status: configsParamsCodes.appointmentStatusInCreation
                        }
                    });
                    resultId = result.createAppointment.id;
                    if (hasExplicitSelection) {
                        await createLinesForSelection(resultId!);
                    } else if (!isCarrier && (await askCreateDefaultLoad())) {
                        // never auto-create a load when a carrier creates the appointment
                        if (defaultLoadTypeValid) {
                            await createDefaultLoad(resultId!, result.createAppointment.name);
                        } else {
                            // the appointment itself was created; only the optional default load
                            // couldn't be (load type not configured). Warn but still report success
                            // below, so the user doesn't retry and create a duplicate.
                            showError(t('messages:default-load-not-created'));
                        }
                    }
                    showSuccess(t('messages:success-created'));
                }
                router.push(props.routeAfterSuccess.replace(':id', resultId as string));
            } else {
                // recurring creation: explicit associations are linked to the first occurrence
                // only (a delivery/order can't belong to N appointments); when nothing is selected
                // we ask once and create a default load for each occurrence.
                const wantDefaultForRecurrence =
                    hasExplicitSelection || isCarrier ? false : await askCreateDefaultLoad();
                // if the user asked for default loads but the load type isn't configured, skip them
                // for every occurrence and warn — the appointments themselves are still created
                const defaultLoadSkipped = wantDefaultForRecurrence && !defaultLoadTypeValid;
                if (defaultLoadSkipped) showError(t('messages:default-load-not-created'));
                let lastCreatedId = '';
                for (let i = 0; i < recurrenceCount; i++) {
                    const currentBegin = baseBeginDate.add(i, recurrenceType as any);
                    const currentEnd = currentBegin.add(duration, 'minute');

                    const result = await graphqlRequestClient.request(createMutation, {
                        input: {
                            ...payloadBase,
                            appointmentDateBegin: currentBegin,
                            appointmentDateEnd: currentEnd,
                            appointmentType: appointmentTypeInt,
                            ...(compositionContent ? { content: compositionContent } : {}),
                            status: configsParamsCodes.appointmentStatusInCreation
                        }
                    });

                    if (i === 0) lastCreatedId = result.createAppointment.id;
                    if (hasExplicitSelection) {
                        if (i === 0) await createLinesForSelection(result.createAppointment.id);
                    } else if (wantDefaultForRecurrence && defaultLoadTypeValid) {
                        await createDefaultLoad(
                            result.createAppointment.id,
                            result.createAppointment.name
                        );
                    }
                }
                showSuccess(t('messages:success-created'));
                router.push(props.routeAfterSuccess.replace(':id', lastCreatedId));
            }

            checkUndefinedValues(form);
        } catch (e) {
            setUnsavedChanges(true);
            console.error(e);
            showError(t('messages:error-saving-data'));
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleFormSubmit = async () => {
        if (props.id) {
            await executeValidationAndSave();
        } else {
            Modal.confirm({
                title: t('messages:create-confirm'),
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel'),
                onOk: async () => {
                    await executeValidationAndSave();
                }
            });
        }
    };

    const handleCancelBack = () => {
        setUnsavedChanges(false);
        Modal.confirm({
            title: t('messages:confirm-leaving-page'),
            okText: t('common:bool-yes'),
            cancelText: t('common:bool-no'),
            onOk: () => (props.routeOnCancel ? router.push(props.routeOnCancel) : router.back())
        });
    };

    if (!permissions) return <ContentSpin />;
    if (!modes.includes(operationalRequiredMode)) {
        return (
            <StyledPageContent>
                <Alert
                    message={t('messages:error')}
                    description={t('errors:APP-000200')}
                    type="error"
                    showIcon
                />
            </StyledPageContent>
        );
    }

    return (
        <StyledPageContent>
            {lookup.initialized && (
                <>
                    {props.headerComponent}
                    <StyledPageContent>
                        <Form
                            form={form}
                            layout="vertical"
                            scrollToFirstError
                            onValuesChange={handleFormValuesChange}
                        >
                            {/* carriers don't name appointments; omitting the field lets the
                                backend auto-number it (create) and preserves the name (edit) */}
                            {!isCarrier && <StringInput item={{ name: 'name' }} />}
                            <Form.Item
                                label={t('d:appointmentType')}
                                name="appointmentType"
                                required
                            >
                                <Select
                                    allowClear
                                    placeholder={t('messages:please-select-a', {
                                        name: t('d:appointmentType')
                                    })}
                                >
                                    {configsParamsCodes.appointmentTypes?.map(
                                        (item: any, i: number) => (
                                            <Option key={`${item.id}-${i}`} value={item.code}>
                                                {item.translation[language]}
                                            </Option>
                                        )
                                    )}
                                </Select>
                            </Form.Item>
                            <Form.Item label={t('d:carrier')} name="carrierId" required>
                                <Select
                                    allowClear
                                    placeholder={t('messages:please-select-a', {
                                        name: t('d:carrier')
                                    })}
                                >
                                    {carrierOptions.map((item: any, i: number) => (
                                        <Option key={`${item.id}-${i}`} value={item.id}>
                                            {item.name}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item label={t('d:building')} name="reference3" required>
                                <Select
                                    allowClear
                                    placeholder={t('messages:please-select-a', {
                                        name: t('d:building')
                                    })}
                                >
                                    {buildings.map((item: any) => (
                                        <Option key={item.id} value={item.id}>
                                            {item.name}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item
                                label={`${t('d:duration')} (${(() => {
                                    const val = selectedDuration || 60;
                                    const h = Math.floor(val / 60),
                                        m = val % 60;
                                    return h === 0
                                        ? `${m} min`
                                        : m === 0
                                          ? `${h}h`
                                          : `${h}h ${m} min`;
                                })()})`}
                                name="appointmentDuration"
                                initialValue={60}
                                required
                            >
                                <Slider step={5} min={5} max={1440} tooltip={{ open: false }} />
                            </Form.Item>
                            <DatePickerInput
                                item={{
                                    name: 'appointmentDateBegin',
                                    initialValue: undefined,
                                    rules: [{ required: true }]
                                }}
                                key="appointmentDateBegin"
                                format={localeDateTimeFormat}
                                disabledDate={disabledDate}
                                disabledTime={disabledTime}
                                showTime={{ minuteStep: 15, hideDisabledOptions: true }}
                                disabled={!selectedBuildingId}
                            />

                            {!props.id && !isCarrier && (
                                <>
                                    <Form.Item
                                        label={t('d:recurrenceType')}
                                        name="recurrenceType"
                                        initialValue="none"
                                    >
                                        <Select>
                                            <Option value="none">{t('d:no-recurrence')}</Option>
                                            <Option value="day">{t('d:daily')}</Option>
                                            <Option value="week">{t('d:weekly')}</Option>
                                            <Option value="month">{t('d:monthly')}</Option>
                                        </Select>
                                    </Form.Item>
                                    {selectedRecurrenceType &&
                                        selectedRecurrenceType !== 'none' && (
                                            <Form.Item
                                                label={t('d:recurrenceCount')}
                                                name="recurrenceCount"
                                                initialValue={1}
                                                rules={[
                                                    {
                                                        required: true,
                                                        message:
                                                            'Please specify recurrence quantity'
                                                    }
                                                ]}
                                            >
                                                <InputNumber
                                                    min={1}
                                                    max={100}
                                                    style={{ width: '100%' }}
                                                />
                                            </Form.Item>
                                        )}
                                </>
                            )}
                            {!isCarrier && (
                                <Form.Item label={t('d:location')} name="locationId">
                                    <Select
                                        allowClear
                                        placeholder={t('messages:please-select-a', {
                                            name: t('d:location')
                                        })}
                                        disabled={
                                            !selectedBuildingId ||
                                            !selectedDuration ||
                                            !selectedDateBegin
                                        }
                                    >
                                        {lookup.filteredLocations.map((item: any, i: number) => (
                                            <Option key={`${item.id}-${i}`} value={item.id}>
                                                {item.name}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            )}
                            {!isCarrier && (isOutbound || isInbound) && entityAdvancedFilters && (
                                <>
                                    {((isOutbound && linkLoads) || (isInbound && linkUnloads)) && (
                                        <AutoComplete
                                            item={
                                                {
                                                    name: 'loads',
                                                    displayName: t('common:loads'),
                                                    optionTable: {
                                                        table: 'Load',
                                                        fieldToDisplay: 'name'
                                                    }
                                                } as any
                                            }
                                            advancedFilters={entityAdvancedFilters.loads}
                                            isMultipleSelect
                                            key={`loads-${direction}-${selectedCarrierId ?? 'any'}`}
                                        />
                                    )}
                                    {isOutbound && linkDeliveries && (
                                        <AutoComplete
                                            item={
                                                {
                                                    name: 'deliveries',
                                                    displayName: t('common:deliveries'),
                                                    optionTable: {
                                                        table: 'Delivery',
                                                        fieldToDisplay: 'name'
                                                    }
                                                } as any
                                            }
                                            advancedFilters={entityAdvancedFilters.deliveries}
                                            isMultipleSelect
                                            key={`deliveries-${selectedCarrierId ?? 'any'}`}
                                        />
                                    )}
                                    {isInbound && linkPurchaseOrders && (
                                        <AutoComplete
                                            item={
                                                {
                                                    name: 'purchaseOrders',
                                                    displayName: t('common:purchaseOrders'),
                                                    optionTable: {
                                                        table: 'PurchaseOrder',
                                                        fieldToDisplay: 'name'
                                                    }
                                                } as any
                                            }
                                            advancedFilters={entityAdvancedFilters.purchaseOrders}
                                            isMultipleSelect
                                            key={`purchaseOrders-${selectedCarrierId ?? 'any'}`}
                                        />
                                    )}
                                    {linkOrders && (
                                        <AutoComplete
                                            item={
                                                {
                                                    name: 'orders',
                                                    displayName: t('common:orders'),
                                                    optionTable: {
                                                        table: 'Order',
                                                        fieldToDisplay: 'name'
                                                    }
                                                } as any
                                            }
                                            advancedFilters={entityAdvancedFilters.orders}
                                            isMultipleSelect
                                            key={`orders-${direction}-${selectedCarrierId ?? 'any'}`}
                                        />
                                    )}
                                </>
                            )}
                            <Form.Item label={t('d:stockOwner')} name="stockOwnerId">
                                <Select
                                    allowClear
                                    placeholder={t('messages:please-select-a', {
                                        name: t('d:stockOwner')
                                    })}
                                >
                                    {lookup.stockOwners.map((item: any, i: number) => (
                                        <Option key={`${item.id}-${i}`} value={item.id}>
                                            {item.name}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <StringInput item={{ name: 'driverName' }} />
                            <StringInput item={{ name: 'driverPhoneNumber' }} />
                            <StringInput item={{ name: 'driverEmail' }} />
                            <StringInput item={{ name: 'truckLicensePlate' }} />
                            <StringInput item={{ name: 'trailerLicensePlate' }} />
                            <TextAreaInput item={{ name: 'contactComment' }} />

                            {/* optional free references */}
                            <StringInput item={{ name: 'reference1' }} />
                            <StringInput item={{ name: 'reference2' }} />

                            {/* truck composition: add-as-many rows of (pallet type + quantity),
                                like the arguments/extras editor, so types stay admin-managed */}
                            {paletteParams.length > 0 && (
                                <>
                                    <div style={{ fontWeight: 600, margin: '8px 0' }}>
                                        {t('common:truck-composition')}
                                    </div>
                                    <Form.List name="composition">
                                        {(fields, { add, remove }) => (
                                            <>
                                                {fields.map(({ key, name, ...restField }) => (
                                                    <Space
                                                        key={key}
                                                        style={{ display: 'flex', marginBottom: 8 }}
                                                        align="baseline"
                                                    >
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'paletteType']}
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: t(
                                                                        'messages:error-message-empty-input'
                                                                    )
                                                                }
                                                            ]}
                                                        >
                                                            <Select
                                                                style={{ minWidth: 200 }}
                                                                placeholder={t('common:pallet-type')}
                                                            >
                                                                {paletteParams.map((p: any) => (
                                                                    <Option
                                                                        key={p.code}
                                                                        value={p.code}
                                                                    >
                                                                        {p.translation?.[
                                                                            router.locale ?? ''
                                                                        ] ?? p.value}
                                                                    </Option>
                                                                ))}
                                                            </Select>
                                                        </Form.Item>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'quantity']}
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: t(
                                                                        'messages:error-message-empty-input'
                                                                    )
                                                                }
                                                            ]}
                                                        >
                                                            <InputNumber
                                                                min={0}
                                                                placeholder={t('common:quantity')}
                                                            />
                                                        </Form.Item>
                                                        <MinusCircleOutlined
                                                            onClick={() => remove(name)}
                                                        />
                                                    </Space>
                                                ))}
                                                <Form.Item>
                                                    <Button
                                                        type="dashed"
                                                        onClick={() => add()}
                                                        block
                                                        icon={<PlusOutlined />}
                                                    >
                                                        {t('actions:add2', {
                                                            name: t('common:pallet-type')
                                                        })}
                                                    </Button>
                                                </Form.Item>
                                            </>
                                        )}
                                    </Form.List>
                                    <TextAreaInput item={{ name: 'compositionInstructions' }} />
                                </>
                            )}
                        </Form>

                        <div style={{ textAlign: 'center' }}>
                            <Space>
                                <Button
                                    type="primary"
                                    loading={formSubmitting}
                                    onClick={handleFormSubmit}
                                >
                                    {props.id ? t('actions:update') : t('actions:submit')}
                                </Button>
                                <Button onClick={handleCancelBack}>{t('actions:cancel')}</Button>
                            </Space>
                        </div>
                    </StyledPageContent>
                </>
            )}
        </StyledPageContent>
    );
};

AddEditAppointmentForm.displayName = 'AddEditAppointmentForm';

export { AddEditAppointmentForm };
