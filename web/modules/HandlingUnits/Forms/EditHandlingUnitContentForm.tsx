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
import { Button, Col, Input, Row, Form, Select, InputNumber, Modal, AutoComplete } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import {
    showError,
    showSuccess,
    showInfo,
    getRulesWithNoSpacesValidator,
    useArticleIds,
    useStockOwners,
    useLocationIds,
    checkUndefinedValues
} from '@helpers';
import configs from '../../../../common/configs.json';

import { FormOptionType } from 'models/Models';
import { debounce } from 'lodash';

interface IOption {
    value: string;
    id: string;
}
const { Option } = Select;

export type EditEquipmentFormProps = {
    details: any;
};
export const EditHandlingUnitContentForm = ({ details }: EditEquipmentFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [form] = Form.useForm();
    const [stockStatus, setStockStatus] = useState<Array<FormOptionType>>();
    const [stockOwners, setStockOwners] = useState<any>();
    const stockOwnerData = useStockOwners({}, 1, 100, null);
    const [aIdOptions, setAIdOptions] = useState<Array<IOption>>([]);
    const [aId, setAId] = useState<string>();
    const [articleName, setArticleName] = useState<string>('');
    const articleData = useArticleIds({ name: `${articleName}%` }, 1, 100, null);
    const [lIdOptions, setLIdOptions] = useState<Array<IOption>>([]);
    const [lId, setLId] = useState<string>();
    const [locationName, setLocationName] = useState<string>('');
    const locationData = useLocationIds({ name: `${locationName}%` }, 1, 100, null);

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

    // PARAMETER : stock_status
    const stockStatusList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'stock_statuses'
    });
    useEffect(() => {
        if (stockStatusList) {
            const newStockStatus: Array<FormOptionType> = [];

            const parameters = stockStatusList?.data?.listParametersForAScope;
            if (parameters) {
                parameters.forEach((item) => {
                    newStockStatus.push({ key: parseInt(item.code), text: item.text });
                });
                setStockStatus(newStockStatus);
            }
        }
    }, [stockStatusList.data]);

    // DROPDOWN : stock_owner
    useEffect(() => {
        if (stockOwnerData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            stockOwnerData.data.stockOwners?.results.forEach(({ id, name, status }) => {
                if (status != configs.STOCK_OWNER_STATUS_CLOSED) {
                    newIdOpts.push({ text: name!, key: id! });
                }
            });
            setStockOwners(newIdOpts);
        }
    }, [stockOwnerData.data]);

    // AUTOCOMPLETE DROPDOWN : article
    useEffect(() => {
        const formValue = form.getFieldsValue(true);
        form.setFieldsValue({ ...formValue, articleId: aId, articleName: articleName });
    }, [aId]);

    useEffect(() => {
        if (articleData.data) {
            const newIdOpts: Array<IOption> = [];
            articleData.data.articles?.results.forEach(({ id, name, stockOwnerId }) => {
                if (form.getFieldsValue(true).articleId === id) {
                    setArticleName(name!);
                    setAId(id!);
                }
                newIdOpts.push({ value: name!, id: id! });
            });
            setAIdOptions(newIdOpts);
        }
    }, [articleName, articleData.data]);

    const onChangeArticle = (data: string) => {
        if (!data?.length) {
            setArticleName('');
            setAId('');
        } else {
            setArticleName(data);
        }
    };

    // AUTOCOMPLETE DROPDOWN : location
    useEffect(() => {
        const formValue = form.getFieldsValue(true);
        form.setFieldsValue({ ...formValue, locationId: lId, locationName: locationName });
    }, [lId]);

    useEffect(() => {
        if (locationData.data) {
            const newIdOpts: Array<IOption> = [];
            locationData.data.locations?.results.forEach(({ id, name }) => {
                if (form.getFieldsValue(true).locationId === id) {
                    setLocationName(name!);
                    setLId(id!);
                }
                newIdOpts.push({ value: name!, id: id! });
            });
            setLIdOptions(newIdOpts);
        }
    }, [locationName, locationData.data]);

    const onChangeLocation = (data: string) => {
        if (!data?.length) {
            setLocationName('');
            setLId('');
        } else {
            setLocationName(data);
        }
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                checkUndefinedValues(form);
                const formData = form.getFieldsValue(true);
                setIsLoading(true);
                const fetchData = async () => {
                    const res = await fetch(`/api/handling-unit-contents/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            input: formData,
                            id: details.id,
                            handlingUnitId: details.handlingUnitId
                        })
                    });
                    if (res.ok) {
                        const updatedInfo = await res.json();
                        // call API for movement
                        const updatedHUC = updatedInfo.response.updatedHandlingUnitContent;
                        const updatedHU = updatedInfo.response.updatedHandlingUnit;
                        const fetchMovementData = async () => {
                            const resMovement = await fetch(`/api/create-movement/`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    trigger: 'updateContent',
                                    originData: {
                                        stockStatus: details.stockStatus,
                                        reservation: details.reservation,
                                        stockOwnerId: details.stockOwner?.id,
                                        stockOwnerName: details.stockOwner?.name,
                                        quantity: details.quantity,
                                        articleId: details.articleId,
                                        articleName: details.article?.name,
                                        handlingUnitId: details.handlingUnitId,
                                        handlingUnitName: details.handlingUnit?.name,
                                        locationId: details.handlingUnit.locationId,
                                        locationName: details.handlingUnit.location?.name,
                                        handlingUnitContentId: details.id
                                    },
                                    destinationData: {
                                        stockStatus: updatedHUC.stockStatus,
                                        reservation: updatedHUC.reservation,
                                        stockOwnerId: updatedHUC.stockOwner?.id,
                                        stockOwnerName: updatedHUC.stockOwner?.name,
                                        quantity: updatedHUC.quantity,
                                        articleId: updatedHUC.article?.id,
                                        articleName: updatedHUC.article?.name,
                                        handlingUnitId: updatedHU.id,
                                        handlingUnitName: updatedHU.name,
                                        locationId: updatedHU.location?.id,
                                        locationName: updatedHU.location?.name,
                                        handlingUnitContentId: updatedHUC.id
                                    }
                                })
                            });

                            if (resMovement.ok) {
                                router.push(`/handling-unit-contents/${details.id}`);
                                showSuccess(t('messages:success-updated'));
                            }
                            if (!resMovement.ok) {
                                const errorResponse = await resMovement.json();
                                if (errorResponse.error.response.errors[0].extensions) {
                                    showError(
                                        t(
                                            `errors:${errorResponse.error.response.errors[0].extensions.code}`
                                        )
                                    );
                                } else {
                                    showError(t('messages:error-update-data'));
                                }
                            }
                        };
                        fetchMovementData();
                    }
                    if (!res.ok) {
                        const errorResponse = await res.json();
                        if (errorResponse.error.response.errors[0].extensions) {
                            showError(
                                t(
                                    `errors:${errorResponse.error.response.errors[0].extensions.code}`
                                )
                            );
                        } else {
                            showError(t('messages:error-update-data'));
                        }
                    }
                    if (res) {
                        setIsLoading(false);
                    }
                };
                fetchData();
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('messages:error-update-data'));
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

    useEffect(() => {
        const tmp_details = {
            code: details?.handlingUnit?.name,
            locationName: details?.handlingUnit?.location?.name,
            stockOwnerId: details?.stockOwner?.id,
            articleId: details?.articleId,
            articleName: details?.article?.name,
            quantity: details?.quantity,
            stockStatus: details?.stockStatus,
            comment: details?.comment,
            reservation: details?.reservation
        };
        form.setFieldsValue(tmp_details);
        if (isLoading) {
            showInfo(t('messages:info-update-wip'));
        }
    }, [details, isLoading]);

    return (
        <WrapperForm>
            <Form form={form} scrollToFirstError>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={8} xl={12}>
                        <Form.Item label={t('d:handlingUnit')} name="code">
                            <Input disabled />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item label={t('d:location')} name="locationName">
                            <AutoComplete
                                disabled
                                placeholder={`${t('messages:please-fill-letter-your', {
                                    name: t('d:location')
                                })}`}
                                style={{ width: '100%' }}
                                options={lIdOptions}
                                value={locationName}
                                filterOption={(inputValue, option) =>
                                    option!.value
                                        .toUpperCase()
                                        .indexOf(inputValue.toUpperCase()) !== -1
                                }
                                onKeyUp={(e: any) => {
                                    debounce(() => {
                                        setLocationName(e.target.value);
                                    }, 3000);
                                }}
                                onSelect={(value, option) => {
                                    setLId(option.id);
                                    setLocationName(value);
                                }}
                                allowClear
                                onChange={onChangeLocation}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={t('d:stockOwner')}
                            name="stockOwnerId"
                            rules={[
                                { required: true, message: t('messages:error-message-empty-input') }
                            ]}
                        >
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:stockOwner')
                                })}`}
                            >
                                {stockOwners?.map((so: any) => (
                                    <Option key={so.key} value={so.key}>
                                        {so.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={t('d:article')}
                            name="articleName"
                            rules={[
                                { required: true, message: t('messages:error-message-empty-input') }
                            ]}
                        >
                            <AutoComplete
                                placeholder={`${t('messages:please-fill-letter-your', {
                                    name: t('d:article')
                                })}`}
                                style={{ width: '100%' }}
                                options={aIdOptions}
                                value={articleName}
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
                                onChange={onChangeArticle}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={t('d:quantity')}
                            name="quantity"
                            rules={[
                                { required: true, message: t('messages:error-message-empty-input') }
                            ]}
                        >
                            <InputNumber min={0} />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={t('d:stockStatus')}
                            name="stockStatus"
                            rules={[
                                { required: true, message: t('messages:error-message-empty-input') }
                            ]}
                        >
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:stockStatus')
                                })}`}
                            >
                                {stockStatus?.map((ss: any) => (
                                    <Option key={ss.key} value={ss.key}>
                                        {ss.text}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={t('d:comment')}
                            name="comment"
                            rules={getRulesWithNoSpacesValidator([], t('messages:error-space'))}
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={t('d:reservation')}
                            name="reservation"
                            rules={getRulesWithNoSpacesValidator([], t('messages:error-space'))}
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={24} xl={12}>
                        <Button type="primary" loading={isLoading} onClick={onFinish}>
                            {t('actions:submit')}
                        </Button>
                    </Col>
                    <Col xs={24} xl={12}>
                        <Button danger onClick={onCancel}>
                            {t('actions:cancel')}
                        </Button>
                    </Col>
                </Row>
            </div>
        </WrapperForm>
    );
};
