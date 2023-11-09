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
//DESCRIPTION: select manually or automatically one location in a list of locations according to their level

import { WrapperForm, StyledForm, StyledFormItem, RadioButtons } from '@components';
import { LsIsSecured, extractGivenConfigsParams, showError } from '@helpers';
import { Form, Select } from 'antd';
import { useAuth } from 'context/AuthContext';
import {
    useParametersQuery,
    ParametersQuery,
    useSimpleGetAllBuildingsQuery,
    SimpleGetAllBuildingsQuery,
    useSimpleGetAllBLocksQuery,
    SimpleGetAllBLocksQuery
} from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState } from 'react';
import configs from '../../../../../common/configs.json';
import { gql } from 'graphql-request';
import CameraScanner from 'modules/Common/CameraScanner';

export interface ISelectBlockProps {
    process: string;
    stepNumber: number;
    trigger: { [label: string]: any };
    buttons: { [label: string]: any };
}

export const SelectBlockForm = ({
    process,
    stepNumber,
    trigger: { triggerRender, setTriggerRender },
    buttons
}: ISelectBlockProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const storage = LsIsSecured();
    const storedObject = JSON.parse(storage.get(process) || '{}');

    // TYPED SAFE ALL
    const [blocks, setBlocks] = useState<Array<any>>();

    //Pre-requisite: initialize current step
    useEffect(() => {
        if (storedObject.currentStep < stepNumber) {
            //check workflow direction and assign current step accordingly
            storedObject[`step${stepNumber}`] = { previousStep: storedObject.currentStep };
            storedObject.currentStep = stepNumber;
        }
        storage.set(process, JSON.stringify(storedObject));
    }, []);

    //camera scanner section
    const [form] = Form.useForm();
    const [camData, setCamData] = useState();

    useEffect(() => {
        if (camData) {
            if (blocks?.some((option) => option.text === camData)) {
                form.setFieldsValue({ returns: camData });
            } else {
                showError(t('messages:unexpected-scanned-item'));
            }
        }
    }, [camData, blocks]);

    const handleCleanData = () => {
        form.resetFields();
        setCamData(undefined);
    };
    // end camera scanner section

    //SelectBlock-1: retrieve customer_building parameter
    const [customerBuilding, setCustomerBuilding] = useState<any>();
    const defaultDeclarativeParameter = useParametersQuery<Partial<ParametersQuery>, Error>(
        graphqlRequestClient,
        {
            filters: { scope: ['global'], code: ['CLIENT_BUILDING'] }
        }
    );

    useEffect(() => {
        if (defaultDeclarativeParameter) {
            const defaultDeclarativeData =
                defaultDeclarativeParameter?.data?.parameters?.results[0];
            setCustomerBuilding(defaultDeclarativeData);
        }
    }, [defaultDeclarativeParameter.data]);

    //SelectRound-3: retrieve related building if any
    const [buildingId, setBuildingId] = useState<any>();

    const buildingConfigsToFilterOn = extractGivenConfigsParams(configs, 'building_status', {
        include: ['in_progress']
    });

    const customerBuildingInfo = useSimpleGetAllBuildingsQuery<
        Partial<SimpleGetAllBuildingsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: { status: buildingConfigsToFilterOn, name: customerBuilding?.value },
        orderBy: null,
        page: 1,
        itemsPerPage: 100
    });

    useEffect(() => {
        if (customerBuildingInfo) {
            setBuildingId(customerBuildingInfo.data?.buildings?.results[0]?.id);
        }
    }, [customerBuildingInfo.data]);

    //SelectBlock-2: retrieve blocks choices for select
    const blocksList = useSimpleGetAllBLocksQuery<Partial<SimpleGetAllBLocksQuery>, Error>(
        graphqlRequestClient,
        {
            filters: { buildingId: buildingId },
            orderBy: null,
            page: 1,
            itemsPerPage: 1000
        }
    );

    useEffect(() => {
        if (blocksList) {
            const newTypeTexts: Array<any> = [];
            const tmp = blocksList?.data?.blocks?.results;
            if (tmp) {
                tmp.forEach((item) => {
                    newTypeTexts.push({ key: item.id, text: item.name });
                });
                setBlocks(newTypeTexts);
            }
        }
    }, [blocksList.data]);

    //SelectBlock-2a: retrieve chosen level from select and set information
    const onFinish = async (values: any) => {
        const data: { [label: string]: any } = {};
        const query = gql`
            query block($id: String!) {
                block(id: $id) {
                    id
                    name
                    building {
                        id
                        name
                    }
                    locations {
                        id
                        name
                        handlingUnits {
                            id
                            name
                            handlingUnitContents {
                                id
                                quantity
                                articleId
                                article {
                                    id
                                    name
                                }
                                stockOwnerId
                                stockOwner {
                                    id
                                    name
                                }
                                handlingUnitContentFeatures {
                                    featureCode {
                                        id
                                        name
                                    }
                                    value
                                }
                                handlingUnitId
                                handlingUnit {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            }
        `;

        const variables = {
            id: values.blocks
        };
        const selectedBlock = await graphqlRequestClient.request(query, variables);
        data['block'] = selectedBlock.block;
        data['handlingUnitContents'] = selectedBlock.block.locations.flatMap((location: any) =>
            location.handlingUnits.flatMap((hu: any) => hu.handlingUnitContents)
        );

        /* BEGIN - get RET_ALBI_LOCATION location_id */
        let defaultReturnLocationId;

        const defaultReturnLocationParameterQuery = gql`
            query parameters($filters: ParameterSearchFilters) {
                parameters(filters: $filters) {
                    results {
                        code
                        value
                        scope
                    }
                }
            }
        `;

        const defaultReturnLocationParameterVariables = {
            filters: { scope: 'inbound', code: 'RET_ALBI_LOCATION' }
        };

        const defaultReturnLocationParameterResult = await graphqlRequestClient.request(
            defaultReturnLocationParameterQuery,
            defaultReturnLocationParameterVariables
        );
        const defaultReturnLocationName =
            defaultReturnLocationParameterResult?.parameters.results[0].value;

        // retrieve default return location id
        if (defaultReturnLocationName) {
            const locationsQuery = gql`
                query locations($filters: LocationSearchFilters) {
                    locations(filters: $filters) {
                        results {
                            id
                            name
                        }
                    }
                }
            `;

            const locationsVariables = {
                filters: { name: defaultReturnLocationName }
            };

            const locations = await graphqlRequestClient.request(
                locationsQuery,
                locationsVariables
            );

            data['finalLocation'] = locations?.locations.results[0];
        }
        /* END - get RET_ALBI_LOCATION location_id */

        storedObject[`step${stepNumber}`] = {
            ...storedObject[`step${stepNumber}`],
            data
        };
        storage.set(process, JSON.stringify(storedObject));
        setTriggerRender(!triggerRender);
    };

    //SelectBlock-2b: handle back to previous step settings
    const onBack = () => {
        setTriggerRender(!triggerRender);
        delete storedObject[`step${storedObject[`step${stepNumber}`].previousStep}`].data;
        storedObject.currentStep = storedObject[`step${stepNumber}`].previousStep;
        storage.set(process, JSON.stringify(storedObject));
    };

    return (
        <WrapperForm>
            <StyledForm
                name="basic"
                layout="vertical"
                onFinish={onFinish}
                autoComplete="off"
                scrollToFirstError
                size="small"
                form={form}
            >
                <StyledFormItem
                    label={t('common:customer')}
                    name="blocks"
                    rules={[{ required: true, message: t('messages:error-message-empty-input') }]}
                >
                    <Select
                        style={{ height: '20px', marginBottom: '5px' }}
                        showSearch
                        filterOption={(inputValue, option) =>
                            option!.text === form.getFieldValue('returns') ||
                            option!.props.children
                                .toUpperCase()
                                .indexOf(inputValue.toUpperCase()) !== -1
                        }
                        allowClear
                    >
                        {blocks?.map((option: any) => (
                            <Select.Option key={option.key} value={option.key}>
                                {option.text}
                            </Select.Option>
                        ))}
                    </Select>
                </StyledFormItem>
                <CameraScanner camData={{ setCamData }} handleCleanData={handleCleanData} />
                <RadioButtons input={{ ...buttons }} output={{ onBack }}></RadioButtons>
            </StyledForm>
        </WrapperForm>
    );
};
