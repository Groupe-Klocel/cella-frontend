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
import { Card, Col, Divider, Form, InputNumber, Modal, Row, Select } from 'antd';
import { useEffect, useState } from 'react';
import {
    DataQueryType,
    removeDuplicatesAndSort,
    showError,
    showSuccess,
    useLocationIds
} from '@helpers';
import {
    SimpleGetAllBLocksQuery,
    useListParametersForAScopeQuery,
    useSimpleGetAllBLocksQuery
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import Text from 'antd/lib/typography/Text';
import { FormOptionType } from 'models/ModelsV2';
import { useRouter } from 'next/router';
import { gql } from 'graphql-request';

const { Option } = Select;

export interface IPrintLocationsModalFormProps {
    id: string | undefined;
    showModal: any;
}

const PrintLocationsModalForm = ({ showModal, id }: IPrintLocationsModalFormProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { graphqlRequestClient } = useAuth();
    const errorMessageUpdateData = t('messages:error-update-data');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const [blocks, setBlocks] = useState<any>();
    const [locations, setLocations] = useState<DataQueryType>();
    const router = useRouter();
    const [printers, setPrinters] = useState<Array<FormOptionType>>();
    const [printLanguage, setPrintLanguage] = useState<string>();

    // Get default printing language
    const defaultPrintLanguage = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'global',
        code: 'default_print_language'
    });

    useEffect(() => {
        if (defaultPrintLanguage) {
            setPrintLanguage(defaultPrintLanguage.data?.listParametersForAScope[0].text);
        }
    }, [defaultPrintLanguage.data]);

    //List available blocks
    //To render simple blocks list for attached block selection (id and name without any filter)
    const blocksList = useSimpleGetAllBLocksQuery<Partial<SimpleGetAllBLocksQuery>, Error>(
        graphqlRequestClient,
        {
            itemsPerPage: 1000
        }
    );

    useEffect(() => {
        if (blocksList) {
            setBlocks(blocksList?.data?.blocks?.results);
        }
    }, [blocksList]);
    //chose block
    const [blockToSearch, setBlockToSearch] = useState<any>(null);
    const onBlockChange = (id: string, options: any) => {
        setBlockToSearch(id);
        form.setFieldsValue({ blockName: options.title });
    };
    const search = blockToSearch ? { blockId: blockToSearch! } : undefined;
    const { data: locationsData } = useLocationIds(search, 1, 1000, null);

    //set reference Locations list
    useEffect(() => {
        if (locationsData && blockToSearch) {
            setLocations(locationsData?.locations);
        }
    }, [locationsData, blockToSearch]);

    //onChange for each location property select
    const onInputChange = (value: string, source: string, setState: any) => {
        switch (source) {
            case 'origin':
                setState(value);
                break;
            case 'final':
                setState(value);
                break;
            default:
                console.log(`No source provided.`);
        }
    };
    //useStates to take the values to search at each choice
    const [originAisleToSearch, setOriginAisleToSearch] = useState<string | undefined>(undefined);
    const [finalAisleToSearch, setFinalAisleToSearch] = useState<string | undefined>(undefined);
    const [originColumnToSearch, setOriginColumnToSearch] = useState<string | undefined>(undefined);
    const [finalColumnToSearch, setFinalColumnToSearch] = useState<string | undefined>(undefined);
    const [originLevelToSearch, setOriginLevelToSearch] = useState<string | undefined>(undefined);
    const [finalLevelToSearch, setFinalLevelToSearch] = useState<string | undefined>(undefined);

    //generic filter function to generate list of values provided in select options
    function filterAndMap(locations: any, setOptions: any, filters: any, returnedData: string) {
        const dataSet = locations?.results.filter((e: any) => {
            for (const key in filters) {
                if (filters.hasOwnProperty(key)) {
                    if (filters[key] && e[key] !== filters[key]) {
                        return false;
                    }
                }
            }
            return true;
        });
        const newOpts: Array<string> = dataSet.map((e: any) => {
            return e[returnedData];
        });
        setOptions(removeDuplicatesAndSort(newOpts));
    }

    //list aisles
    const [aisleValueOptions, setAisleValueOptions] = useState<any>(null);
    useEffect(() => {
        if (locations) {
            const newOpts: Array<any> = locations.results.map(({ aisle }) => {
                return aisle!;
            });
            setAisleValueOptions(removeDuplicatesAndSort(newOpts));
        }
    }, [locations]);

    //list columns
    const [originColumnValueOptions, setOriginColumnValueOptions] = useState<any>(null);
    const [finalColumnValueOptions, setFinalColumnValueOptions] = useState<any>(null);
    useEffect(() => {
        if (originAisleToSearch) {
            filterAndMap(
                locations,
                setOriginColumnValueOptions,
                { aisle: originAisleToSearch },
                'column'
            );
        }
        if (finalAisleToSearch) {
            filterAndMap(
                locations,
                setFinalColumnValueOptions,
                { aisle: finalAisleToSearch },
                'column'
            );
        }
    }, [originAisleToSearch, finalAisleToSearch]);

    //List levels
    const [originLevelValueOptions, setOriginLevelValueOptions] = useState<any>(null);
    const [finalLevelValueOptions, setFinalLevelValueOptions] = useState<any>(null);
    useEffect(() => {
        if (originAisleToSearch && originColumnToSearch) {
            filterAndMap(
                locations,
                setOriginLevelValueOptions,
                {
                    aisle: originAisleToSearch,
                    column: originColumnToSearch
                },
                'level'
            );
        }
        if (finalAisleToSearch && finalColumnToSearch) {
            filterAndMap(
                locations,
                setFinalLevelValueOptions,
                { aisle: finalAisleToSearch, column: finalColumnToSearch },
                'level'
            );
        }
    }, [originAisleToSearch, finalAisleToSearch, originColumnToSearch, finalColumnToSearch]);

    //List positions
    const [originPositionValueOptions, setOriginPositionValueOptions] = useState<any>(null);
    const [finalPositionValueOptions, setFinalPositionValueOptions] = useState<any>(null);
    useEffect(() => {
        if (originAisleToSearch && originColumnToSearch && originLevelToSearch) {
            filterAndMap(
                locations,
                setOriginPositionValueOptions,
                {
                    aisle: originAisleToSearch,
                    column: originColumnToSearch,
                    level: originLevelToSearch
                },
                'position'
            );
        }
        if (finalAisleToSearch && finalColumnToSearch && finalLevelToSearch) {
            filterAndMap(
                locations,
                setFinalPositionValueOptions,
                {
                    aisle: finalAisleToSearch,
                    column: finalColumnToSearch,
                    level: finalLevelToSearch
                },
                'position'
            );
        }
    }, [
        originAisleToSearch,
        finalAisleToSearch,
        originColumnToSearch,
        finalColumnToSearch,
        originLevelToSearch,
        finalLevelToSearch
    ]);

    // Get all printers
    const printerList = useListParametersForAScopeQuery(graphqlRequestClient, {
        language: router.locale,
        scope: 'printer'
    });
    useEffect(() => {
        if (printerList) {
            const newPrinters: Array<FormOptionType> = [];

            const cData = printerList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newPrinters.push({ key: item.code, text: item.text });
                });
                setPrinters(newPrinters);
            }
        }
    }, [printerList.data]);

    const printData = async (inputForPrinting: any, copies: number, printer: string) => {
        const documentMutation = gql`
            mutation generateDocument(
                $documentName: String!
                $language: String!
                $printer: String
                $context: JSON!
            ) {
                generateDocument(
                    documentName: $documentName
                    language: $language
                    printer: $printer
                    context: $context
                ) {
                    __typename
                    ... on RenderedDocument {
                        url
                    }
                    ... on TemplateDoesNotExist {
                        message
                    }
                    ... on TemplateError {
                        message
                    }
                    ... on MissingContext {
                        message
                    }
                }
            }
        `;

        const documentVariables = {
            documentName: 'K_LocationLabel',
            language: printLanguage,
            printer,
            context: { ...inputForPrinting, copies }
        };

        const documentResult = await graphqlRequestClient.request(
            documentMutation,
            documentVariables
        );

        console.log('documentResult', documentResult);

        if (documentResult.generateDocument.__typename !== 'RenderedDocument') {
            showError(t('messages:error-print-data'));
        } else {
            printer
                ? showSuccess(t('messages:success-print-data'))
                : window.open(documentResult.generateDocument.url, '_blank');
        }
    };

    const handleCancel = () => {
        showModal.setShowRangeLocationsModal(false);
    };

    const onClickOk = () => {
        form.validateFields()
            .then(() => {
                const formData = form.getFieldsValue(true);
                const {
                    blockName,
                    originAisle,
                    originColumn,
                    originLevel,
                    originPosition,
                    finalAisle,
                    finalColumn,
                    finalLevel,
                    finalPosition
                } = formData;
                const originLocationInput = {
                    blockName: blockName,
                    aisle: originAisle,
                    column: originColumn,
                    level: originLevel,
                    position: originPosition
                };

                const finalLocationInput = {
                    blockName: blockName,
                    aisle: finalAisle,
                    column: finalColumn,
                    level: finalLevel,
                    position: finalPosition
                };
                printData(
                    { originLocationInput, finalLocationInput },
                    formData.copies,
                    formData.printer
                );
            })
            .catch((err) => {
                showError(errorMessageUpdateData);
            });
    };

    return (
        <Modal
            title={t('actions:chose-locations-range')}
            visible={showModal.showRangeLocationsModal}
            onOk={onClickOk}
            onCancel={handleCancel}
            width={800}
            bodyStyle={{ padding: '16px 24px' }}
        >
            <Form form={form} layout="vertical" scrollToFirstError size="small">
                <Row>
                    <Col span={24}>
                        <Form.Item
                            label={t('d:associatedBlock')}
                            name="blockId"
                            style={{ marginBottom: 5 }}
                            rules={[
                                {
                                    required: true,
                                    message: `${t('messages:error-message-select-a', {
                                        name: t('d:block')
                                    })}`
                                }
                            ]}
                        >
                            <Select
                                placeholder={`${t('messages:please-select-a', {
                                    name: t('d:block')
                                })}`}
                                onChange={onBlockChange}
                                allowClear
                            >
                                {blocks?.map((block: any) => (
                                    <Option key={block.id} value={block.id} title={block.name}>
                                        {block.name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
                <Row>
                    <Col span={12} style={{ paddingRight: '8px' }}>
                        <Card type="inner" title="From:">
                            <Form.Item
                                label={t('d:originAisle')}
                                name="originAisle"
                                style={{ marginBottom: 5 }}
                                rules={[
                                    {
                                        required: true,
                                        message: `${t('messages:error-message-select-an', {
                                            name: t('d:aisle')
                                        })}`
                                    }
                                ]}
                            >
                                <Select
                                    placeholder={`${t('messages:please-select-an', {
                                        name: t('d:aisle')
                                    })}`}
                                    onChange={(value: string) => {
                                        onInputChange(value, 'origin', setOriginAisleToSearch);
                                    }}
                                    allowClear
                                    disabled={blockToSearch ? false : true}
                                >
                                    {aisleValueOptions?.map((aisle: any) => (
                                        <Option key={aisle} value={aisle}>
                                            {aisle}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                label={t('d:originColumn')}
                                name="originColumn"
                                style={{ marginBottom: 5 }}
                                rules={[
                                    {
                                        required: true,
                                        message: `${t('messages:error-message-select-a', {
                                            name: t('d:column')
                                        })}`
                                    }
                                ]}
                            >
                                <Select
                                    placeholder={`${t('messages:please-select-a', {
                                        name: t('d:column')
                                    })}`}
                                    onChange={(value: string) => {
                                        onInputChange(value, 'origin', setOriginColumnToSearch);
                                    }}
                                    allowClear
                                    disabled={blockToSearch && originAisleToSearch ? false : true}
                                >
                                    {originColumnValueOptions?.map((column: any) => (
                                        <Option key={column} value={column}>
                                            {column}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                label={t('d:originLevel')}
                                name="originLevel"
                                style={{ marginBottom: 5 }}
                                rules={[
                                    {
                                        required: true,
                                        message: `${t('messages:error-message-select-a', {
                                            name: t('d:level')
                                        })}`
                                    }
                                ]}
                            >
                                <Select
                                    placeholder={`${t('messages:please-select-a', {
                                        name: t('d:level')
                                    })}`}
                                    onChange={(value: string) => {
                                        onInputChange(value, 'origin', setOriginLevelToSearch);
                                    }}
                                    allowClear
                                    disabled={
                                        blockToSearch && originAisleToSearch && originColumnToSearch
                                            ? false
                                            : true
                                    }
                                >
                                    {originLevelValueOptions?.map((level: any) => (
                                        <Option key={level} value={level}>
                                            {level}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                label={t('d:originPosition')}
                                name="originPosition"
                                style={{ marginBottom: 5 }}
                                rules={[
                                    {
                                        required: true,
                                        message: `${t('messages:error-message-select-a', {
                                            name: t('d:position')
                                        })}`
                                    }
                                ]}
                            >
                                <Select
                                    placeholder={`${t('messages:please-select-a', {
                                        name: t('d:position')
                                    })}`}
                                    allowClear
                                    disabled={
                                        blockToSearch &&
                                        originAisleToSearch &&
                                        originColumnToSearch &&
                                        originLevelToSearch
                                            ? false
                                            : true
                                    }
                                >
                                    {originPositionValueOptions?.map((position: any) => (
                                        <Option key={position} value={position}>
                                            {position}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Card>
                    </Col>
                    <Col span={12} style={{ paddingLeft: '8px' }}>
                        <Card type="inner" title="To:">
                            <Form.Item
                                label={t('d:finalAisle')}
                                name="finalAisle"
                                style={{ marginBottom: 5 }}
                                rules={[
                                    {
                                        required: true,
                                        message: `${t('messages:error-message-select-an', {
                                            name: t('d:aisle')
                                        })}`
                                    }
                                ]}
                            >
                                <Select
                                    placeholder={`${t('messages:please-select-an', {
                                        name: t('d:aisle')
                                    })}`}
                                    onChange={(value: string) => {
                                        onInputChange(value, 'final', setFinalAisleToSearch);
                                    }}
                                    allowClear
                                    disabled={blockToSearch ? false : true}
                                >
                                    {aisleValueOptions?.map((aisle: any) => (
                                        <Option key={aisle} value={aisle}>
                                            {aisle}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                label={t('d:finalColumn')}
                                name="finalColumn"
                                style={{ marginBottom: 5 }}
                                rules={[
                                    {
                                        required: true,
                                        message: `${t('messages:error-message-select-a', {
                                            name: t('d:column')
                                        })}`
                                    }
                                ]}
                            >
                                <Select
                                    placeholder={`${t('messages:please-select-a', {
                                        name: t('d:column')
                                    })}`}
                                    onChange={(value: string) => {
                                        onInputChange(value, 'final', setFinalColumnToSearch);
                                    }}
                                    allowClear
                                    disabled={blockToSearch && finalAisleToSearch ? false : true}
                                >
                                    {finalColumnValueOptions?.map((column: any) => (
                                        <Option key={column} value={column}>
                                            {column}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                label={t('d:finalLevel')}
                                name="finalLevel"
                                style={{ marginBottom: 5 }}
                                rules={[
                                    {
                                        required: true,
                                        message: `${t('messages:error-message-select-a', {
                                            name: t('d:level')
                                        })}`
                                    }
                                ]}
                            >
                                <Select
                                    placeholder={`${t('messages:please-select-a', {
                                        name: t('d:level')
                                    })}`}
                                    onChange={(value: string) => {
                                        onInputChange(value, 'final', setFinalLevelToSearch);
                                    }}
                                    allowClear
                                    disabled={
                                        blockToSearch && finalAisleToSearch && finalColumnToSearch
                                            ? false
                                            : true
                                    }
                                >
                                    {finalLevelValueOptions?.map((level: any) => (
                                        <Option key={level} value={level}>
                                            {level}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                label={t('d:finalPosition')}
                                name="finalPosition"
                                style={{ marginBottom: 5 }}
                                rules={[
                                    {
                                        required: true,
                                        message: `${t('messages:error-message-select-a', {
                                            name: t('d:position')
                                        })}`
                                    }
                                ]}
                            >
                                <Select
                                    placeholder={`${t('messages:please-select-a', {
                                        name: t('d:position')
                                    })}`}
                                    allowClear
                                    disabled={
                                        blockToSearch &&
                                        finalAisleToSearch &&
                                        finalColumnToSearch &&
                                        finalLevelToSearch
                                            ? false
                                            : true
                                    }
                                >
                                    {finalPositionValueOptions?.map((position: any) => (
                                        <Option key={position} value={position}>
                                            {position}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Card>
                    </Col>
                </Row>
                <Divider style={{ margin: '12px 0px' }} />
                <Row>
                    <Form.Item
                        label={t('d:number-of-copies')}
                        name="copies"
                        rules={[{ required: true, message: errorMessageEmptyInput }]}
                        initialValue={1}
                    >
                        <InputNumber min={1} precision={0} />
                    </Form.Item>
                </Row>
                <Row>
                    <Form.Item label={t('d:printer')} name="printer">
                        <Select
                            placeholder={`${t('messages:please-select-a', {
                                name: t('d:printer')
                            })}`}
                            allowClear
                        >
                            {printers?.map((printer: any) => (
                                <Option key={printer.key} value={printer.key}>
                                    {printer.text}
                                </Option>
                            ))}
                        </Select>
                        <Text disabled italic style={{ fontSize: '10px' }}>
                            {t('messages:no-printer-behaviour')}
                        </Text>
                    </Form.Item>
                </Row>
            </Form>
        </Modal>
    );
};

export { PrintLocationsModalForm };
