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
import {
    EditTwoTone,
    EyeTwoTone,
    InboxOutlined,
    PrinterOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import { AppHead, LinkButton, SinglePrintModal } from '@components';
import {
    getModesFromPermissions,
    META_DEFAULTS,
    pathParams,
    showError,
    showSuccess
} from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import 'moment/min/locales';
import moment from 'moment';
import {
    ModeEnum,
    UpdateLoadMutation,
    UpdateLoadMutationVariables,
    useListParametersForAScopeQuery,
    useUpdateLoadMutation
} from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import { LoadModelV2 as model } from 'models/LoadModelV2';
import { loadsRoutes as itemRoutes } from 'modules/Loads/Static/LoadsRoutes';
import configs from '../../../common/configs.json';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { gql } from 'graphql-request';

type PageComponent = FC & { layout: typeof MainLayout };

const LoadsPage: PageComponent = () => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = itemRoutes[itemRoutes.length - 1].path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false);
    const [showSinglePrintModal, setShowSinglePrintModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();
    const [referenceToPrint, setReferenceToPrint] = useState<string>();

    const headerData: HeaderData = {
        title: t('common:loads'),
        routes: itemRoutes,
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:load') })}
                    path={`${rootPath}/add`}
                    type="primary"
                />
            ) : null
    };

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

    const defaultPrinterLaserParameter = useListParametersForAScopeQuery(graphqlRequestClient, {
        scope: 'global',
        code: 'default_printer_laser'
    });
    const [defaultPrinterLaser, setDefaultPrinterLaser] = useState<string>();
    useEffect(() => {
        if (defaultPrinterLaserParameter) {
            setDefaultPrinterLaser(
                defaultPrinterLaserParameter.data?.listParametersForAScope[0].text
            );
        }
    }, [defaultPrinterLaserParameter.data]);

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
    const { mutate: updateLoadMutate, isPending: dispatch } = useUpdateLoadMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UpdateLoadMutation,
                _variables: UpdateLoadMutationVariables,
                _context: any
            ) => {
                showSuccess(t('messages:success-dispatched'));
                if (data?.updateLoad?.id && data?.updateLoad?.status) {
                    printLoad(
                        {
                            id: data.updateLoad.id,
                            statusDispatched
                        },
                        defaultPrinterLaser
                    );
                }
                setTriggerRefresh(!triggerRefresh);
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
    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                refetch={triggerRefresh}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            status: number;
                            numberHuLoaded: number;
                            name: string;
                        }) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={pathParams(`${rootPath}/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                model.isEditable &&
                                record.status !== configs.LOAD_STATUS_DISPATCHED ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                record.status > configs.LOAD_LINE_STATUS_CREATED &&
                                record.status < configs.LOAD_STATUS_DISPATCHED &&
                                record.numberHuLoaded > 0 &&
                                model.isEditable ? (
                                    <Button
                                        loading={dispatch}
                                        icon={<InboxOutlined />}
                                        onClick={() =>
                                            dispatchLoad({
                                                id: record.id,
                                                input: { status: configs.LOAD_STATUS_DISPATCHED }
                                            })
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isDeletable &&
                                record.status == configs.LOAD_STATUS_CREATED &&
                                record.numberHuLoaded <= 0 ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDelete, 'delete')()
                                        }
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                                    <Button
                                        icon={<PrinterOutlined />}
                                        onClick={() => {
                                            setShowSinglePrintModal(true);
                                            setIdToPrint(record.id);
                                            setReferenceToPrint(record.name);
                                        }}
                                    />
                                ) : (
                                    <></>
                                )}
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={`${rootPath}/:id`}
            />
            <SinglePrintModal
                showModal={{
                    showSinglePrintModal,
                    setShowSinglePrintModal
                }}
                dataToPrint={{
                    id: idToPrint,
                    date: dateLocal,
                    statusDispatched
                }}
                documentName="K_LoadLoadingList"
                documentReference={referenceToPrint}
            />
        </>
    );
};

LoadsPage.layout = MainLayout;

export default LoadsPage;
