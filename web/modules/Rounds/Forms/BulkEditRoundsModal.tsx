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
import useTranslation from 'next-translate/useTranslation';
import { DatePicker, Form, Modal, Select } from 'antd';
import { useEffect, useState } from 'react';
import {
    BulkUpdateRoundsMutation,
    BulkUpdateRoundsMutationVariables,
    useBulkUpdateRoundsMutation,
    useListParametersForAScopeQuery
} from 'generated/graphql';
import { showError, showSuccess, useRoundIds } from '@helpers';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import moment from 'moment';
import { FormOptionType } from 'models/Models';
import { PropertySafetyFilled } from '@ant-design/icons';

export interface IBulkEditRoundsRenderModalProps {
    visible: boolean;
    rows: any;
    showhideModal: () => void;
    refetch: boolean;
    setRefetch: () => void;
}

const BulkEditRoundsRenderModal = ({
    visible,
    showhideModal,
    rows,
    refetch,
    setRefetch
}: IBulkEditRoundsRenderModalProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const [priorityTexts, setPriorityTexts] = useState<Array<FormOptionType>>();
    const router = useRouter();
    const [form] = Form.useForm();
    const [isModalVisible, setIsModalVisible] = useState(visible);
    const errorMessageUpdateData = t('messages:error-update-data');
    const successMessageUpdateData = t('messages:success-updated');

    //To render Simple priorities list
    const priorityTextList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'priority'
    });

    useEffect(() => {
        if (priorityTextList) {
            const newModelTexts: Array<FormOptionType> = [];

            const cData = priorityTextList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newModelTexts.push({ key: parseInt(item.code), text: item.text });
                });
                setPriorityTexts(newModelTexts);
            }
        }
    }, [priorityTextList.data]);

    // UPDATE Round
    const {
        mutate,
        isLoading: updateLoading,
        data
    } = useBulkUpdateRoundsMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: BulkUpdateRoundsMutation,
            _variables: BulkUpdateRoundsMutationVariables,
            _context: any
        ) => {
            showSuccess(successMessageUpdateData);
            //router.reload();
            setRefetch();
        },
        onError: () => {
            showError(errorMessageUpdateData);
        }
    });

    const bulkUpdateRounds = ({ inputs, roundsId }: BulkUpdateRoundsMutationVariables) => {
        mutate({ inputs, roundsId });
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        showhideModal();
    };

    const onClickOk = () => {
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                bulkUpdateRounds({ inputs: formData, roundsId: rows.selectedRowKeys });
            })
            .catch((err) => {
                showError(errorMessageUpdateData);
            });
        showhideModal();
    };

    return (
        <Modal
            title={t('actions:edit-rounds')}
            visible={visible}
            onOk={onClickOk}
            onCancel={handleCancel}
        >
            <WrapperForm>
                <Form form={form} layout="vertical" scrollToFirstError>
                    <Form.Item label={t('d:priority')} name="priority">
                        <Select allowClear>
                            {priorityTexts?.map((option: FormOptionType) => (
                                <Select.Option key={option.key} value={option.key}>
                                    {option.text}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </WrapperForm>
        </Modal>
    );
};

export { BulkEditRoundsRenderModal };
