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
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import MainLayout from 'components/layouts/MainLayout';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { META_DEFAULTS, useFeatureCodes } from '@helpers';
import { FormDataType, FormOptionType } from 'models/Models';
import { useListParametersForAScopeQuery } from 'generated/graphql';
import { FeatureTypeDetailModelV2 } from 'models/FeatureTypeDetailModelV2';
import { featureTypesRoutes } from 'modules/FeatureTypes/Static/featureTypesRoutes';
import { EditItemComponent } from 'modules/Crud/EditItemComponentV2';
import { useAuth } from 'context/AuthContext';

type PageComponent = FC & { layout: typeof MainLayout };

const EditFeatureTypeDetailPage: PageComponent = () => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const errorMessageEmptyInput = t('messages:error-message-empty-input');
    const [featureTexts, setFeatureTexts] = useState<Array<FormOptionType>>();
    const router = useRouter();
    const [sidOptions, setSIdOptions] = useState<Array<FormOptionType>>([]);
    const [data, setData] = useState<any>();
    const featureCodeData = useFeatureCodes({}, 1, 100, null);
    const { id, featureType } = router.query;

    const breadsCrumb = [
        ...featureTypesRoutes,
        {
            breadcrumbName: `${t('common:features-types-details')} / ${t('common:feature-code')} ${
                data?.featureTypeText
            }`
        }
    ];

    const featureTextList = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'feature_type'
    });
    useEffect(() => {
        if (featureTextList) {
            const newFeatureTexts: Array<FormOptionType> = [];

            const cData = featureTextList?.data?.listParametersForAScope;
            if (cData) {
                cData.forEach((item) => {
                    newFeatureTexts.push({ key: parseInt(item.code), text: item.text });
                });
                setFeatureTexts(newFeatureTexts);
            }
        }
    }, [featureTextList.data]);

    useEffect(() => {
        if (featureCodeData.data) {
            const newIdOpts: Array<FormOptionType> = [];
            featureCodeData.data.featureCodes?.results.forEach(({ id, name }) => {
                newIdOpts.push({ text: name!, key: id! });
            });
            setSIdOptions(newIdOpts);
        }
    }, [featureCodeData.data]);

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <EditItemComponent
                id={id!}
                setData={setData}
                dataModel={FeatureTypeDetailModelV2}
                headerComponent={
                    <HeaderContent
                        title={`${t('common:features-types')} / ${t('common:feature-code')} / ${t(
                            'actions:edit'
                        )} ${data?.featureTypeText}`}
                        routes={breadsCrumb}
                        onBack={() => router.back()}
                    />
                }
                routeAfterSuccess={`/feature-types/details/:id`}
            />
        </>
    );
};

EditFeatureTypeDetailPage.layout = MainLayout;

export default EditFeatureTypeDetailPage;
