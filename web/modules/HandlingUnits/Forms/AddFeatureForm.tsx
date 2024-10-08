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
import { useState, useEffect, FC } from 'react';
import { Form, Button, Space, Modal, DatePicker, Input, Select } from 'antd';
import { WrapperForm, StepsPanel, WrapperStepContent } from '@components';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import moment from 'moment';
import { showError, showSuccess, showInfo, useCreate } from '@helpers';
import { FilterFieldType, ModelType, FormOptionType } from 'models/ModelsV2';
import {
    GetHandlingUnitContentByIdQuery,
    useGetHandlingUnitContentByIdQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';

require('moment/locale/fr'); // French

export interface IAddItemFormProps {
    dataModel: ModelType;
    addSteps: Array<Array<FilterFieldType>>;
    routeAfterSuccess: string;
    extraData: any;
    routeOnCancel?: string;
    setFormInfos: (formInfos: any) => void;
    dependentFields: Array<any>;
}

export const AddFeatureForm: FC<IAddItemFormProps> = (props: IAddItemFormProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const { graphqlRequestClient } = useAuth();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const [current, setCurrent] = useState(0);
    const [form] = Form.useForm();

    moment.locale(router.locale);
    const localeData = moment.localeData();
    const localeDateTimeFormat = localeData.longDateFormat('L');

    // #region extract data from modelV2
    const detailFields = Object.keys(props.dataModel.fieldsInfo).filter(
        (key) => props.dataModel.fieldsInfo[key].isDetailRequested
    );
    // #endregion

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

    const handleClickNext = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                setCurrent(current + 1);
            })
            .catch((err) => console.log(err));
    };

    const handleClickBack = () => {
        setCurrent(current - 1);
    };

    const {
        isLoading: createLoading,
        result: createResult,
        mutate
    } = useCreate(props.dataModel.resolverName, props.dataModel.endpoints.create, detailFields);

    const { isLoading, data, error } = useGetHandlingUnitContentByIdQuery<
        GetHandlingUnitContentByIdQuery,
        Error
    >(graphqlRequestClient, {
        id: props.extraData.handlingUnitContentId
    });

    useEffect(() => {
        if (!(createResult && createResult.data)) return;

        if (createResult.success) {
            console.log('ID res', createResult.data);
            const createdFeature = createResult.data.createHandlingUnitContentFeature;
            const relatedHUC = data?.handlingUnitContent;
            const fetchData = async () => {
                const res = await fetch(`/api/create-movement/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        trigger: 'addContentFeature',
                        originData: {
                            articleId: relatedHUC?.articleId,
                            articleName: relatedHUC?.article.name,
                            stockStatus: relatedHUC?.stockStatus,
                            quantity: 1,
                            locationId: relatedHUC?.handlingUnit.locationId,
                            locationName: relatedHUC?.handlingUnit.location?.name,
                            handlingUnitId: relatedHUC?.handlingUnitId,
                            handlingUnitName: relatedHUC?.handlingUnit.name,
                            stockOwnerId: relatedHUC?.stockOwner?.id,
                            stockOwnerName: relatedHUC?.stockOwner?.name,
                            handlingUnitContentId: relatedHUC?.id
                        },
                        destinationData: {
                            articleId: relatedHUC?.articleId,
                            articleName: relatedHUC?.article.name,
                            stockStatus: relatedHUC?.stockStatus,
                            quantity: Number(relatedHUC?.quantity) + 1,
                            locationId: relatedHUC?.handlingUnit.locationId,
                            locationName: relatedHUC?.handlingUnit.location?.name,
                            handlingUnitId: relatedHUC?.handlingUnitId,
                            handlingUnitName: relatedHUC?.handlingUnit.name,
                            stockOwnerId: relatedHUC?.stockOwner?.id,
                            stockOwnerName: relatedHUC?.stockOwner?.name,
                            handlingUnitContentId: relatedHUC?.id,
                            feature: {
                                code: createdFeature.featureCode.name,
                                value: createdFeature.value
                            }
                        }
                    })
                });
                if (res.ok) {
                    setUnsavedChanges(false);
                    router.push(
                        props.routeAfterSuccess.replace(
                            ':id',
                            createResult.data[props.dataModel.endpoints.create]?.id
                        )
                    );
                    showSuccess(t('messages:success-created'));
                }
                if (!res.ok) {
                    const errorResponse = await res.json();
                    if (errorResponse.error.response.errors[0].extensions) {
                        showError(
                            t(`errors:${errorResponse.error.response.errors[0].extensions.code}`)
                        );
                    } else {
                        showError(t('messages:error-update-data'));
                    }
                }
            };
            fetchData();
        } else {
            showError(t('messages:error-creating-data'));
        }
    }, [createResult]);

    // function to reset data in case of fields dependencies
    const [changedFormValues, setChangedFormValues] = useState<any>({});
    const [isDateType, setIsDateType] = useState(false);
    const optionsList = props.addSteps[current][0].subOptions;

    useEffect(() => {
        if (form.getFieldsValue(true) && changedFormValues['featureCodeId']) {
            const id = changedFormValues['featureCodeId'];
            optionsList?.forEach((item: any) => {
                if (item['key'] === id) {
                    setIsDateType(item['type']);
                }
            });
        }
        if (
            form.getFieldsValue(true) &&
            props.dependentFields &&
            props.dependentFields.length > 0
        ) {
            props.dependentFields.forEach((obj: any) => {
                if (changedFormValues[obj.triggerField]) {
                    delete form.getFieldsValue(true)[obj.changingField];
                }
            });
        }
    }, [props.dependentFields, changedFormValues]);

    const onFinish = () => {
        Modal.confirm({
            title: t('messages:create-confirm'),
            onOk: () => {
                delete props.extraData['featureType'];

                form.validateFields()
                    .then(() => {
                        let value = form.getFieldsValue(true)['value'];
                        if (isDateType) {
                            const valueFromField = form.getFieldsValue(true)['value'];
                            value = moment(valueFromField).format('YYYY-MM-DD');
                        }
                        const inputs = {
                            featureCodeId: form.getFieldsValue(true)['featureCodeId'],
                            value: value
                        };

                        mutate({
                            input: { ...inputs, ...props.extraData }
                        });
                        setUnsavedChanges(false);
                    })
                    .catch((err) => {
                        showError(t('errors:DB-000111'));
                    });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const onCancel = () => {
        setUnsavedChanges(false);
        Modal.confirm({
            title: t('messages:confirm-leaving-page'),
            onOk: () => {
                props.routeOnCancel ? router.push(props.routeOnCancel) : router.back();
            },
            okText: t('common:bool-yes'),
            cancelText: t('common:bool-no')
        });
    };

    const steps = props.addSteps.map((element, index) => {
        return {
            title: `${t('common:step')} ` + (index + 1).toString(),
            key: index
        };
    });

    useEffect(() => {
        if (createLoading) {
            showInfo(t('messages:info-create-wip'));
        }
    }, [createLoading]);

    return (
        <WrapperForm>
            {steps.length > 1 && <StepsPanel currentStep={current} steps={steps} />}
            <WrapperStepContent>
                <Form
                    form={form}
                    layout="vertical"
                    scrollToFirstError
                    onValuesChange={(changedValues, values) => {
                        setChangedFormValues(changedValues);
                        props.setFormInfos(values);
                        setUnsavedChanges(true);
                    }}
                >
                    <Form.Item
                        label={t('d:featureCodeId')}
                        name="featureCodeId"
                        rules={[{ required: true, message: errorMessageEmptyInput }]}
                        initialValue={undefined}
                    >
                        <Select
                            disabled={false}
                            allowClear
                            showSearch
                            filterOption={(inputValue, option) =>
                                option!.props.children
                                    .toUpperCase()
                                    .indexOf(inputValue.toUpperCase()) !== -1
                            }
                            mode={undefined}
                        >
                            {props.addSteps[current][0].subOptions?.map(
                                (option: FormOptionType) => (
                                    <Select.Option key={option.key} value={option.key}>
                                        {option.text}
                                    </Select.Option>
                                )
                            )}
                        </Select>
                    </Form.Item>
                    {isDateType ? (
                        <Form.Item
                            label={t('d:value')}
                            name="value"
                            hidden={false}
                            rules={[{ required: true, message: errorMessageEmptyInput }]}
                            initialValue={moment().startOf('day')}
                        >
                            <DatePicker format={localeDateTimeFormat} />
                        </Form.Item>
                    ) : (
                        <Form.Item
                            name={'value'}
                            label={t('d:value')}
                            key={'value'}
                            hidden={false}
                            rules={[{ required: true, message: errorMessageEmptyInput }]}
                            normalize={(value) => (value ? value : undefined)}
                        >
                            <Input disabled={false} maxLength={100} />
                        </Form.Item>
                    )}
                </Form>
            </WrapperStepContent>
            {current === 0 && steps.length > 1 ? (
                <div style={{ textAlign: 'center' }}>
                    <Button onClick={handleClickNext}>{t('actions:next-step')}</Button>
                </div>
            ) : current > 0 && current < steps.length - 1 ? (
                <div style={{ textAlign: 'center' }}>
                    <Space>
                        <Button onClick={handleClickBack}>{t('actions:back-step')}</Button>
                        <Button onClick={handleClickNext}>{t('actions:next-step')}</Button>
                    </Space>
                </div>
            ) : (
                <div style={{ textAlign: 'center' }}>
                    <Space>
                        {steps.length > 1 && (
                            <Button onClick={handleClickBack}>{t('actions:back-step')}</Button>
                        )}
                        <Button type="primary" loading={createLoading} onClick={onFinish}>
                            {t('actions:submit')}
                        </Button>
                        <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                    </Space>
                </div>
            )}
        </WrapperForm>
    );
};
