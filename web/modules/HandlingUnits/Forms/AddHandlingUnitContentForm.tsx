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
import {
    useListParametersForAScopeQuery,
    CreateHandlingUnitWithContentMutationVariables,
    CreateHandlingUnitWithContentMutation,
    useCreateHandlingUnitWithContentMutation
} from 'generated/graphql';
import {
    showError,
    showSuccess,
    showInfo,
    getRulesWithNoSpacesValidator,
    useArticleIds,
    useStockOwners,
    useLocationIds,
    useArticles,
    useHandlingUnitModels
} from '@helpers';
import configs from '../../../../common/configs.json';
import parameters from '../../../../common/parameters.json';

import { FormOptionType } from 'models/Models';
import { debounce } from 'lodash';

interface IOption {
    value: string;
    id: string;
}
const { Option } = Select;

export const AddHandlingUnitContentForm = () => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [form] = Form.useForm();
    const [handlingUnitType, setHandlingUnitType] = useState<Array<FormOptionType>>();
    const [stockStatus, setStockStatus] = useState<Array<FormOptionType>>();
    const [stockOwners, setStockOwners] = useState<any>();
    const stockOwnerData = useStockOwners({}, 1, 100, null);
    const [aIdOptions, setAIdOptions] = useState<Array<IOption>>([]);
    const [aId, setAId] = useState<string>();
    const [articleName, setArticleName] = useState<string>('');
    const articleData = useArticles({ name: `${articleName}%` }, 1, 100, null);
    const [lIdOptions, setLIdOptions] = useState<Array<IOption>>([]);
    const [lId, setLId] = useState<string>();
    const [locationName, setLocationName] = useState<string>('');
    const [proposedHuName, setProposedHuName] = useState<string | undefined>(undefined);
    const locationData = useLocationIds({ name: `${locationName}%` }, 1, 100, null);
    const handlingUnitModelData = useHandlingUnitModels({}, 1, 100, null);
    const [handlingUnitModels, setHandlingUnitModels] = useState<any>();

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

    // PARAMETER : handling_unit_type
    const handlingUnitTypeList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'handling_unit_type'
    });
    useEffect(() => {
        if (handlingUnitTypeList) {
            const newHandlingUnitType: Array<FormOptionType> = [];

            const parameters = handlingUnitTypeList?.data?.listParametersForAScope;
            if (parameters) {
                parameters.forEach((item) => {
                    newHandlingUnitType.push({ key: parseInt(item.code), text: item.text });
                });
                setHandlingUnitType(newHandlingUnitType);
            }
        }
    }, [handlingUnitTypeList.data]);

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
            stockOwnerData.data?.stockOwners?.results.forEach(({ id, name, status }) => {
                if (status != configs.STOCK_OWNER_STATUS_CLOSED) {
                    newIdOpts.push({ text: name!, key: id! });
                }
            });
            setStockOwners(newIdOpts);
        }
    }, [stockOwnerData.data]);

    // DROPDOWN : handling_unit_model
    useEffect(() => {
        if (handlingUnitModelData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            handlingUnitModelData.data?.handlingUnitModels?.results.forEach(
                ({ id, name, status }) => {
                    if (status != configs.HANDLING_UNIT_MODEL_STATUS_CLOSED) {
                        newIdOpts.push({ text: name!, key: name! });
                    }
                }
            );
            setHandlingUnitModels(newIdOpts);
        }
    }, [handlingUnitModelData.data]);

    // AUTOCOMPLETE DROPDOWN : article
    useEffect(() => {
        const formValue = form.getFieldsValue(true);
        form.setFieldsValue({ ...formValue, articleId: aId, articleName: articleName });
    }, [aId]);

    useEffect(() => {
        if (articleData.data) {
            const newIdOpts: Array<IOption> = [];
            articleData.data.articles?.results.forEach(({ id, name, status }) => {
                if (form.getFieldsValue(true).articleId === id) {
                    setArticleName(name!);
                    setAId(id!);
                }
                if (status != configs.ARTICLE_STATUS_CLOSED) {
                    newIdOpts.push({ value: name!, id: id! });
                }
            });
            setAIdOptions(newIdOpts);
        }
    }, [articleName, articleData.data, form.getFieldsValue(true).stockOwnerId]);

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
        setProposedHuName(undefined);
        if (locationData.data) {
            const newIdOpts: Array<IOption> = [];
            locationData.data.locations?.results.forEach(({ id, name, huManagement }) => {
                if (form.getFieldsValue(true).locationId === id) {
                    setLocationName(name!);
                    setLId(id!);
                    if (!huManagement) setProposedHuName(name);
                }
                newIdOpts.push({ value: name!, id: id! });
            });
            setLIdOptions(newIdOpts);
        }
    }, [locationName, locationData.data]);

    useEffect(() => {
        const formValue = form.getFieldsValue(true);
        form.setFieldsValue({ ...formValue, name: proposedHuName });
    }, [proposedHuName]);

    const onChangeLocation = (data: string) => {
        if (!data?.length) {
            setLocationName('');
            setLId('');
        } else {
            setLocationName(data);
        }
    };

    console.log('formData', form.getFieldsValue(true));

    // CREATE MUTATION
    const { mutate, isLoading: createLoading } = useCreateHandlingUnitWithContentMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateHandlingUnitWithContentMutation,
                _variables: CreateHandlingUnitWithContentMutationVariables,
                _context: any
            ) => {
                // call API for movement
                const createdHUC = data.createHandlingUnitWithContent;
                const fetchData = async () => {
                    const res = await fetch(`/api/create-movement/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            trigger: 'addContent',
                            destinationData: {
                                articleId: createdHUC.articleId,
                                articleName: createdHUC.article.name,
                                stockStatus: createdHUC.stockStatus,
                                quantity: createdHUC.quantity,
                                locationId: createdHUC.handlingUnit.locationId,
                                locationName: createdHUC.handlingUnit.location?.name,
                                handlingUnitId: createdHUC.handlingUnitId,
                                handlingUnitName: createdHUC.handlingUnit.name,
                                stockOwnerId: createdHUC.stockOwner?.id,
                                stockOwnerName: createdHUC.stockOwner?.name,
                                handlingUnitContentId: createdHUC.id
                            }
                        })
                    });
                    if (res.ok) {
                        router.push(
                            `/handling-unit-contents/${data.createHandlingUnitWithContent.id}`
                        );
                        showSuccess(t('messages:success-created'));
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
                };
                fetchData();
            },
            onError: (error: any) => {
                if (error.response && error.response.errors[0].extensions) {
                    const errorCode = error.response.errors[0].extensions.code;
                    if (
                        error.response.errors[0].extensions.variables &&
                        error.response.errors[0].extensions.variables.table_name
                    ) {
                        const errorTableName =
                            error.response.errors[0].extensions.variables.table_name;
                        showError(
                            t(`errors:${errorCode}`, { tableName: t(`common:${errorTableName}`) })
                        );
                    } else {
                        showError(t(`errors:${errorCode}`));
                    }
                } else {
                    showError(t('messages:error-creating-data'));
                    console.log(error);
                }
            }
        }
    );

    const CreateHandlingUnitWithContent = ({
        input
    }: CreateHandlingUnitWithContentMutationVariables) => {
        mutate({ input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                formData.status = configs.HANDLING_UNIT_STATUS_VALIDATED;
                formData.category = parameters.HANDLING_UNIT_MODEL_CATEGORY_STOCK;
                formData.barcode = formData.name;
                delete formData.locationName;
                delete formData.articleName;
                CreateHandlingUnitWithContent({ input: formData });
            })
            .catch((err) => {
                showError(t('messages:error-creating-data'));
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
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    return (
        <WrapperForm>
            <Form form={form} scrollToFirstError>
                <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={t('d:location')}
                            name="locationName"
                            rules={[
                                { required: true, message: t('messages:error-message-empty-input') }
                            ]}
                        >
                            <AutoComplete
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
                            label={t('d:handlingUnit')}
                            name="name"
                            rules={getRulesWithNoSpacesValidator(
                                [
                                    {
                                        required: true,
                                        message: t('messages:error-message-empty-input')
                                    }
                                ],
                                t('messages:error-space')
                            )}
                        >
                            <Input disabled={proposedHuName ? true : false} />
                        </Form.Item>
                    </Col>
                    <Col xs={8} xl={12}>
                        <Form.Item
                            label={t('d:handlingUnitModel')}
                            name="code"
                            rules={[
                                { required: true, message: t('messages:error-message-empty-input') }
                            ]}
                        >
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:handlingUnitModel')
                                })}`}
                            >
                                {handlingUnitModels?.map((so: any) => (
                                    <Option key={so.key} value={so.key}>
                                        {so.text}
                                    </Option>
                                ))}
                            </Select>
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
                            label={t('d:type')}
                            name="type"
                            rules={[
                                { required: true, message: t('messages:error-message-empty-input') }
                            ]}
                        >
                            <Select
                                allowClear
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:type')
                                })}`}
                            >
                                {handlingUnitType?.map((hut: any) => (
                                    <Option key={hut.key} value={hut.key}>
                                        {hut.text}
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
                        <Button type="primary" loading={createLoading} onClick={onFinish}>
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
