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
import { Button, Input, Form, Modal } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { showError, showSuccess } from '@helpers';
import { gql } from 'graphql-request';
import { useAppState } from 'context/AppContext';
import SelectInput from 'components/common/smart/Form/MainInputs/SelectInput';

export interface ISingleItemProps {
    appointmentId: string | any;
    appointmentName: string | any;
    stockOwnerId: string | any;
    stockOwnerName: string | any;
    thirdPartyId: any;
    routeOnCancel?: string;
}

export const AddAppointmentLineForm = (props: ISingleItemProps) => {
    const { t } = useTranslation('common');
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const { parameters, configs } = useAppState();
    const [createLoading, setCreateLoading] = useState(false);
    const [loads, setLoads] = useState([]);
    const [thirdParties, setThirdParties] = useState<any[]>([]);

    const [, setAllSubOptions] = useState<any>([]);
    const [, setFormInfos] = useState<any>({});

    // TEXTS TRANSLATION ( REFACTORING POSSIBLE / EXPORT / DON'T KNOW YET )
    const thirdParty = t('third-party');
    const loadsLabel = t('d:load');
    const comment = t('d:comment');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const submit = t('actions:submit');
    // END TEXTS TRANSLATION

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    const configsParamsCodes = useMemo(() => {
        const findCodeByScopeAndValue = (items: any[], scope: string, value: string) => {
            return items.find((item: any) => item.scope === scope && item.value === value)?.code;
        };
        const loadStatusCreated = findCodeByScopeAndValue(configs, 'load_status', 'Created');
        return {
            loadStatusCreated
        };
    }, [configs, parameters]);

    const fetchThirdParties = async () => {
        const thirdPartiesGQL = gql`
            query thirdParties {
                thirdParties {
                    results {
                        id
                        name
                    }
                }
            }
        `;

        const thirdParties_result = await graphqlRequestClient.request(thirdPartiesGQL, {});

        return thirdParties_result;
    };

    const createAppointmentLine = async (input: any) => {
        const createAppointmentLineGQL = gql`
            mutation createAppointmentLine($input: CreateAppointmentLineInput!) {
                createAppointmentLine(input: $input) {
                    id
                    loadId
                    load {
                        id
                        name
                    }
                }
            }
        `;

        const appointmentLineVariables = {
            input: {
                ...input,
                appointmentId: props.appointmentId,
                stockOwnerId: props.stockOwnerId
            }
        };

        const appointmentLine_result = await graphqlRequestClient.request(
            createAppointmentLineGQL,
            appointmentLineVariables
        );

        return appointmentLine_result;
    };

    const getLoadsWithStockOwner = async (stockOwnerId: string | undefined) => {
        const loadsGQL = gql`
            query loads($advancedFilters: [LoadAdvancedSearchFilters!]) {
                loads(advancedFilters: $advancedFilters) {
                    results {
                        id
                        name
                        appointmentLines {
                            id
                        }
                    }
                }
            }
        `;

        const loadListVariables = {
            advancedFilters: [
                {
                    filter: [
                        { field: { stockOwnerId: stockOwnerId }, searchType: 'EQUAL' },
                        { field: { stockOwnerId: '**null**' }, searchType: 'EQUAL' }
                    ]
                },
                {
                    filter: {
                        field: { status: configsParamsCodes.loadStatusCreated },
                        searchType: 'INFERIOR_OR_EQUAL'
                    }
                }
            ]
        };

        const loadList_result = await graphqlRequestClient.request(loadsGQL, loadListVariables);

        return loadList_result.loads.results;
    };

    useEffect(() => {
        const getLoads = async () => {
            if (!props.stockOwnerId) return;
            try {
                const results = await getLoadsWithStockOwner(props.stockOwnerId);
                setLoads(results.filter((load: any) => load.appointmentLines.length === 0));
            } catch (error) {
                console.error('Failed to fetch loads:', error);
            }
        };
        getLoads();
    }, [props.stockOwnerId]);

    useEffect(() => {
        const getThirdParties = async () => {
            try {
                const result = await fetchThirdParties();
                if (result?.thirdParties?.results) {
                    setThirdParties(result.thirdParties.results);
                }
            } catch (error) {
                console.error('Failed to fetch third parties:', error);
            }
        };
        getThirdParties();
    }, []);

    const formattedLoads = useMemo(() => {
        return loads.map((load: any) => ({
            key: load.id,
            text: load.name
        }));
    }, [loads]);

    const loadSelectItem = useMemo(() => {
        return {
            name: 'loadId',
            displayName: loadsLabel,
            rules: [{ required: true, message: errorMessageEmptyInput }]
        };
    }, [formattedLoads]);

    const loadSubOptions = useMemo(() => {
        return [
            {
                loadId: formattedLoads
            }
        ];
    }, [formattedLoads]);

    const formattedThirdParties = useMemo(() => {
        return thirdParties.map((tp: any) => ({
            key: tp.id,
            text: tp.name
        }));
    }, [thirdParties]);

    const thirdPartySelectItem = useMemo(() => {
        return {
            name: 'thirdPartyId',
            displayName: thirdParty,
            rules: [{ required: true, message: errorMessageEmptyInput }]
        };
    }, [formattedThirdParties]);

    const thirdPartySubOptions = useMemo(() => {
        return [{ thirdPartyId: formattedThirdParties }];
    }, [formattedThirdParties]);

    const onFinish = () => {
        setCreateLoading(true);
        form.validateFields()
            .then(async () => {
                // Here make api call of something else
                const formData = form.getFieldsValue(true);
                await createAppointmentLine(formData);
                showSuccess(t('messages:success-creating-data'));
                setCreateLoading(false);
                router.push(`/appointments/${props.appointmentId}`);
            })
            .catch((err) => {
                setCreateLoading(false);
                showError(t('messages:error-creating-data'));
            });
    };

    const onCancel = () => {
        Modal.confirm({
            title: t('messages:confirm-leaving-page'),
            onOk: () => {
                props.routeOnCancel ? router.push(props.routeOnCancel) : router.back();
            },
            okText: t('common:bool-yes'),
            cancelText: t('common:bool-no')
        });
    };

    return (
        <WrapperForm>
            <Form form={form} layout="vertical" scrollToFirstError>
                <SelectInput
                    item={loadSelectItem}
                    defaultSubOptions={loadSubOptions}
                    setValues={form.setFieldsValue}
                    setAllSubOptions={setAllSubOptions}
                    setFormInfos={setFormInfos}
                    key="select-load-input"
                />
                <SelectInput
                    item={thirdPartySelectItem}
                    defaultSubOptions={thirdPartySubOptions}
                    setValues={form.setFieldsValue}
                    setAllSubOptions={setAllSubOptions}
                    setFormInfos={setFormInfos}
                    key="select-third-party-input"
                />
                <Form.Item label={comment} name="comment">
                    <Input />
                </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
                <Button type="primary" loading={createLoading} onClick={onFinish}>
                    {submit}
                </Button>
                <Button onClick={onCancel}>{t('actions:cancel')}</Button>
            </div>
        </WrapperForm>
    );
};
