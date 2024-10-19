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
import { showError, showInfo, showSuccess } from '@helpers';
import { Button, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Typography } from 'antd';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox/Checkbox';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import {
    CreateFeatureTypeDetailMutation,
    CreateFeatureTypeDetailMutationVariables,
    GetParameterByIdQuery,
    SimpleGetAllFeatureCodesQuery,
    useCreateFeatureTypeDetailMutation,
    useGetParameterByIdQuery,
    useListParametersForAScopeQuery,
    useSimpleGetAllFeatureCodesQuery
} from 'generated/graphql';
import { FormOptionType } from 'models/ModelsV2';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const { Option } = Select;

export const AddFeatureTypeDetailsForm = () => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const { parameterId } = router.query;
    const { globalLocale } = useAppState();
    const searchedLanguage = globalLocale == 'en-us' ? 'en' : globalLocale;
    const [featureCodes, setFeatureCodes] = useState<any>();
    const [featureTypeObject, setFeatureTypeObject] = useState<any>();
    const [sortTypes, setSortTypes] = useState<Array<FormOptionType>>();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    //to recover featureType information for pre-filling
    const featureTypeById = useGetParameterByIdQuery<GetParameterByIdQuery, Error>(
        graphqlRequestClient,
        {
            id: parameterId as string
        }
    );
    //To render Simple feature codes list
    const featureCodesList = useSimpleGetAllFeatureCodesQuery<
        Partial<SimpleGetAllFeatureCodesQuery>,
        Error
    >(graphqlRequestClient);
    useEffect(() => {
        if (featureCodesList) {
            setFeatureCodes(featureCodesList?.data?.featureCodes?.results);
        }
    }, [featureCodesList]);

    useEffect(() => {
        if (featureTypeById) {
            setFeatureTypeObject(featureTypeById?.data?.parameter);
        }
    }, [featureTypeById]);

    useEffect(() => {
        const formData = form.getFieldsValue(true);
        if (featureTypeObject) {
            formData['featureType'] = parseInt(featureTypeObject?.code);
        }
        formData['associatedFeatureType'] = globalLocale
            ? featureTypeObject?.translation
                ? featureTypeObject?.translation[searchedLanguage]
                : featureTypeObject?.value
            : featureTypeObject?.value;
    }, [featureTypeObject]);

    // PARAMETER : sort types
    const sortTypesList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'stock_sort_type'
    });
    useEffect(() => {
        if (sortTypesList) {
            const newSortType: Array<FormOptionType> = [];

            const parameters = sortTypesList?.data?.listParametersForAScope;
            if (parameters) {
                parameters.forEach((item) => {
                    newSortType.push({ key: parseInt(item.code), text: item.text });
                });
                setSortTypes(newSortType);
            }
        }
    }, [sortTypesList.data]);

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

    const { mutate, isPending: createLoading } = useCreateFeatureTypeDetailMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: CreateFeatureTypeDetailMutation,
                _variables: CreateFeatureTypeDetailMutationVariables,
                _context: any
            ) => {
                router.push(`/feature-types/${parameterId}`);
                showSuccess(t('messages:success-created'));
            },
            onError: () => {
                showError(t('messages:error-creating-data'));
            }
        }
    );
    const onAtReceptionChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ atReception: e.target.checked });
    };
    const onAtPreparationChange = (e: CheckboxChangeEvent) => {
        form.setFieldsValue({ atPreparation: e.target.checked });
    };
    const onFeatureCodeChange = (e: any) => {
        const tmp_stockOwner = featureCodes.find((item: any) => item.id == e).stockOwnerId;
        if (tmp_stockOwner) {
            form.setFieldsValue({ stockOwnerId: tmp_stockOwner });
        }
    };

    // // Call api to create new group
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                delete formData['associatedFeatureType'];
                mutate({ input: formData });
                setUnsavedChanges(false);
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
            <Form form={form} scrollToFirstError onValuesChange={() => setUnsavedChanges(true)}>
                <Form.Item label={t('common:feature-type')} name="associatedFeatureType">
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    label={t('menu:feature-code')}
                    name="featureCodeId"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Select
                        placeholder={`${t('messages:please-select-a', {
                            name: t('menu:feature-code')
                        })}`}
                        onChange={onFeatureCodeChange}
                    >
                        {featureCodes?.map((featureCode: any) => (
                            <Option key={featureCode.id} value={featureCode.id}>
                                {featureCode.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item name="atReception">
                    <Checkbox onChange={onAtReceptionChange}>{t('d:atReception')}</Checkbox>
                </Form.Item>
                <Form.Item name="atPreparation">
                    <Checkbox onChange={onAtPreparationChange}>{t('d:atPreparation')}</Checkbox>
                </Form.Item>
                <Form.Item label={t('d:sortType')} name="sortType" hasFeedback>
                    <Select
                        placeholder={`${t('messages:please-select-a', {
                            name: t('d:sortType')
                        })}`}
                    >
                        {sortTypes?.map((sortType: any) => (
                            <Option key={sortType.key} value={sortType.key}>
                                {sortType.text}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Row>
                    <Col span={24} style={{ textAlign: 'center' }}>
                        <Space>
                            <Button type="primary" loading={createLoading} onClick={onFinish}>
                                {t('actions:submit')}
                            </Button>
                            <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                        </Space>
                    </Col>
                </Row>
            </Form>
        </WrapperForm>
    );
};
