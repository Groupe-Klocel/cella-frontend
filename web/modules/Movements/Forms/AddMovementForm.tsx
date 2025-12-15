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
import { WrapperForm } from '@components';
import {
    showError,
    showSuccess,
    useGetHandlingUnitContents,
    useGetHandlingUnits,
    useLocations
} from '@helpers';
import {
    AutoComplete,
    Button,
    Card,
    Checkbox,
    Col,
    Form,
    InputNumber,
    Modal,
    Row,
    Select,
    Space
} from 'antd';
import { useAuth } from 'context/AuthContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { useAppState } from 'context/AppContext';
import { debounce } from 'lodash';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { gql } from 'graphql-request';

const { Option } = Select;

interface IOption {
    value: string;
    id: string;
}

export const AddMovementForm = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const { id } = router.query;
    const { configs, parameters } = useAppState();
    const filterLanguage = router.locale == 'en-US' ? 'en' : router.locale;
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [stockOwners, setStockOwners] = useState<any>();
    const [aIdOptions, setAIdOptions] = useState<Array<IOption>>([]);
    const [aId, setAId] = useState<string>();
    const [articleName, setArticleName] = useState<string>('');
    const [choosenStockOwner, setChoosenStockOwner] = useState<string>();
    const [originLocationIdOptions, setOriginLocationIdOptions] = useState<Array<IOption>>([]);
    const [originalLocationId, setOriginLocationId] = useState<string>();
    const [originalLocationName, setOriginLocationName] = useState<string>('');
    const [originLocationHuMng, setOriginLocationHuMng] = useState<boolean>(false);
    const [originHUOptions, setOriginHUOptions] = useState<any>();
    const [finalLocationIdOptions, setFinalLocationIdOptions] = useState<Array<IOption>>([]);
    const [finalLocationId, setFinalLocationId] = useState<string>();
    const [finalLocationName, setFinalLocationName] = useState<string>('');
    const [finalLocationHuMng, setFinalLocationHuMng] = useState<boolean>(false);
    const [finalHUOptions, setFinalHUOptions] = useState<any>();
    const [isStockOwnerDisabled, setIsStockOwnerDisabled] = useState<boolean>(false);
    const [isArticleDisabled, setIsArticleDisabled] = useState<boolean>(false);
    const [stockStatuses, setStockStatuses] = useState<any>();
    const [isStockStatusDisabled, setIsStockStatusDisabled] = useState<boolean>(false);
    const [reservations, setReservations] = useState<any>();
    const [isReservationDisabled, setIsReservationDisabled] = useState<boolean>(false);
    const [choosenHandlingUnitId, setChoosenHandlingUnitId] = useState<string>();
    const [availableQuantity, setAvailableQuantity] = useState<number | undefined>();
    const [isFullHuMoving, setIsFullHuMoving] = useState<boolean>(true);
    const [choosenInitialStatus, setChoosenInitialStatus] = useState<string>();
    const [choosenInitialReservation, setChoosenInitialReservation] = useState<string>();

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    // #configs/params
    // Memoized status code for locations to avoid recalculation on every render
    const configsParamsCodes = useMemo(() => {
        const findCodeByScope = (items: any[], scope: string, value: string) => {
            return items.find(
                (item: any) =>
                    item.scope === scope && item.value.toLowerCase() === value.toLowerCase()
            )?.code;
        };

        const normalMovementModel = findCodeByScope(configs, 'movement_model', 'normal');
        const closedStockOwnerStatusCode = findCodeByScope(configs, 'stock_owner_status', 'closed');
        const closedArticleStatusCode = findCodeByScope(configs, 'article_status', 'closed');
        const disabledLocationStatusCode = findCodeByScope(configs, 'location_status', 'disabled');
        const disabledHUStatusCode = findCodeByScope(configs, 'handling_unit_status', 'disabled');
        const toBeProcessedStatusCode = findCodeByScope(
            configs,
            'movement_status',
            'to be processed'
        );
        const stockTypeCode = findCodeByScope(configs, 'movement_type', 'stock');
        const transferMovementCode = findCodeByScope(parameters, 'movement_code', 'transfer');
        const priorities = parameters
            .filter((item: any) => item.scope === 'priority')
            .map((item: any) => ({
                key: parseInt(item.code),
                value: item.translation?.[filterLanguage!] || item.value
            }))
            .sort((a: any, b: any) => a.key - b.key);

        return {
            normalMovementModel,
            closedStockOwnerStatusCode,
            closedArticleStatusCode,
            disabledLocationStatusCode,
            disabledHUStatusCode,
            toBeProcessedStatusCode,
            stockTypeCode,
            transferMovementCode,
            priorities
        };
    }, [configs, parameters]);

    //#region originLocations options
    const originLocationFilter = { name: `${originalLocationName}%` };
    const originLocationData = useLocations(originLocationFilter, 1, 100, null);

    useEffect(() => {
        const formValue = form.getFieldsValue(true);
        form.setFieldsValue({ ...formValue, originalLocationId, originalLocationName });
    }, [originalLocationId]);

    useEffect(() => {
        if (originLocationData.data) {
            const newIdOpts: Array<IOption> = [];
            const statusToRemove = configsParamsCodes.disabledLocationStatusCode;
            originLocationData.data.locations?.results.forEach(
                ({ id, name, huManagement, status }) => {
                    setOriginLocationHuMng(huManagement!);
                    if (form.getFieldsValue(true).originalLocationId === id) {
                        setOriginLocationName(name!);
                        setOriginLocationId(id!);
                    }
                    if (status != statusToRemove) {
                        newIdOpts.push({ value: name!, id: id! });
                    }
                }
            );
            setOriginLocationIdOptions(newIdOpts);
        }
    }, [originalLocationName, originLocationData.data]);

    const onOriginLocationChange = (data: string) => {
        setOriginLocationName(data);
    };

    //#region handling unit options
    const getHandlingUnitOptions = (handlingUnitData: any, statusToRemove: string) => {
        if (!handlingUnitData?.data?.handlingUnits?.results) return [];
        return handlingUnitData.data.handlingUnits.results
            .filter(({ status }: any) => status !== statusToRemove)
            .map(({ id, name }: any) => ({ text: name!, key: id! }));
    };

    // Origin handling units
    const originLocationIdFilter = originalLocationId ? `${originalLocationId}` : undefined;

    const originHandlingUnitData = useGetHandlingUnits(
        { locationId: originLocationIdFilter },
        1,
        1000,
        null
    );

    useEffect(() => {
        const huOptions = getHandlingUnitOptions(
            originHandlingUnitData,
            configsParamsCodes.disabledHUStatusCode
        );
        setOriginHUOptions(huOptions);

        // location without hu management processing
        if (!originLocationHuMng && originalLocationName && huOptions.length > 0) {
            const matchingHU = huOptions.find((hu: any) => hu.text === originalLocationName);
            if (matchingHU) {
                const formValue = form.getFieldsValue(true);
                form.setFieldsValue({
                    ...formValue,
                    originalHandlingUnitId: matchingHU.key,
                    originalHandlingUnitName: originalLocationName
                });
                // Mettre à jour l'état local pour déclencher la requête HUC
                setChoosenHandlingUnitId(matchingHU.key);
                setIsFullHuMoving(false);
            }
        }
    }, [
        originHandlingUnitData.data,
        configsParamsCodes.disabledHUStatusCode,
        originLocationHuMng,
        originalLocationName
    ]);

    const onOriginHuChange = (e: any) => {
        setChoosenHandlingUnitId(e);
        const selectedHU = originHUOptions?.find((hu: any) => hu.key === e);
        if (selectedHU) {
            const formValue = form.getFieldsValue(true);
            form.setFieldsValue({
                ...formValue,
                originalHandlingUnitName: selectedHU.text
            });
        }
    };

    const onFinalHuChange = (e: any) => {
        const selectedHU = finalHUOptions?.find((hu: any) => hu.key === e);
        if (selectedHU) {
            const formValue = form.getFieldsValue(true);
            form.setFieldsValue({
                ...formValue,
                finalHandlingUnitName: selectedHU.text
            });
        }
    };

    // Final handling units
    const finalLocationIdFilter = finalLocationId ? `${finalLocationId}` : undefined;
    const finalHandlingUnitData = useGetHandlingUnits(
        { locationId: finalLocationIdFilter },
        1,
        1000,
        null
    );
    useEffect(() => {
        setFinalHUOptions(
            getHandlingUnitOptions(finalHandlingUnitData, configsParamsCodes.disabledHUStatusCode)
        );
    }, [finalHandlingUnitData.data, configsParamsCodes.disabledHUStatusCode]);

    // #region origin huc dynamic data
    const hucFilters = choosenHandlingUnitId
        ? { handlingUnitId: choosenHandlingUnitId }
        : undefined;
    const originHucData = useGetHandlingUnitContents(hucFilters, 1, 1000, null);

    useEffect(() => {
        if (originHucData.data && !isFullHuMoving) {
            if (originHucData.data?.handlingUnitContents?.results) {
                const uniqueStockOwnersMap = new Map<string, string>();
                // Populate stockOwners from handling unit contents
                originHucData.data.handlingUnitContents.results.forEach((item: any) => {
                    if (item.stockOwnerId && item.stockOwner?.name) {
                        uniqueStockOwnersMap.set(item.stockOwnerId, item.stockOwner.name);
                    }
                });
                const stockOwners = Array.from(uniqueStockOwnersMap, ([key, text]) => ({
                    key,
                    text
                }));
                setStockOwners(stockOwners);

                // auto fill single SO
                if (stockOwners.length === 1) {
                    const formValue = form.getFieldsValue(true);
                    form.setFieldsValue({
                        ...formValue,
                        stockOwnerId: stockOwners[0].key,
                        stockOwnerName: stockOwners[0].text
                    });
                    setChoosenStockOwner(stockOwners[0].key);
                    setIsStockOwnerDisabled(true);
                } else {
                    setIsStockOwnerDisabled(false);
                }

                // Populate aIdOptions from handling unit contents (articleId and article.name)
                const uniqueArticlesMap = new Map<string, string>();
                originHucData.data.handlingUnitContents.results.forEach((item: any) => {
                    // If a stock owner is chosen, only consider items with that stock owner
                    if (
                        (!choosenStockOwner || item.stockOwnerId === choosenStockOwner) &&
                        item.articleId &&
                        item.article?.name
                    ) {
                        uniqueArticlesMap.set(item.articleId, item.article.name);
                    }
                });
                const articleOptions = Array.from(uniqueArticlesMap, ([id, value]) => ({
                    id,
                    value
                }));
                setAIdOptions(articleOptions);

                // auto fill single Article
                if (articleOptions.length === 1) {
                    const formValue = form.getFieldsValue(true);
                    form.setFieldsValue({
                        ...formValue,
                        articleId: articleOptions[0].id,
                        articleName: articleOptions[0].value
                    });
                    setAId(articleOptions[0].id);
                    setArticleName(articleOptions[0].value);
                    setIsArticleDisabled(true);
                } else {
                    setIsArticleDisabled(false);
                }

                // Populate stockStatus options from handling unit contents (stockStatus)
                const uniqueStockStatusMap = new Map<string, string>();
                originHucData.data.handlingUnitContents.results.forEach((item: any) => {
                    // Filter by chosen stock owner and article if they are selected
                    if (
                        (!choosenStockOwner || item.stockOwnerId === choosenStockOwner) &&
                        (!aId || item.articleId === aId) &&
                        item.stockStatus &&
                        item.stockStatusText
                    ) {
                        uniqueStockStatusMap.set(item.stockStatus, item.stockStatusText);
                    }
                });
                const stockStatusOptions = Array.from(uniqueStockStatusMap, ([key, text]) => ({
                    key,
                    text
                }));
                setStockStatuses(stockStatusOptions);

                // auto fill single stockStatus
                if (stockStatusOptions.length === 1) {
                    const formValue = form.getFieldsValue(true);
                    form.setFieldsValue({
                        ...formValue,
                        initialStatus: stockStatusOptions[0].key
                    });
                    setChoosenInitialStatus(stockStatusOptions[0].key);
                    setIsStockStatusDisabled(true);
                } else {
                    setIsStockStatusDisabled(false);
                }

                // Populate reservation options from handling unit contents (reservation)
                const uniqueReservationSet = new Set<string>();
                originHucData.data.handlingUnitContents.results.forEach((item: any) => {
                    // Filter by chosen stock owner and article if they are selected
                    if (
                        (!choosenStockOwner || item.stockOwnerId === choosenStockOwner) &&
                        (!aId || item.articleId === aId) &&
                        item.reservation
                    ) {
                        uniqueReservationSet.add(item.reservation);
                    }
                });
                const reservationOptions = Array.from(uniqueReservationSet);
                setReservations(reservationOptions);
                // auto fill single reservation
                if (reservationOptions.length <= 1) {
                    const formValue = form.getFieldsValue(true);
                    form.setFieldsValue({
                        ...formValue,
                        initialReservation: reservationOptions[0]
                    });
                    setChoosenInitialReservation(reservationOptions[0]);
                    setIsReservationDisabled(true);
                } else {
                    setIsReservationDisabled(false);
                }

                // Populate quantity available from handling unit contents according to chosen properties
                let totalQuantity = 0;
                const formValue = form.getFieldsValue(true);

                originHucData.data.handlingUnitContents.results.forEach((item: any) => {
                    if (
                        (!choosenStockOwner || item.stockOwnerId === choosenStockOwner) &&
                        (!aId || item.articleId === aId) &&
                        (!choosenInitialStatus || item.stockStatus === choosenInitialStatus) &&
                        (!choosenInitialReservation ||
                            item.reservation === choosenInitialReservation)
                    ) {
                        totalQuantity += item.quantity!;
                    }
                });
                setAvailableQuantity(totalQuantity);

                // Auto fill quantity field with available quantity
                form.setFieldsValue({
                    ...formValue,
                    quantity: totalQuantity
                });

                // Find matching HUC item based on all specific criteria after auto-fill
                const { stockOwnerId, initialStatus, initialReservation } = formValue;
                if (aId && initialStatus !== undefined) {
                    const matchingItem = originHucData.data.handlingUnitContents.results.find(
                        (item: any) =>
                            (!stockOwnerId || item.stockOwnerId === stockOwnerId) &&
                            item.articleId === aId &&
                            item.stockStatus === initialStatus &&
                            (initialReservation === undefined ||
                                item.reservation === initialReservation)
                    );

                    if (matchingItem) {
                        form.setFieldsValue({
                            ...formValue,
                            originalContentId: matchingItem.id,
                            quantity: matchingItem.quantity
                        });
                        setAvailableQuantity(matchingItem.quantity || 0);
                    }
                }
            }
        }
    }, [
        originHucData.data,
        choosenStockOwner,
        isFullHuMoving,
        aId,
        choosenInitialStatus,
        choosenInitialReservation
    ]);

    const onMoveFullHuChange = (e: CheckboxChangeEvent) => {
        setIsFullHuMoving(e.target.checked);
        if (e.target.checked) {
            const formData = form.getFieldsValue(true);
            delete formData.stockOwnerId;
            delete formData.stockOwnerName;
            delete formData.articleId;
            delete formData.articleName;
            delete formData.initialStatus;
            delete formData.initialReservation;
            delete formData.quantity;
        }
    };

    const onStockOwnerChange = (e: any) => {
        setChoosenStockOwner(e);
    };

    const onArticleChange = (data: string) => {
        setArticleName(data);
    };

    const onInitialStatusChange = (value: string) => {
        setChoosenInitialStatus(value);
    };

    const onInitialReservationChange = (value: string) => {
        setChoosenInitialReservation(value);
    };

    //#region finalLocations options
    const finalLocationFilter = { name: `${finalLocationName}%` };
    const finalLocationData = useLocations(finalLocationFilter, 1, 100, null);

    useEffect(() => {
        const formValue = form.getFieldsValue(true);
        form.setFieldsValue({ ...formValue, finalLocationId, finalLocationName });
    }, [finalLocationId]);

    useEffect(() => {
        if (finalLocationData.data) {
            const newIdOpts: Array<IOption> = [];
            const statusToRemove = configsParamsCodes.disabledLocationStatusCode;
            finalLocationData.data.locations?.results.forEach(
                ({ id, name, huManagement, status }) => {
                    setFinalLocationHuMng(huManagement!);
                    if (form.getFieldsValue(true).finalLocationId === id) {
                        setFinalLocationName(name!);
                        setFinalLocationId(id!);
                    }
                    if (status != statusToRemove) {
                        newIdOpts.push({ value: name!, id: id! });
                    }
                }
            );
            setFinalLocationIdOptions(newIdOpts);
        }
    }, [finalLocationName, finalLocationData.data]);

    const onFinalLocationChange = (data: string) => {
        setFinalLocationName(data);
    };

    // #region unsaved changes
    // prompt the user if they try and leave with unsaved changes
    useEffect(() => {
        const handleWindowClose = (e: BeforeUnloadEvent) => {
            if (!unsavedChanges) return;
            e.preventDefault();
            return (e.returnValue = t('messages:confirm-leaving-page'));
        };
        const handleBrowseAway = () => {
            if (!unsavedChanges) return;
            if (window.confirm(t('messages:confirm-leaving-page'))) return;
            router.events.emit('routeChangeError');
            throw 'routeChange aborted.';
        };
        window.addEventListener('beforeunload', handleWindowClose);
        router.events.on('routeChangeStart', handleBrowseAway);
        return () => {
            window.removeEventListener('beforeunload', handleWindowClose);
            router.events.off('routeChangeStart', handleBrowseAway);
        };
    }, [unsavedChanges]);

    //#region create mutation
    const createMovement = async (input: any) => {
        const createMovementMutation = gql`
            mutation createMovement($input: CreateMovementInput!) {
                createMovement(input: $input) {
                    id
                    lastTransactionId
                }
            }
        `;

        const movementVariables = {
            input
        };

        const movementResults = await graphqlRequestClient.request(
            createMovementMutation,
            movementVariables
        );
        if (movementResults) {
            if (movementResults.createMovement) {
                router.push(`/movements/${movementResults.createMovement.id}`);
                showSuccess(t('messages:success-created'));
            } else {
                showError(t('messages:error-creating-data'));
            }
        }
    };

    // Helper function to add "Str" to keys ending with "Id" or "Name"
    const addStrToKeys = (obj: any) => {
        const transformedObj = { ...obj };

        Object.keys(obj).forEach((key) => {
            if (key.endsWith('Id') || key.endsWith('Name')) {
                const newKey = key + 'Str';
                transformedObj[newKey] = obj[key];
                delete transformedObj[key];
            }
        });

        return transformedObj;
    };

    //#region onFinish
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                console.log('DLA - onFinish - formData:', formData);

                const formDataWithStr = addStrToKeys(formData);
                console.log('DLA - onFinish - formDataWithStr:', formDataWithStr);
                formDataWithStr['articleIdStr'] = aId;
                formDataWithStr.model = parseInt(configsParamsCodes.normalMovementModel);
                formDataWithStr.code = parseInt(configsParamsCodes.transferMovementCode);
                formDataWithStr.status = parseInt(configsParamsCodes.toBeProcessedStatusCode);
                formDataWithStr.type = parseInt(configsParamsCodes.stockTypeCode);
                delete formDataWithStr.fullHU;
                createMovement(formDataWithStr);
                setUnsavedChanges(false);
            })
            .catch(() => {
                showError(t('error-creating-data'));
            });
    };

    const onCancel = () => {
        setUnsavedChanges(false);
        Modal.confirm({
            title: t('messages:confirm-leaving-page'),
            onOk: () => {
                router.back();
            },
            okText: t('common:bool-yes'),
            cancelText: t('common:bool-no')
        });
    };

    return (
        <WrapperForm>
            <Form
                form={form}
                layout="vertical"
                scrollToFirstError
                onValuesChange={() => setUnsavedChanges(true)}
            >
                <Row style={{ marginBottom: '8px' }}>
                    <Col span={12} style={{ paddingRight: '8px' }}>
                        <Form.Item
                            label={t('d:priority')}
                            name="priority"
                            rules={[
                                {
                                    required: true,
                                    message: `${t('messages:error-message-empty-input')}`
                                }
                            ]}
                        >
                            <Select
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:priority')
                                })}`}
                                showSearch
                                allowClear
                            >
                                {configsParamsCodes.priorities?.map((priority: any) => (
                                    <Option key={priority.key} value={priority.key}>
                                        {priority.value}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
                <Row style={{ marginBottom: '8px' }}>
                    <Col span={12} style={{ paddingRight: '8px' }}>
                        <Card type="inner" title={t('common:from')}>
                            <Form.Item label={t('d:originalLocation')} name="originalLocationName">
                                <AutoComplete
                                    placeholder={`${t('messages:please-fill-letter-your', {
                                        name: t('d:location')
                                    })}`}
                                    style={{ width: '100%' }}
                                    options={originLocationIdOptions}
                                    value={originalLocationName}
                                    filterOption={(inputValue, option) =>
                                        option!.value
                                            .toUpperCase()
                                            .indexOf(inputValue.toUpperCase()) !== -1
                                    }
                                    onKeyUp={(e: any) => {
                                        debounce(() => {
                                            setOriginLocationName(e.target.value);
                                        }, 3000);
                                    }}
                                    onSelect={(value, option) => {
                                        setOriginLocationId(option.id);
                                        setOriginLocationName(value);
                                    }}
                                    allowClear
                                    onChange={onOriginLocationChange}
                                    onClear={() => {
                                        setOriginLocationId(undefined);
                                        setOriginLocationName('');
                                        setOriginLocationHuMng(false);
                                        form.setFieldsValue({
                                            originalLocationName: undefined,
                                            originalLocationId: undefined,
                                            originalHandlingUnitId: undefined,
                                            fullHU: undefined,
                                            stockOwnerId: undefined,
                                            articleName: undefined,
                                            initialStatus: undefined,
                                            initialReservation: undefined,
                                            quantity: undefined
                                        });
                                        setIsFullHuMoving(true);
                                        setChoosenStockOwner(undefined);
                                        setAId(undefined);
                                        setArticleName('');
                                        setChoosenHandlingUnitId(undefined);
                                        setIsArticleDisabled(true);
                                    }}
                                />
                            </Form.Item>
                            {originalLocationId &&
                                originLocationHuMng &&
                                (originHUOptions.length > 0 ? (
                                    <Form.Item
                                        label={t('d:originalHandlingUnitNameStr')}
                                        name="originalHandlingUnitId"
                                    >
                                        <Select
                                            placeholder={`${t('messages:please-select-a', {
                                                name: t('d:handlingUnit')
                                            })}`}
                                            showSearch
                                            allowClear
                                            filterOption={(input, option) =>
                                                option?.props.children
                                                    .toLowerCase()
                                                    .indexOf(input.toLowerCase()) >= 0
                                            }
                                            onChange={onOriginHuChange}
                                            onClear={() => {
                                                form.setFieldsValue({
                                                    originalHandlingUnitId: undefined,
                                                    fullHU: undefined,
                                                    stockOwnerId: undefined,
                                                    articleName: undefined,
                                                    initialStatus: undefined,
                                                    initialReservation: undefined,
                                                    quantity: undefined
                                                });
                                                setIsFullHuMoving(true);
                                                setChoosenStockOwner(undefined);
                                                setAId(undefined);
                                                setArticleName('');
                                                setIsArticleDisabled(true);
                                            }}
                                        >
                                            {originHUOptions?.map((originHu: any) => (
                                                <Option key={originHu.key} value={originHu.key}>
                                                    {originHu.text}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                ) : (
                                    <p style={{ color: 'orange', fontWeight: 'bold' }}>
                                        {t('messages:nothing-to-move')}
                                    </p>
                                ))}
                            {choosenHandlingUnitId && originLocationHuMng && (
                                <Form.Item
                                    name="fullHU"
                                    valuePropName="checked"
                                    initialValue={isFullHuMoving}
                                >
                                    <Checkbox onChange={onMoveFullHuChange}>
                                        {t('d:move-full-hu')}
                                    </Checkbox>
                                </Form.Item>
                            )}
                            {(!isFullHuMoving || !originLocationHuMng) && (
                                <>
                                    <Form.Item label={t('d:stockOwner')} name="stockOwnerId">
                                        <Select
                                            placeholder={
                                                isStockOwnerDisabled
                                                    ? ''
                                                    : `${t('messages:please-select-a', {
                                                          name: t('d:stockOwner')
                                                      })}`
                                            }
                                            showSearch
                                            allowClear
                                            disabled={isStockOwnerDisabled}
                                            onChange={onStockOwnerChange}
                                            filterOption={(input, option) =>
                                                option?.props.children
                                                    .toLowerCase()
                                                    .indexOf(input.toLowerCase()) >= 0
                                            }
                                            onClear={() => {
                                                form.setFieldsValue({
                                                    stockOwnerId: undefined
                                                });
                                                setChoosenStockOwner(undefined);
                                                setIsArticleDisabled(false);
                                                setIsStockStatusDisabled(false);
                                            }}
                                        >
                                            {stockOwners?.map((stockOwner: any) => (
                                                <Option key={stockOwner.key} value={stockOwner.key}>
                                                    {stockOwner.text}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        label={t('d:article')}
                                        name="articleName"
                                        rules={[
                                            {
                                                required: !isFullHuMoving,
                                                message: `${t('messages:error-message-select-an', {
                                                    name: t('d:article')
                                                })}`
                                            }
                                        ]}
                                    >
                                        <AutoComplete
                                            placeholder={
                                                isArticleDisabled
                                                    ? ''
                                                    : `${t('messages:please-fill-letter-your', {
                                                          name: t('d:articleName')
                                                      })}`
                                            }
                                            style={{ width: '100%' }}
                                            options={aIdOptions}
                                            value={articleName}
                                            disabled={isArticleDisabled}
                                            filterOption={(inputValue, option) =>
                                                option!.value
                                                    .toUpperCase()
                                                    .indexOf(inputValue.toUpperCase()) !== -1
                                            }
                                            onKeyUp={(e: any) => {
                                                debounce(() => {
                                                    setArticleName(e.target.value);
                                                }, 3000);
                                            }}
                                            onSelect={(value, option) => {
                                                setAId(option.id);
                                                setArticleName(value);
                                            }}
                                            allowClear
                                            onChange={onArticleChange}
                                            onClear={() => {
                                                form.setFieldsValue({
                                                    articleName: undefined,
                                                    stockStatus: undefined,
                                                    quantity: undefined
                                                });
                                                setAId(undefined);
                                                setArticleName('');
                                            }}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        label={t('d:stockStatus')}
                                        name="initialStatus"
                                        rules={[
                                            {
                                                required: !isFullHuMoving,
                                                message: `${t('messages:error-message-select-an', {
                                                    name: t('d:stockStatus')
                                                })}`
                                            }
                                        ]}
                                    >
                                        <Select
                                            placeholder={
                                                isStockStatusDisabled
                                                    ? ''
                                                    : `${t('messages:please-select-a', {
                                                          name: t('d:stockStatus')
                                                      })}`
                                            }
                                            showSearch
                                            allowClear
                                            disabled={isStockStatusDisabled}
                                            onChange={onInitialStatusChange}
                                            filterOption={(input, option) =>
                                                option?.props.children
                                                    .toLowerCase()
                                                    .indexOf(input.toLowerCase()) >= 0
                                            }
                                            onClear={() => {
                                                form.setFieldsValue({
                                                    initialStatus: undefined,
                                                    initialReservation: undefined,
                                                    quantity: undefined
                                                });
                                                setChoosenInitialStatus(undefined);
                                            }}
                                        >
                                            {stockStatuses?.map((status: any) => (
                                                <Option key={status.key} value={status.key}>
                                                    {status.text}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                    <Form.Item label={t('d:reservation')} name="initialReservation">
                                        <Select
                                            placeholder={
                                                isReservationDisabled
                                                    ? ''
                                                    : `${t('messages:please-select-a', {
                                                          name: t('d:reservation')
                                                      })}`
                                            }
                                            showSearch
                                            allowClear
                                            disabled={isReservationDisabled}
                                            onChange={onInitialReservationChange}
                                            filterOption={(input, option) =>
                                                option?.props.children
                                                    .toLowerCase()
                                                    .indexOf(input.toLowerCase()) >= 0
                                            }
                                            onClear={() => {
                                                form.setFieldsValue({
                                                    initialReservation: undefined,
                                                    quantity: undefined
                                                });
                                                setChoosenInitialReservation(undefined);
                                            }}
                                        >
                                            {reservations?.map((status: any) => (
                                                <Option key={status.key} value={status.key}>
                                                    {status.text}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                    <Form.Item
                                        label={t('d:quantity')}
                                        name="quantity"
                                        initialValue={availableQuantity}
                                        rules={[
                                            {
                                                required: !isFullHuMoving,
                                                message: t('messages:error-message-empty-input')
                                            },
                                            {
                                                type: 'number',
                                                min: 0,
                                                message: t('messages:select-number-min', { min: 0 })
                                            },
                                            {
                                                type: 'number',
                                                max: availableQuantity,
                                                message: t('messages:select-number-max', {
                                                    max: availableQuantity
                                                })
                                            }
                                        ]}
                                    >
                                        <InputNumber disabled={!aId} />
                                    </Form.Item>
                                </>
                            )}
                        </Card>
                    </Col>
                    <Col span={12} style={{ paddingLeft: '8px' }}>
                        <Card type="inner" title={t('common:to')}>
                            <Form.Item label={t('d:finalLocation')} name="finalLocationName">
                                <AutoComplete
                                    placeholder={`${t('messages:please-fill-letter-your', {
                                        name: t('d:location')
                                    })}`}
                                    style={{ width: '100%' }}
                                    options={finalLocationIdOptions}
                                    value={finalLocationName}
                                    filterOption={(inputValue, option) =>
                                        option!.value
                                            .toUpperCase()
                                            .indexOf(inputValue.toUpperCase()) !== -1
                                    }
                                    onKeyUp={(e: any) => {
                                        debounce(() => {
                                            setFinalLocationName(e.target.value);
                                        }, 3000);
                                    }}
                                    onSelect={(value, option) => {
                                        setFinalLocationId(option.id);
                                        setFinalLocationName(value);
                                    }}
                                    allowClear
                                    onChange={onFinalLocationChange}
                                    onClear={() => {
                                        setFinalLocationId(undefined);
                                        setFinalLocationName('');
                                        setFinalLocationHuMng(false);
                                    }}
                                />
                            </Form.Item>
                            {finalLocationId && finalLocationHuMng && (
                                <Form.Item
                                    label={t('d:finalHandlingUnitNameStr')}
                                    name="finalHandlingUnitId"
                                >
                                    <Select
                                        placeholder={
                                            finalHUOptions.length === 0
                                                ? ''
                                                : `${t('messages:please-select-a', {
                                                      name: t('d:handlingUnit')
                                                  })}`
                                        }
                                        showSearch
                                        allowClear
                                        filterOption={(input, option) =>
                                            option?.props.children
                                                .toLowerCase()
                                                .indexOf(input.toLowerCase()) >= 0
                                        }
                                        disabled={finalHUOptions.length === 0}
                                        onChange={onFinalHuChange}
                                        onClear={() => {
                                            form.setFieldsValue({
                                                finalHandlingUnitId: undefined,
                                                finalHandlingUnitName: undefined
                                            });
                                        }}
                                    >
                                        {finalHUOptions?.map((finalHu: any) => (
                                            <Option key={finalHu.key} value={finalHu.key}>
                                                {finalHu.text}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            )}
                        </Card>
                    </Col>
                </Row>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Space>
                    <Button
                        type="primary"
                        onClick={onFinish}
                        disabled={
                            !originalLocationId ||
                            !finalLocationId ||
                            !!(
                                originalLocationId &&
                                originLocationHuMng &&
                                originHUOptions?.length === 0
                            )
                        }
                    >
                        {t('actions:submit')}
                    </Button>
                    <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                </Space>
            </div>
        </WrapperForm>
    );
};
