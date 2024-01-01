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
import { AppHead, LinkButton, SinglePrintModal } from '@components';
import { META_DEFAULTS, getModesFromPermissions, showError, showSuccess } from '@helpers';
import { LoadDetailsExtra } from 'modules/Loads/Elements/LoadDetailsExtra';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import useTranslation from 'next-translate/useTranslation';
import { LoadModelV2 as model } from 'models/LoadModelV2';
import { loadsRoutes as itemRoutes } from 'modules/Loads/Static/LoadsRoutes';
import { Button, Modal, Space } from 'antd';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import {
    ModeEnum,
    UpdateLoadMutation,
    UpdateLoadMutationVariables,
    useListParametersForAScopeQuery,
    useUpdateLoadMutation
} from 'generated/graphql';
import configs from '../../../common/configs.json';
import { useAuth } from 'context/AuthContext';
import 'moment/min/locales';
import moment from 'moment';
import { gql } from 'graphql-request';

type PageComponent = FC & { layout: typeof MainLayout };

const LoadsPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const { id } = router.query;
    const { graphqlRequestClient } = useAuth();
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const [showSinglePrintModal, setShowSinglePrintModal] = useState(false);
    const [dataToPrint, setDataToPrint] = useState<any>();
    const [documentToPrint, setDocumentToPrint] = useState<string>();

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:load')} ${data?.name}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = itemRoutes[itemRoutes.length - 1].path;

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

    //retrieve client's date for printing
    const local = moment();
    local.locale();
    const dateLocal = local.format('l') + ', ' + local.format('LT');

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
            documentName: 'K_LoadLoadingList',
            language: printLanguage,
            printer,
            context: { ...inputForPrinting, date: dateLocal }
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

    // DISPATCH LOAD
    const statusDispatched = configs.DELIVERY_STATUS_DISPATCHED;
    const { mutate: updateLoadMutate, isLoading: dispatch } = useUpdateLoadMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: async (
                data: UpdateLoadMutation,
                _variables: UpdateLoadMutationVariables,
                _context: any
            ) => {
                if (!dispatch) {
                    showSuccess(t('messages:success-dispatched'));
                    if (data?.updateLoad?.id) {
                        printLoad(
                            {
                                id: data.updateLoad.id,
                                statusDispatched
                            },
                            defaultPrinter
                        );
                    }
                    setTriggerRefresh(!triggerRefresh);
                }
            },
            onError: () => {
                showError(t('messages:error-dispatching-data'));
            }
        }
    );

    const dispatchLoad = ({ id, input }: UpdateLoadMutationVariables) => {
        Modal.confirm({
            title: t('messages:dispatch-load-confirm'),
            onOk: () => {
                updateLoadMutate({
                    id: id,
                    input: input
                });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };
    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
        return () => {
            Modal.confirm({
                title: t('messages:delete-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };
    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                data?.status != configs.LOAD_STATUS_DISPATCHED &&
                model.isEditable ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/edit/${id}`}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Delete) &&
                data?.status == configs.LOAD_STATUS_CREATED &&
                data?.numberHuLoaded <= 0 &&
                model.isDeletable ? (
                    <Button onClick={() => confirmAction(data.id, setIdToDelete, 'delete')()}>
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 &&
                modes.includes(ModeEnum.Update) &&
                data?.status > configs.LOAD_LINE_STATUS_CREATED &&
                data?.status < configs.LOAD_STATUS_DISPATCHED &&
                data?.numberHuLoaded > 0 &&
                model.isEditable ? (
                    <Button
                        loading={dispatch}
                        onClick={() =>
                            dispatchLoad({
                                id: data.id,
                                input: { status: configs.LOAD_STATUS_DISPATCHED }
                            })
                        }
                    >
                        {t('actions:dispatch')}
                    </Button>
                ) : (
                    <></>
                )}
                {/* Print List of boxes and code bar of load */}
                {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                    <Button
                        // onClick={() => chooseAction(data.id, 'print')}
                        onClick={() => {
                            setShowSinglePrintModal(true);
                            setDataToPrint({
                                id: data.id,
                                date: dateLocal,
                                statusDispatched
                            });
                            setDocumentToPrint('K_LoadLoadingList');
                        }}
                    >
                        {t('actions:print')}
                    </Button>
                ) : (
                    <></>
                )}
                {/* Print just code bar of load */}
                {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                    <Button
                        // onClick={() => chooseAction(data.id, 'label')}
                        onClick={() => {
                            setShowSinglePrintModal(true);
                            setDataToPrint({
                                id: data.id
                            });
                            setDocumentToPrint('K_LoadLabel');
                        }}
                    >
                        {t('actions:load-label')}
                    </Button>
                ) : (
                    <></>
                )}
                <SinglePrintModal
                    showModal={{
                        showSinglePrintModal,
                        setShowSinglePrintModal
                    }}
                    dataToPrint={dataToPrint}
                    documentName={documentToPrint!}
                />
            </Space>
        )
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                extraDataComponent={<LoadDetailsExtra loadId={id!} />}
                headerData={headerData}
                id={id!}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                refetch={triggerRefresh}
            />
        </>
    );
};

LoadsPage.layout = MainLayout;

export default LoadsPage;
