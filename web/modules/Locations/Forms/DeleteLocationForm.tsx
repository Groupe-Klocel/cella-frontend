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
import { StepsPanel, WrapperForm, WrapperStepContent } from '@components';
import {
    DataQueryType,
    removeDuplicatesAndSort,
    showError,
    showSuccess,
    useLocationIds
} from '@helpers';
import { Button, Form, Modal, Select, Space } from 'antd';
import { useAuth } from 'context/AuthContext';
import { SimpleGetAllBLocksQuery, useSimpleGetAllBLocksQuery } from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const { Option } = Select;

export const DeleteLocationForm = () => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const [blocks, setBlocks] = useState<any>();
    const [locations, setLocations] = useState<DataQueryType>();
    const [current, setCurrent] = useState(0);
    const [unsavedChanges, setUnsavedChanges] = useState(false); // tracks if form has unsaved changes

    //To render simple blocks list for attached block selection (id and name without any filter)
    const blocksList = useSimpleGetAllBLocksQuery<Partial<SimpleGetAllBLocksQuery>, Error>(
        graphqlRequestClient
    );

    useEffect(() => {
        if (blocksList) {
            setBlocks(blocksList?.data?.blocks?.results);
        }
    }, [blocksList]);

    // Block to Aisle
    const [blockToSearch, setBlockToSearch] = useState<any>(null);
    const search = blockToSearch ? { blockId: blockToSearch! } : undefined;
    const { data: locationsData } = useLocationIds(search, 1, 1000, null);

    //set reference Locations list
    useEffect(() => {
        if (locationsData && blockToSearch) {
            setLocations(locationsData?.locations);
        }
    }, [locationsData, blockToSearch]);

    const [aisleIdOptions, setAisleIdOptions] = useState<any>(null);
    // Block to Aisle
    const [aisleToSearch, setAisleToSearch] = useState<any>(null);
    const [columnIdOptions, setColumnIdOptions] = useState<any>(null);
    // Aisle to Column
    const [columnToSearch, setColumnToSearch] = useState<any>(null);
    const [levelIdOptions, setLevelIdOptions] = useState<any>(null);
    // Column to Level
    const [levelToSearch, setLevelToSearch] = useState<any>(null);
    const [positionIdOptions, setPositionIdOptions] = useState<any>(null);

    // TYPED SAFE ALL
    const [form] = Form.useForm();

    useEffect(() => {
        if (locations) {
            const newOpts: Array<any> = locations.results.map(({ aisle }) => {
                return aisle!;
            });
            setAisleIdOptions(removeDuplicatesAndSort(newOpts));
        }
    }, [locations]);

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

    useEffect(() => {
        if (aisleToSearch) {
            filterAndMap(locations, setColumnIdOptions, { aisle: aisleToSearch }, 'column');
        }
    }, [aisleToSearch]);

    useEffect(() => {
        if (aisleToSearch && columnToSearch) {
            filterAndMap(
                locations,
                setLevelIdOptions,
                {
                    aisle: aisleToSearch,
                    column: columnToSearch
                },
                'level'
            );
        }
    }, [aisleToSearch, columnToSearch]);

    useEffect(() => {
        if (aisleToSearch && columnToSearch && levelToSearch) {
            filterAndMap(
                locations,
                setPositionIdOptions,
                {
                    aisle: aisleToSearch,
                    column: columnToSearch,
                    level: levelToSearch
                },
                'position'
            );
        }
    }, [aisleToSearch, columnToSearch, levelToSearch]);

    const onBlockChange = (id: string) => {
        setBlockToSearch(id);
    };

    const onAisleChange = (id: string) => {
        setAisleToSearch(id);
    };

    const onColumnChange = (id: string) => {
        setColumnToSearch(id);
    };

    const onLevelChange = (id: string) => {
        setLevelToSearch(id);
    };

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

    const bulkDeleteLocation = async () => {
        const formData = form.getFieldsValue(true);

        const selectedBlock = blocksList?.data?.blocks?.results.find((e: any) => {
            return e.id == formData.blockId;
        });

        const originLocationInput = {
            blockId: formData.blockId,
            blockName: selectedBlock?.name,
            aisle: formData.originAisle,
            column: formData.originColumn,
            level: formData.originLevel,
            position: formData.originPosition
        };
        const finalLocationInput = {
            blockId: formData.blockId,
            blockName: selectedBlock?.name,
            aisle: formData.finalAisle,
            column: formData.finalColumn,
            level: formData.finalLevel,
            position: formData.finalPosition
        };

        const res = await fetch(`/api/locations/bulk-delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                blockId: formData.blockId,
                originLocation: originLocationInput,
                finalLocation: finalLocationInput
            })
        });

        const response = await res.json();

        if (res.ok) {
            // delete success
            showSuccess(t('messages:success-update-data'));
            router.push(`/locations/`);
        } else {
            // error
            if (response.error.is_error) {
                // specific error
                showError(t(`errors:${response.error.code}`));
                setUnsavedChanges(false);
            } else {
                // generic error
                showError(t('messages:error-delete-location-impossible'));
            }
        }
    };

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

    const onCancel = () => {
        setUnsavedChanges(false);
        Modal.confirm({
            title: t('messages:confirm-leaving-page'),
            onOk: () => {
                router.back();
            },
            okText: t('common:bool-yes'),
            cancelText: t('common:bool-no')
        });
    };

    const deleteSteps = [
        [
            <>
                <Form.Item
                    label={t('d:associatedBlock')}
                    name="blockId"
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

                <Form.Item
                    label={t('d:originAisle')}
                    name="originAisle"
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
                        onChange={onAisleChange}
                        allowClear
                    >
                        {aisleIdOptions?.map((aisle: any) => (
                            <Option key={aisle} value={aisle}>
                                {aisle}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    label={t('d:originColumn')}
                    name="originColumn"
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
                        onChange={onColumnChange}
                        allowClear
                    >
                        {columnIdOptions?.map((column: any) => (
                            <Option key={column} value={column}>
                                {column}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    label={t('d:originLevel')}
                    name="originLevel"
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
                        onChange={onLevelChange}
                        allowClear
                    >
                        {levelIdOptions?.map((level: any) => (
                            <Option key={level} value={level}>
                                {level}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    label={t('d:originPosition')}
                    name="originPosition"
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
                    >
                        {positionIdOptions?.map((position: any) => (
                            <Option key={position} value={position}>
                                {position}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </>
        ],
        [
            <>
                <Form.Item
                    label={t('d:finalAisle')}
                    name="finalAisle"
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
                        onChange={onAisleChange}
                        allowClear
                    >
                        {aisleIdOptions?.map((aisle: any) => (
                            <Option key={aisle} value={aisle}>
                                {aisle}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    label={t('d:finalColumn')}
                    name="finalColumn"
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
                        onChange={onColumnChange}
                        allowClear
                    >
                        {columnIdOptions?.map((column: any) => (
                            <Option key={column} value={column}>
                                {column}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    label={t('d:finalLevel')}
                    name="finalLevel"
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
                        onChange={onLevelChange}
                        allowClear
                    >
                        {levelIdOptions?.map((level: any) => (
                            <Option key={level} value={level}>
                                {level}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    label={t('d:finalPosition')}
                    name="finalPosition"
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
                    >
                        {positionIdOptions?.map((position: any) => (
                            <Option key={position} value={position}>
                                {position}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </>
        ]
    ];

    const steps = deleteSteps.map((element, index) => {
        let title = t('common:step-block-and-origin-location');
        if (index == 1) title = t('common:step-final-location');
        return {
            title: `${title}`,
            key: index
        };
    });

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
                    {deleteSteps[current]}
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
                        <Button type="primary" onClick={() => bulkDeleteLocation()}>
                            {t('actions:submit')}
                        </Button>
                        <Button onClick={onCancel}>{t('actions:cancel')}</Button>
                    </Space>
                </div>
            )}
        </WrapperForm>
    );
};
