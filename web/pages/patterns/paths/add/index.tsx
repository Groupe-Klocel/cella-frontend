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
import { AppHead, HeaderContent } from '@components';
import MainLayout from 'components/layouts/MainLayout';
import { FC, useEffect, useState } from 'react';
import { META_DEFAULTS, usePatternIds, usePatternPaths, useStockOwnerIds } from '@helpers';
import { AddItemComponent } from 'modules/Crud/AddItemComponent';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { PatternPathModel } from 'models/PatternPathModel';
import { FormDataType, FormOptionType } from 'models/Models';
import { useListConfigsForAScopeQuery } from 'generated/graphql';
import { useAuth } from 'context/AuthContext';
import { useRouter } from 'next/router';
import { patternsRoutes } from 'modules/Patterns/Static/patternsRoutes';
import configs from '../../../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

const AddPatternPathPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation('actions');
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const { graphqlRequestClient } = useAuth();
    const [sidOptions, setSIdOptions] = useState<Array<FormOptionType>>([]);
    const [pidOptions, setPIdOptions] = useState<Array<FormOptionType>>([]);
    const patternData = usePatternIds({}, 1, 100, null);
    const stockOwnerData = useStockOwnerIds({}, 1, 100, null);
    const [orderMax, setMaxOrder] = useState<number>(0);

    //To render existing orders list
    const patternPaths = usePatternPaths(
        { status: configs.PATTERN_PATH_STATUS_IN_PROGRESS },
        1,
        100,
        null
    );
    let maxOrder = 0;
    if (patternPaths?.data?.patternPaths && patternPaths?.data?.patternPaths?.count > 0)
        // Use reduce to find the maximum order value
        maxOrder = patternPaths.data?.patternPaths?.results?.reduce((max: any, obj: any) => {
            const order = obj.order;
            // Check if the order is a valid number and greater than the current max
            if (typeof order === 'number' && !isNaN(order) && order > max) {
                return order;
            }
            return max;
        }, -Infinity); // Start with negative infinity to handle undefined or non-numeric values
    maxOrder++;
    const defaultValues = { order: maxOrder, status: configs.PATTERN_PATH_STATUS_IN_PROGRESS };

    const [statusTexts, setStatusTexts] = useState<Array<FormOptionType>>();

    const statusPatternPathTextList = useListConfigsForAScopeQuery(graphqlRequestClient, {
        scope: 'pattern_path_status'
    });
    useEffect(() => {
        if (statusPatternPathTextList) {
            const newStatusTexts: Array<FormOptionType> = [];

            const cData = statusPatternPathTextList?.data?.listConfigsForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newStatusTexts.push({ key: parseInt(item.code), text: item.text });
                });
                setStatusTexts(newStatusTexts);
            }
        }
    }, [statusPatternPathTextList.data]);

    useEffect(() => {
        if (patternData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            patternData.data.patterns?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setPIdOptions(newIdOpts);
        }
    }, [patternData.data]);

    useEffect(() => {
        if (stockOwnerData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            stockOwnerData.data.stockOwners?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setSIdOptions(newIdOpts);
        }
    }, [stockOwnerData.data]);

    const PatternDetailsBreadcrumb = [
        ...patternsRoutes,
        {
            breadcrumbName: `${router.query.patternName}`,
            path: '/patterns/' + router.query.patternId
        }
    ];
    const breadCrumb = [
        ...PatternDetailsBreadcrumb,
        {
            breadcrumbName: t('actions:add-patternPath')
        }
    ];

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />

            <AddItemComponent
                extraData={
                    defaultValues || Object.keys(defaultValues).length !== 0
                        ? defaultValues
                        : undefined
                }
                headerComponent={
                    <HeaderContent
                        title={t('actions:add-patternPath')}
                        routes={breadCrumb}
                        onBack={() => router.push('/patterns/' + router.query.patternId)}
                    />
                }
                addSteps={[
                    [
                        {
                            name: 'stockOwnerId',
                            displayName: t('d:stockOwner'),
                            type: FormDataType.Dropdown,
                            disabled: true,
                            subOptions: sidOptions,
                            initialValue: router.query.stockOwnerId
                        },
                        {
                            name: 'patternId',
                            displayName: t('d:pattern'),
                            type: FormDataType.Dropdown,
                            initialValue: router.query.patternId,
                            disabled: true,
                            subOptions: pidOptions
                        },
                        {
                            name: 'status',
                            type: FormDataType.Dropdown,
                            subOptions: statusTexts,
                            disabled: true,
                            initialValue: configs.PATTERN_PATH_STATUS_IN_PROGRESS
                        },
                        {
                            name: 'name',
                            type: FormDataType.String,
                            rules: [{ required: true, message: errorMessageEmptyInput }]
                        }
                    ]
                ]}
                dataModel={PatternPathModel}
                routeAfterSuccess={'/patterns/' + router.query.patternId}
            />
        </>
    );
};

AddPatternPathPage.layout = MainLayout;

export default AddPatternPathPage;
