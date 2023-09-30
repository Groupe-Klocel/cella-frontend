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
import { BarcodeOutlined, EyeTwoTone } from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import configs from '../../../common/configs.json';
import {
    META_DEFAULTS,
    pathParams,
    showError,
    useCarrierIds,
    useHandlingUnitModels,
    useStockOwnerIds
} from '@helpers';
import { Button, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useListConfigsForAScopeQuery, useListParametersForAScopeQuery } from 'generated/graphql';
import { BoxModel } from 'models/BoxModel';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponent';
import { boxesRoutes } from 'modules/Boxes/Static/boxesRoutes';
import useTranslation from 'next-translate/useTranslation';
import { FC, useEffect, useState } from 'react';
import moment from 'moment';
import 'moment/min/locales';
import { FormDataType, FormOptionType } from 'models/Models';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';

type PageComponent = FC & { layout: typeof MainLayout };

const BoxesPage: PageComponent = () => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [, setData] = useState<any>();
    const stockOwnerData = useStockOwnerIds({}, 1, 100, null);
    const carrierData = useCarrierIds({}, 1, 100, null);
    const handlingUnitModelData = useHandlingUnitModels({}, 1, 100, null);
    const [sidOptions, setSIdOptions] = useState<Array<FormOptionType>>([]);
    const [statusTexts, setStatusTexts] = useState<Array<FormOptionType>>();
    const [carriersOptions, setCarriersOptions] = useState<Array<FormOptionType>>();
    const [preparationModeTexts, setPreparationModeTexts] = useState<Array<FormOptionType>>();
    const [handlingUnitModelsOptions, setHandlingUnitModelsOptions] =
        useState<Array<FormOptionType>>();

    const headerData: HeaderData = {
        title: t('common:boxes'),
        routes: boxesRoutes,
        actionsComponent: undefined
    };

    const [refresh, doRefresh] = useState(0);

    //To render Simple stockOwners list
    useEffect(() => {
        if (stockOwnerData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            stockOwnerData.data.stockOwners?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setSIdOptions(newIdOpts);
        }
    }, [stockOwnerData.data]);

    //To render Simple statuses list
    const statusTextList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'handling_unit_outbound_status',
        language: router.locale
    });

    useEffect(() => {
        if (statusTextList) {
            const newStatusTexts: Array<FormOptionType> = [];

            const cData = statusTextList?.data?.listConfigsForAScope;
            if (cData) {
                cData.sort((a, b) => parseInt(a.code) - parseInt(b.code));
                cData.forEach((item) => {
                    newStatusTexts.push({ key: parseInt(item.code), text: item.text });
                });
                setStatusTexts(newStatusTexts);
            }
        }
    }, [statusTextList.data]);

    //To render Simple carriers list
    useEffect(() => {
        if (carrierData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            carrierData.data.carriers?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setCarriersOptions(newIdOpts);
        }
    }, [carrierData.data]);

    //To render Simple preparation modes list
    const preparationModeTextList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'preparation_mode',
        language: router.locale
    });

    useEffect(() => {
        if (preparationModeTextList) {
            const newPreparationModeTexts: Array<FormOptionType> = [];

            const cData = preparationModeTextList?.data?.listParametersForAScope;
            if (cData) {
                cData.sort((a, b) => parseInt(a.code) - parseInt(b.code));
                cData.forEach((item) => {
                    newPreparationModeTexts.push({ key: parseInt(item.code), text: item.text });
                });
                setPreparationModeTexts(newPreparationModeTexts);
            }
        }
    }, [preparationModeTextList.data]);

    //To render Simple handlingUnitModels list
    useEffect(() => {
        if (handlingUnitModelData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            handlingUnitModelData.data.handlingUnitModels?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setHandlingUnitModelsOptions(newIdOpts);
        }
    }, [handlingUnitModelData.data]);

    const printBox = async (boxes: string | Array<string>) => {
        const local = moment();
        local.locale();
        const dateLocal = local.format('l') + ', ' + local.format('LT');

        typeof boxes === 'string' ? (boxes = [boxes]) : boxes;

        const res = await fetch(`/api/boxes/print/label`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                boxes,
                dateLocal
            })
        });

        if (!res.ok) {
            showError(t('messages:error-print-data'));
        }
        const response = await res.json();
        if (response.url) {
            window.open(response.url, '_blank');
        } else {
            showError(t('messages:error-print-data'));
        }
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                filterFields={[
                    {
                        name: 'name',
                        displayName: t('d:name'),
                        type: FormDataType.String
                    },
                    {
                        name: 'stockOwnerId',
                        displayName: t('d:stockOwner'),
                        type: FormDataType.Dropdown,
                        subOptions: sidOptions
                    },
                    {
                        name: 'status',
                        type: FormDataType.Dropdown,
                        subOptions: statusTexts,
                        mode: 'multiple'
                    },
                    {
                        name: 'delivery',
                        type: FormDataType.String
                    },
                    {
                        name: 'round',
                        type: FormDataType.String
                    },
                    {
                        name: 'carrier_box',
                        type: FormDataType.String
                    },
                    {
                        name: 'carrier_name',
                        type: FormDataType.Dropdown,
                        subOptions: carriersOptions,
                        mode: 'multiple'
                    },
                    {
                        name: 'preparationMode',
                        type: FormDataType.Dropdown,
                        subOptions: preparationModeTexts,
                        mode: 'multiple'
                    },
                    {
                        name: 'handlingUnitModel',
                        type: FormDataType.Dropdown,
                        subOptions: handlingUnitModelsOptions,
                        mode: 'multiple'
                    }
                ]}
                setData={setData}
                refresh={refresh}
                sortDefault={{
                    field: 'id',
                    ascending: true
                }}
                headerData={headerData}
                dataModel={BoxModel}
                routeDetailPage={'/boxes/:id'}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: { id: string; status: number }) => (
                            <Space>
                                <LinkButton
                                    icon={<EyeTwoTone />}
                                    path={pathParams('/boxes/[id]', record.id)}
                                />
                                {record.status !=
                                configs.HANDLING_UNIT_OUTBOUND_STATUS_CANCELLED ? (
                                    <Button
                                        onClick={() => printBox(record.id)}
                                        icon={<BarcodeOutlined />}
                                    />
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
            />
        </>
    );
};

BoxesPage.layout = MainLayout;

export default BoxesPage;
