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
import { Button, Form, Modal, Space } from 'antd';
import { StepsPanel, StyledForm, WrapperForm, WrapperStepContent } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

import { useRouter } from 'next/router';

import { showError, showSuccess, showInfo, useUpdate, setUTCDateTime } from '@helpers';
import { FormGroup } from 'modules/Crud/submodules/FormGroup';
import { FilterFieldType, FormDataType, ModelType } from 'models/Models';
import moment from 'moment';

export interface IEditItemFormProps {
    id: string;
    details: any;
    dataModel: ModelType;
    routeAfterSuccess: string;
    editSteps: Array<Array<FilterFieldType>>;
    routeOnCancel?: string;
}

export const EditItemForm: FC<IEditItemFormProps> = (props: IEditItemFormProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const [current, setCurrent] = useState(0);
    const [form] = Form.useForm();
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

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
        props.dataModel.detailFields
    );

    useEffect(() => {
        if (!(updateResult && updateResult.data)) return;

        if (updateResult.success) {
            setUnsavedChanges(false);
            router.push(
                props.routeAfterSuccess.replace(
                    ':id',
                    updateResult.data[props.dataModel.endpoints.update]?.id
                )
            );
            showSuccess(t('messages:success-updated'));
        } else {
            showError(t('messages:error-update-data'));
        }
    }, [updateResult]);

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                mutate({
                    id: props.id,
                    input: { ...form.getFieldsValue(true) }
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
                Object.keys(tmp_details).forEach((key) => {
                    if (key == item.name && item.type == FormDataType.Calendar) {
                        tmp_details[key] = dayjs(setUTCDateTime(tmp_details[key]));
                    }
                });

                return item.name;
            });

            for (let i = 1; i < props.editSteps.length; i++) {
                allFields = allFields.concat(
                    props.editSteps[i].map((item) => {
                        Object.keys(tmp_details).forEach((key) => {
                            if (key == item.name && item.type == FormDataType.Calendar) {
                                tmp_details[key] = dayjs(setUTCDateTime(tmp_details[key]));
                            }
                        });

                        return item.name;
                    })
                );
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
                    onValuesChange={() => setUnsavedChanges(true)}
                >
                    <FormGroup inputs={props.editSteps[current]} />
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
