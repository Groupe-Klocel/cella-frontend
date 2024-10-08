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
import { Form, Button, Space, Modal } from 'antd';
import { WrapperForm, StepsPanel, WrapperStepContent } from '@components';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';

import { showError, showSuccess, showInfo, useCreate } from '@helpers';
import { FilterFieldType, ModelType } from 'models/ModelsV2';
import { FormGroup } from './FormGroup';

export interface IAddItemFormProps {
    dataModel: ModelType;
    addSteps: Array<Array<FilterFieldType>>;
    routeAfterSuccess: string;
    extraData: any;
    routeOnCancel?: string;
    setFormInfos: (formInfos: any) => void;
    dependentFields: Array<any>;
}

export const AddItemForm: FC<IAddItemFormProps> = (props: IAddItemFormProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

    const [current, setCurrent] = useState(0);
    const [form] = Form.useForm();

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
            return (e.returnValue = t('messages:confirm-leaving-page')); //deprecated but still required for some old browsers
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

    useEffect(() => {
        if (!(createResult && createResult.data)) return;

        if (createResult.success) {
            router.push(
                props.routeAfterSuccess.replace(
                    ':id',
                    createResult.data[props.dataModel.endpoints.create]?.id
                )
            );
            showSuccess(t('messages:success-created'));
        } else {
            showError(t('messages:error-creating-data'));
        }
    }, [createResult]);

    // function to reset data in case of fields dependencies
    const [changedFormValues, setChangedFormValues] = useState<any>({});
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
    }, [props.dependentFields, changedFormValues]);

    const onFinish = () => {
        Modal.confirm({
            title: t('messages:create-confirm'),
            onOk: () => {
                form.validateFields()
                    .then(() => {
                        mutate({
                            input: { ...form.getFieldsValue(true), ...props.extraData }
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
                    <FormGroup inputs={props.addSteps[current]} setValues={form.setFieldsValue} />
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
