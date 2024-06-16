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
import { Button, Col, Input, InputNumber, Form, Select } from 'antd';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess, showInfo, usePatternIds, checkUndefinedValues } from '@helpers';
import {
    GetListOfOrdersQuery,
    SimpleGetAllStockOwnersQuery,
    UpdatePatternPathMutation,
    UpdatePatternPathMutationVariables,
    useGetListOfOrdersQuery,
    useListConfigsForAScopeQuery,
    useSimpleGetAllStockOwnersQuery,
    useUpdatePatternPathMutation
} from 'generated/graphql';

const { Option } = Select;
const { TextArea } = Input;

export type EditPatternPathFormProps = {
    patternPathID: string;
    details: any;
};

export const EditPatternPathForm: FC<EditPatternPathFormProps> = ({
    patternPathID,
    details
}: EditPatternPathFormProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [stockOwners, setStockOwners] = useState<any>();
    const [patternPathWithOrder, setPatternPathWithOrder] = useState<any>();
    const [maxOrder, setMaxOrder] = useState<number>(details.order);
    const [patternOption, setPattern] = useState<any>();
    const patternList = usePatternIds({}, 1, 100, null);
    const [statusTexts, setStatusTexts] = useState<any>();

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    //To render Simple stockOwners list
    const stockOwnerList = useSimpleGetAllStockOwnersQuery<
        Partial<SimpleGetAllStockOwnersQuery>,
        Error
    >(graphqlRequestClient);

    useEffect(() => {
        if (stockOwnerList) {
            setStockOwners(stockOwnerList?.data?.stockOwners?.results);
        }
    }, [stockOwnerList]);

    // //To render Simple status list
    const statusPatternPathTextList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'pattern_path_status'
    });
    useEffect(() => {
        if (statusPatternPathTextList) {
            setStatusTexts(statusPatternPathTextList?.data?.listConfigsForAScope);
        }
    }, [statusPatternPathTextList]);

    // //To render Simple pattern list
    useEffect(() => {
        if (patternList) {
            setPattern(patternList?.data?.patterns?.results);
        }
    }, [patternList]);

    //To render existing order list
    const orderList = useGetListOfOrdersQuery<Partial<GetListOfOrdersQuery>, Error>(
        graphqlRequestClient
    );
    useEffect(() => {
        setPatternPathWithOrder(orderList?.data?.patternPaths?.results);
        const receivedList = orderList?.data?.patternPaths?.results.map((e: any) => e.order);
        if (receivedList) {
            setMaxOrder(Math.max(...receivedList) + 1);
        }
    }, [orderList]);

    //rework order list
    function compare(a: any, b: any) {
        if (a.order < b.order) {
            return -1;
        }
        if (a.order > b.order) {
            return 1;
        }
        return 0;
    }
    const inCoursePatternPath = patternPathWithOrder
        ?.filter((e: any) => e.order !== null)
        .sort(compare);

    const { mutate, isLoading: updateLoading } = useUpdatePatternPathMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdatePatternPathMutation,
                _variables: UpdatePatternPathMutationVariables,
                _context: any
            ) => {
                router.push(`/pattern-paths`);
                //showSuccess(t('messages:success-updated'));
            },
            onError: () => {
                showError(t('messages:error-update-data'));
            }
        }
    );

    const updatePatternPath = ({ id, input }: UpdatePatternPathMutationVariables) => {
        mutate({ id, input });
    };

    // Call api to create new group
    const onFinish = () => {
        form.validateFields()
            .then(() => {
                checkUndefinedValues(form);
                // Here make api call of something else
                const formData = form.getFieldsValue(true);

                let patternPathToUpdate: any;
                let updateSide: number;
                if (formData.order > details.order && details.order !== null) {
                    patternPathToUpdate = inCoursePatternPath.filter(
                        (e: any) => e.order <= formData.order && e.order > details.order
                    );
                    updateSide = -1;
                } else if (details.order !== null) {
                    patternPathToUpdate = inCoursePatternPath.filter(
                        (e: any) => e.order >= formData.order && e.order < details.order
                    );
                    updateSide = 1;
                } else {
                    patternPathToUpdate = inCoursePatternPath.filter(
                        (e: any) => e.order >= formData.order
                    );
                    updateSide = 1;
                }
                if (patternPathToUpdate) {
                    patternPathToUpdate.forEach((e: any) =>
                        updatePatternPath({ id: e.id, input: { order: e.order + updateSide } })
                    );
                }
                //end part to update priorities on foreigners
                delete formData['stockOwner'];
                delete formData['statusText'];
                updatePatternPath({ id: patternPathID, input: formData });
            })
            .catch((err) => {
                showError(t('error-update-data'));
            });
    };

    useEffect(() => {
        const tmp_details = {
            ...details
        };
        delete tmp_details['id'];
        delete tmp_details['created'];
        delete tmp_details['createdBy'];
        delete tmp_details['modified'];
        delete tmp_details['modifiedBy'];
        form.setFieldsValue(tmp_details);
        if (updateLoading) {
            showInfo(t('messages:info-create-wip'));
            showSuccess(t('messages:success-updated'));
        }
    }, [updateLoading]);

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <Form.Item
                    label={t('common:name')}
                    name="name"
                    rules={[
                        { required: true, message: `${t('messages:error-message-empty-input')}` }
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item name="stockOwnerId" label={t('common:stock-owner')}>
                    <Select disabled>
                        {stockOwners?.map((stockOwner: any) => (
                            <Option key={stockOwner.id} value={stockOwner.id}>
                                {stockOwner.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item name="patternId" label={t('common:pattern')}>
                    <Select disabled>
                        {patternOption?.map((patterns: any) => (
                            <Option key={patterns.id} value={patterns.id}>
                                {patterns.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Col xs={24} xl={12}>
                    <Form.Item
                        label={t('d:order')}
                        name="order"
                        rules={[
                            {
                                required: true,
                                message: `${t('messages:error-message-empty-input')}`
                            }
                        ]}
                    >
                        <InputNumber min={1} max={maxOrder} />
                    </Form.Item>
                </Col>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Button type="primary" loading={updateLoading} onClick={onFinish}>
                    {t('actions:submit')}
                </Button>
            </div>
        </WrapperForm>
    );
};
