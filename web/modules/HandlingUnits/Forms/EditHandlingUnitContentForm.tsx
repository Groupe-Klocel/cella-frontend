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
    UpdateHandlingUnitContentMutationVariables,
    UpdateHandlingUnitContentMutation,
    useUpdateHandlingUnitContentMutation
} from 'generated/graphql';
import {
    showError,
    showSuccess,
    showInfo,
    getRulesWithNoSpacesValidator,
    useArticleIds,
    useStockOwners,
    useLocationIds
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
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [form] = Form.useForm();
    const [handlingUnitType, setHandlingUnitType] = useState<Array<FormOptionType>>();
    const [handlingUnitCategory, setHandlingUnitCategory] = useState<Array<FormOptionType>>();
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

    // PARAMETER : handling_unit_category
    const handlingUnitCategoryList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'handling_unit_category'
    });
    useEffect(() => {
        if (handlingUnitCategoryList) {
            const newHandlingUnitCategory: Array<FormOptionType> = [];

            const parameters = handlingUnitCategoryList?.data?.listParametersForAScope;
            if (parameters) {
                parameters.forEach((item) => {
                    newHandlingUnitCategory.push({ key: parseInt(item.code), text: item.text });
                });
                setHandlingUnitCategory(newHandlingUnitCategory);
            }
        }
    }, [handlingUnitCategoryList.data]);

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
                if (form.getFieldsValue(true).stockOwnerId === stockOwnerId) {
                    if (form.getFieldsValue(true).articleId === id) {
                        setArticleName(name!);
                        setAId(id!);
                    }
                    newIdOpts.push({ value: name!, id: id! });
                }
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

    // CREATE MUTATION
    const { mutate, isLoading: updateLoading } = useUpdateHandlingUnitContentMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateHandlingUnitContentMutation,
                _variables: UpdateHandlingUnitContentMutationVariables,
                _context: any
            ) => {
                router.push(`/handling-unit-contents/${data?.updateHandlingUnitContent?.id}`);
                showSuccess(t('messages:success-updated'));
            },
            onError: (err: any) => {
                console.log(err);
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const updateHandlingUnitContent = ({
        id,
        input
    }: UpdateHandlingUnitContentMutationVariables) => {
        mutate({ id, input });
    };
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                delete formData.code;
                delete formData.locationName;
                delete formData.stockOwnerId;
                delete formData.articleName;
                updateHandlingUnitContent({ id: details.id, input: formData });
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
        const tmp_details = {
            code: details?.handlingUnit.name,
            locationName: details?.handlingUnit.location.name,
            stockOwnerId: details?.handlingUnit.stockOwner.name,
            articleName: details?.article.name,
            quantity: details?.quantity,
            stockStatus: details?.stockStatus,
            comment: details?.comment,
            reservation: details?.reservation
        };
        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(t('messages:info-update-wip'));
            showSuccess(t('messages:success-updated'));
        }
    }, [updateLoading]);

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
                        <Form.Item label={t('d:stockOwner')} name="stockOwnerId">
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
                        <Form.Item label={t('d:article')} name="articleName">
                            <AutoComplete
                                disabled
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
                            <InputNumber />
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
                        <Button type="primary" loading={updateLoading} onClick={onFinish}>
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
