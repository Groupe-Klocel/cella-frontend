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
import { showError, showInfo, showSuccess, useArticleIds } from '@helpers';
import { AutoComplete, Button, Form, Input, InputNumber, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import {
    UpdateDeliveryLineMutation,
    UpdateDeliveryLineMutationVariables,
    useUpdateDeliveryLineMutation
} from 'generated/graphql';
import { debounce } from 'lodash';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import configs from '../../../../common/configs.json';

export type EditDeliveryLineFormProps = {
    deliveryLineId: string;
    details: any;
};

const { Option } = Select;

interface IOption {
    value: string;
    id: string;
}

export const EditDeliveryLineForm: FC<EditDeliveryLineFormProps> = ({
    deliveryLineId,
    details
}: EditDeliveryLineFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [form] = Form.useForm();

    const stockOwner = t('d:stockOwner');
    const article = t('common:article');
    const masterLine = t('d:masterLine');
    const childLine = t('d:childLine');
    const masterLineNb = t('d:masterLineNb');
    const delivery = t('common:delivery');
    const quantityToBePicked = t('d:quantityToBePicked');
    const reservation = t('d:reservation');
    const comment = t('d:comment');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const submit = t('actions:submit');
    const errorMessageUpdateData = t('messages:error-update-data');
    const successMessageUpdateData = t('messages:success-updated');
    const infoMessageUpdateData = t('messages:info-update-wip');

    const [aIdOptions, setAIdOptions] = useState<Array<IOption>>([]);
    const [aId, setAId] = useState<string>();
    const [articleName, setArticleName] = useState<string>('');

    // to render autocompleted articles list
    const articleData = useArticleIds({ name: `${articleName}%` }, 1, 100, null);

    useEffect(() => {
        const formValue = form.getFieldsValue(true);
        form.setFieldsValue({ ...formValue, articleId: aId, articleName: articleName });
    }, [aId]);

    useEffect(() => {
        if (articleData.data) {
            const newIdOpts: Array<IOption> = [];
            articleData.data.articles?.results.forEach(({ id, name }) => {
                if (form.getFieldsValue(true).articleId === id) {
                    setArticleName(name!);
                    setAId(id!);
                }
                newIdOpts.push({ value: name!, id: id! });
            });
            setAIdOptions(newIdOpts);
        }
    }, [articleName, articleData.data]);

    const onChange = (data: string) => {
        setArticleName(data);
    };

    // UPDATE Delivery Line
    const {
        mutate,
        isPending: updateLoading,
        data
    } = useUpdateDeliveryLineMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: UpdateDeliveryLineMutation,
            _variables: UpdateDeliveryLineMutationVariables,
            _context: any
        ) => {
            router.push(`/deliveries/lines/${data.updateDeliveryLine?.id}`);
            showSuccess(successMessageUpdateData);
        },
        onError: (err) => {
            showError(errorMessageUpdateData);
        }
    });

    const updateDeliveryLine = ({ id, input }: UpdateDeliveryLineMutationVariables) => {
        mutate({ id, input });
    };

    const onFinish = () => {
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                delete formData['stockOwner'];
                delete formData['delivery'];
                delete formData['article'];
                delete formData['stockOwnerName'];
                delete formData['deliveryName'];
                delete formData['articleName'];
                updateDeliveryLine({ input: formData, id: deliveryLineId });
            })
            .catch((err) => {
                showError(errorMessageUpdateData);
            });
    };

    useEffect(() => {
        const tmp_details = {
            ...details,
            stockOwnerName: details.stockOwner.name,
            articleName: details.article.name,
            deliveryName: details.delivery.name,
            deliveryId: details.deliveryId,
            stockOwnerId: details.stockOwnerId,
            status: configs.DELIVERY_STATUS_CREATED,
            toBeCubed: true
        };
        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];
        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(infoMessageUpdateData);
        }
    }, [updateLoading]);

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item name="stockOwnerName" label={stockOwner}>
                    <Input disabled />
                </Form.Item>
                <Form.Item label={delivery} name="deliveryName">
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    label={article}
                    name="articleName"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <AutoComplete
                        placeholder={`${t('messages:please-fill-letter-your', {
                            name: t('d:articleName')
                        })}`}
                        style={{ width: '100%' }}
                        options={aIdOptions}
                        value={articleName}
                        filterOption={(inputValue, option) =>
                            option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
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
                        onChange={onChange}
                    />
                </Form.Item>
                <Form.Item
                    label={quantityToBePicked}
                    name="quantityToBePicked"
                    rules={[{ required: true, message: errorMessageEmptyInput }]}
                >
                    <InputNumber />
                </Form.Item>
                <Form.Item label={masterLine} name="masterLine">
                    <InputNumber />
                </Form.Item>
                <Form.Item label={childLine} name="childLine">
                    <InputNumber />
                </Form.Item>
                <Form.Item label={masterLineNb} name="masterLineNumber">
                    <InputNumber />
                </Form.Item>
                <Form.Item label={reservation} name="reservation">
                    <Input />
                </Form.Item>
                <Form.Item label={comment} name="comment">
                    <Input />
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Button type="primary" loading={updateLoading} onClick={onFinish}>
                    {submit}
                </Button>
            </div>
        </WrapperForm>
    );
};
