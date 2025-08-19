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
import { META_DEFAULTS } from '@helpers';
import MainLayout from 'components/layouts/MainLayout';
import { AddParameterExtraForm } from 'modules/Parameters/Forms/AddParameterExtraForm';
import { useRouter } from 'next/router';
import { FC } from 'react';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { parametersRoutes } from 'modules/Parameters/Static/ParametersRoutes';

type PageComponent = FC & { layout: typeof MainLayout };

const AddParameterExtraPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    // #region extract data from modelV2

    const urlBack = router.query.url ? `/${router.query.url}` : '/parameters';
    //delete the s from the end of the url if it exists
    const urlForBreadCrumb =
        typeof router.query.url === 'string' && router.query.url.endsWith('s')
            ? router.query.url.slice(0, -1)
            : (urlBack ?? '');

    const breacCrumbTitle = urlForBreadCrumb ? `common:${urlForBreadCrumb}` : 'common:parameter';
    const scope = router.query.scope ? `${router.query.scope} - ` : '';

    const breadsCrumb = router.query.url
        ? [
              router.query.url === 'configurations'
                  ? null
                  : {
                        breadcrumbName: 'menu:configuration'
                    },
              {
                  path: `${urlBack}`,
                  breadcrumbName: breacCrumbTitle
              },
              {
                  breadcrumbName: `${router.query.parameterName}`
              },
              {
                  breadcrumbName: 'actions:add-extra-infos'
              }
          ].filter((item): item is Exclude<typeof item, null> => item !== null)
        : [
              ...parametersRoutes,
              {
                  breadcrumbName: `${scope}${router.query.parameterName}`
              },
              {
                  breadcrumbName: 'actions:add-extra-infos'
              }
          ];
    return (
        <>
            <AppHead title={`${router.query.parameterName} - ${t('actions:add-extra-infos')}`} />
            <HeaderContent
                title={`${router.query.parameterName} - ${t('actions:add-extra-infos')}`}
                routes={breadsCrumb}
                onBack={() => router.push(`/${urlBack}/${router.query.id}`)}
            />
            <AddParameterExtraForm urlBack={urlBack} />
        </>
    );
};

AddParameterExtraPage.layout = MainLayout;

export default AddParameterExtraPage;
