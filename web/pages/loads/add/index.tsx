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
import MainLayout from '../../../components/layouts/MainLayout';
import { LoadModelV2 } from '@helpers';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { META_DEFAULTS, showError, showSuccess } from '@helpers';
import configs from '../../../../common/configs.json';
import { addLoadRoutes } from 'modules/Loads/Static/LoadsRoutes';
import 'moment/min/locales';
import { AddLoadComponent } from 'modules/Loads/PageContainer/AddLoadComponent';
import { gql } from 'graphql-request';
import { useAuth } from 'context/AuthContext';
import { useListParametersForAScopeQuery } from 'generated/graphql';

type PageComponent = FC & { layout: typeof MainLayout };

const AddLoadPage: PageComponent = () => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();
    const defaultValues = { status: configs.LOAD_STATUS_CREATED };
    const [print, setPrint] = useState<any>();
    const [loadPrint, setLoadPrint] = useState<string>('');

    const defaultPrintLanguage = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'global',
        code: 'default_print_language'
    });
    const [printLanguage, setPrintLanguage] = useState<string>();
    useEffect(() => {
        if (defaultPrintLanguage) {
            setPrintLanguage(defaultPrintLanguage.data?.listParametersForAScope[0].text);
        }
    }, [defaultPrintLanguage.data]);

    const defaultPrinterParameter = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'global',
        code: 'default_printer'
    });
    const [defaultPrinter, setDefaultPrinter] = useState<string>();
    useEffect(() => {
        if (defaultPrinterParameter) {
            setDefaultPrinter(defaultPrinterParameter.data?.listParametersForAScope[0].text);
        }
    }, [defaultPrinterParameter.data]);

    const printLoad = async (inputForPrinting: any, printer: string | undefined) => {
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
            documentName: 'K_LoadLabel',
            language: printLanguage,
            printer,
            context: { ...inputForPrinting }
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

    useEffect(() => {
        if (print) {
            setLoadPrint(print);
            printLoad({ id: print?.id }, defaultPrinter);
        }
    }, [print]);

    return (
        <>
            <AppHead title={t('actions:add2', { name: t('common:load') })} />
            <AddLoadComponent
                dataModel={LoadModelV2}
                headerComponent={
                    <HeaderContent
                        title={t('actions:add2', { name: t('common:load') })}
                        routes={addLoadRoutes}
                        onBack={() => router.push(`/loads`)}
                    />
                }
                setPrint={setPrint}
                print={loadPrint}
                extraData={
                    defaultValues || Object.keys(defaultValues).length !== 0
                        ? defaultValues
                        : undefined
                }
                routeOnCancel={`/loads`}
            />
        </>
    );
};

AddLoadPage.layout = MainLayout;

export default AddLoadPage;
