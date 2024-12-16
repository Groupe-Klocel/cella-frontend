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
import { FC, useEffect, useState } from 'react';
import { Button, Form, Modal, Space, DatePicker, Input, Select } from 'antd';
import { StepsPanel, WrapperForm, WrapperStepContent } from '@components';
import useTranslation from 'next-translate/useTranslation';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo, useUpdate, setUTCDateTime } from '@helpers';
import { FilterFieldType, FormDataType, ModelType, FormOptionType } from 'models/ModelsV2';
import moment from 'moment';
import {
    GetHandlingUnitContentByIdQuery,
    useGetHandlingUnitContentByIdQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';

require('moment/locale/fr'); // French

export interface IEditItemFormProps {
    id: string;
    details: any;
    dataModel: ModelType;
    routeAfterSuccess: string;
    editSteps: Array<Array<FilterFieldType>>;
    detailFields: Array<string>;
    routeOnCancel?: string;
    setFormInfos: (formInfos: any) => void;
    dependentFields: Array<string>;
    setIsDateType: any;
}

export const EditFeatureForm: FC<IEditItemFormProps> = (props: IEditItemFormProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const [current, setCurrent] = useState(0);
    const [form] = Form.useForm();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes
    const [imageData, setImageData] = useState<string | null>(null);
    const { graphqlRequestClient } = useAuth();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');

    moment.locale(router.locale);
    const localeData = moment.localeData();
    const localeDateTimeFormat = localeData.longDateFormat('L');

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

    const {
        isLoading: updateLoading,
        result: updateResult,
        mutate
    } = useUpdate(
        props.dataModel.resolverName,
        props.dataModel.endpoints.update,
        props.detailFields
    );

    const { data } = useGetHandlingUnitContentByIdQuery<GetHandlingUnitContentByIdQuery, Error>(
        graphqlRequestClient,
        {
            id: props.details.handlingUnitContentId
        }
    );

    useEffect(() => {
        if (!(updateResult && updateResult.data)) return;

        if (updateResult.success) {
            const updatedFeature = updateResult.data.updateHandlingUnitContentFeature;
            const relatedHUC = data?.handlingUnitContent;
            const fetchData = async () => {
                const res = await fetch(`/api/create-movement/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        trigger: 'updateContentFeature',
                        originData: {
                            articleId: relatedHUC?.articleId,
                            articleName: relatedHUC?.article.name,
                            stockStatus: relatedHUC?.stockStatus,
                            quantity: relatedHUC?.quantity,
                            locationId: relatedHUC?.handlingUnit.locationId,
                            locationName: relatedHUC?.handlingUnit.location?.name,
                            handlingUnitId: relatedHUC?.handlingUnitId,
                            handlingUnitName: relatedHUC?.handlingUnit.name,
                            stockOwnerId: relatedHUC?.stockOwner?.id,
                            stockOwnerName: relatedHUC?.stockOwner?.name,
                            handlingUnitContentId: relatedHUC?.id,
                            feature: {
                                code: props.details?.featureCode?.name,
                                value: props.details?.value,
                                id: props.id,
                                extraText2: props.details?.extraText2
                            }
                        },
                        destinationData: {
                            articleId: relatedHUC?.articleId,
                            articleName: relatedHUC?.article.name,
                            stockStatus: relatedHUC?.stockStatus,
                            quantity: relatedHUC?.quantity,
                            locationId: relatedHUC?.handlingUnit.locationId,
                            locationName: relatedHUC?.handlingUnit.location?.name,
                            handlingUnitId: relatedHUC?.handlingUnitId,
                            handlingUnitName: relatedHUC?.handlingUnit.name,
                            stockOwnerId: relatedHUC?.stockOwner?.id,
                            stockOwnerName: relatedHUC?.stockOwner?.name,
                            handlingUnitContentId: relatedHUC?.id,
                            feature: {
                                code: updatedFeature.featureCode.name,
                                value: updatedFeature.value,
                                id: props.id,
                                extraText2: updatedFeature.extraText2
                            }
                        }
                    })
                });
                if (res.ok) {
                    setUnsavedChanges(false);
                    router.push(
                        props.routeAfterSuccess.replace(
                            ':id',
                            updateResult.data[props.dataModel.endpoints.update]?.id
                        )
                    );
                    showSuccess(t('messages:success-updated'));
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
            showError(t('messages:error-update-data'));
        }
    }, [updateResult]);

    // function to reset data in case of fields dependencies
    const [changedFormValues, setChangedFormValues] = useState<any>({});
    const optionsList = props.editSteps[current][0].subOptions;

    useEffect(() => {
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
        if (form.getFieldsValue(true)) {
            const fields = form.getFieldsValue(true);
            const id = fields['featureCodeId'];
            optionsList?.forEach((item: any) => {
                if (item['key'] === id) {
                    props.setIsDateType.setIsDateType(item['type']);
                }
            });
        }
        if (form.getFieldsValue(true) && changedFormValues['featureCodeId']) {
            const id = changedFormValues['featureCodeId'];
            optionsList?.forEach((item: any) => {
                if (item['key'] === id) {
                    props.setIsDateType.setIsDateType(item['type']);
                }
            });
        }
    }, [props.dependentFields, changedFormValues, optionsList]);

    //check fields if contain undefined value and set field to null
    const checkUndefinedValues = () => {
        const tmpFieldsValues = { ...form.getFieldsValue(true) };

        for (const [key, value] of Object.entries(tmpFieldsValues)) {
            if (value === undefined) {
                tmpFieldsValues[key] = null;
            }
        }
        form.setFieldsValue(tmpFieldsValues);
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                checkUndefinedValues();
                let value = form.getFieldsValue(true)['value'];
                if (props.setIsDateType.isDateType) {
                    const valueFromField = form.getFieldsValue(true)['value'];
                    value = dayjs(valueFromField).format('YYYY-MM-DD');
                }
                const inputs = {
                    featureCodeId: form.getFieldsValue(true)['featureCodeId'],
                    value: value
                };

                mutate({
                    id: props.id,
                    input: { ...inputs }
                });
                setUnsavedChanges(false);
            })
            .catch((err) => {
                showError(t('errors:DB-000111'));
            });
    };
    useEffect(() => {
        const tmp_details = { ...props.details };

        if (props.editSteps.length > 0) {
            let allFields = props.editSteps[0].map((item) => {
                Object.keys(tmp_details).forEach((key: any) => {
                    if (key == item.name && item.type == FormDataType.Calendar) {
                        const dayjsDate = dayjs(tmp_details[key]);
                        if (tmp_details[key] && dayjsDate.isValid()) {
                            tmp_details[key] = dayjs(setUTCDateTime(tmp_details[key]));
                        } else {
                            tmp_details[key] = undefined;
                        }
                    }
                    if (key === 'logo') {
                        setImageData(tmp_details[key]);
                    }
                });

                return item.name;
            });

            for (let i = 1; i < props.editSteps.length; i++) {
                allFields = allFields.concat(
                    props.editSteps[i].map((item) => {
                        Object.keys(tmp_details).forEach((key) => {
                            if (key == item.name && item.type == FormDataType.Calendar) {
                                const dayjsDate = dayjs(tmp_details[key]);
                                if (tmp_details[key] && dayjsDate.isValid()) {
                                    tmp_details[key] = dayjs(setUTCDateTime(tmp_details[key]));
                                } else {
                                    tmp_details[key] = undefined;
                                }
                            }
                        });

                        return item.name;
                    })
                );
            }
            if (tmp_details['featureCode'] && tmp_details['featureCode']['dateType']) {
                const dayjsDate = dayjs(tmp_details['value']);
                if (tmp_details['value'] && dayjsDate.isValid()) {
                    tmp_details['value'] = dayjs(setUTCDateTime(tmp_details['value']));
                }
            }
            Object.keys(tmp_details).forEach((key) => {
                if (!allFields.includes(key)) {
                    delete tmp_details[key];
                }
            });
        }

        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(t('messages:info-update-wip'));
        }
    }, [updateLoading]);

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

    const steps = props.editSteps.map((element, index) => {
        return {
            title: `${t('common:step')} ` + (index + 1).toString(),
            key: index
        };
    });

    const handleClickBack = () => {
        setCurrent(current - 1);
    };

    const handleClickNext = () => {
        form.validateFields()
            .then(() => {
                // Here make api call of something else
                setCurrent(current + 1);
            })
            .catch((err) => console.log(err));
    };
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
                            {props.editSteps[current][0].subOptions?.map(
                                (option: FormOptionType) => (
                                    <Select.Option key={option.key} value={option.key}>
                                        {option.text}
                                    </Select.Option>
                                )
                            )}
                        </Select>
                    </Form.Item>
                    {props.setIsDateType.isDateType ? (
                        <Form.Item
                            label={t('d:value')}
                            name="value"
                            hidden={false}
                            rules={[{ required: true, message: errorMessageEmptyInput }]}
                            initialValue={dayjs()}
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
                        <Button type="primary" loading={updateLoading} onClick={onFinish}>
                            {t('actions:update')}
                        </Button>

                        <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                    </Space>
                </div>
            )}
        </WrapperForm>
    );
};
