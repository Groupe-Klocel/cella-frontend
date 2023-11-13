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
    DeleteOutlined,
    EditTwoTone,
    EyeTwoTone,
    PrinterOutlined,
    StopOutlined
} from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import { getModesFromPermissions, META_DEFAULTS, pathParams } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { DocumentHistoryModelV2 as model } from 'models/DocumentHistoryModelV2';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { FC, useState } from 'react';
import { documentHistoriesRoutes as itemRoutes } from 'modules/DocumentHistories/Static/documentHistoriesRoutes';
type PageComponent = FC & { layout: typeof MainLayout };

const DocumentHistoryPages: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const headerData: HeaderData = {
        title: t('common:document-histories'),
        routes: itemRoutes,
        actionsComponent: null
    };

    const confirmAction = (id: string | undefined, setId: any, action: 'delete' | 'disable') => {
        return () => {
            Modal.confirm({
                title: t('messages:action-confirm'),
                onOk: () => {
                    setId(id);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    async function fetchData(
        dpmm: string,
        width: string,
        height: string,
        format: string,
        zpl: string
    ) {
        const headers: { [key: string]: string } = {};
        if (format == 'png') {
            headers['Accept'] = 'image/png';
        } else if (format == 'pdf') {
            headers['Accept'] = 'application/pdf';
        }
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        const response = await fetch(
            `http://api.labelary.com/v1/printers/${dpmm}/labels/${width}x${height}/0/`,
            {
                method: 'POST',
                headers: headers,
                body: zpl
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (format == 'png') {
            return response.blob();
        } else if (format == 'pdf') {
            return response.arrayBuffer();
        }
    }

    function downloadDocument(base64Data: string, fileName: string, fileType: string) {
        const byteCharacters = window.atob(base64Data);

        if (fileType === 'zpl') {
            const outputFormat = 'pdf';
            fetchData('8dpmm', '4', '6', outputFormat, byteCharacters)
                .then((data: any) => {
                    let blobData = data;
                    if (outputFormat === 'pdf') {
                        blobData = new Blob([data], { type: 'application/pdf' });
                    }
                    const url = URL.createObjectURL(blobData);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName.replace(/\.[^/.]+$/, `.${outputFormat}`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                })
                .catch((error) => console.error(error));
        } else {
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: fileType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            binaryDocument: string;
                            documentName: string;
                            documentType: string;
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
                                model.isEditable ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParams(`${rootPath}/edit/[id]`, record.id)}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isSoftDeletable ? (
                                    <Button
                                        icon={<StopOutlined />}
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDisable, 'disable')()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isDeletable ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDelete, 'delete')()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                <Button
                                    onClick={() =>
                                        downloadDocument(
                                            record.binaryDocument,
                                            record.documentName,
                                            record.documentType
                                        )
                                    }
                                    icon={<PrinterOutlined />}
                                />
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={`${rootPath}/:id`}
            />
        </>
    );
};

DocumentHistoryPages.layout = MainLayout;

export default DocumentHistoryPages;
