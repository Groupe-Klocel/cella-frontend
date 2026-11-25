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
    DownloadOutlined,
    EditTwoTone,
    EyeTwoTone,
    FileSearchOutlined,
    LockTwoTone
} from '@ant-design/icons';
import { AppHead, ArchiveToggle, LinkButton } from '@components';
import { detectDocumentKind, getModesFromPermissions, META_DEFAULTS, pathParams } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { DocumentHistoryModelV2 as model } from '@helpers';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useState } from 'react';
import { documentHistoriesRoutes as itemRoutes } from 'modules/DocumentHistories/Static/documentHistoriesRoutes';
import {
    DocumentHistoryPreviewModal,
    useDocumentHistoryDownload
} from 'modules/DocumentHistories/Elements/DocumentHistoryPreview';
type PageComponent = FC & { layout: typeof MainLayout };

type DocumentHistoryRow = {
    id: string;
    binaryDocument: string;
    documentName: string;
    documentType: string;
};

const DocumentHistoryPages: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    // the document shown in the preview modal (null: closed)
    const [previewRecord, setPreviewRecord] = useState<DocumentHistoryRow | null>(null);
    const { download, downloadingKey } = useDocumentHistoryDownload();

    // read production + archive; page state only, never saved
    const [withArchive, setWithArchive] = useState<boolean>(false);
    // the detail page reads the archive too when it is opened from an archive read
    const detailPath = (id: string) => ({
        pathname: `${rootPath}/[id]`,
        query: withArchive ? { id, withArchive: 'true' } : { id }
    });

    const headerData: HeaderData = {
        title: t('common:document-histories'),
        routes: itemRoutes,
        actionsComponent: (
            <ArchiveToggle
                tableName={model.tableName}
                active={withArchive}
                onChange={setWithArchive}
            />
        )
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

    return (
        <>
            <AppHead title={headerData.title} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                withArchive={withArchive}
                textFiltersAsString
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: DocumentHistoryRow) => (
                            <Space>
                                {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                    <LinkButton
                                        icon={<EyeTwoTone />}
                                        path={detailPath(record.id)}
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
                                        icon={<LockTwoTone twoToneColor="#ffbbaf" />}
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
                                    icon={<FileSearchOutlined />}
                                    title={t('actions:preview')}
                                    // nothing to show for an empty record or a format the
                                    // browser cannot display (xlsx …): download it instead
                                    disabled={
                                        !['pdf', 'zpl', 'image', 'text'].includes(
                                            detectDocumentKind(record) ?? ''
                                        )
                                    }
                                    onClick={() => setPreviewRecord(record)}
                                />
                                <Button
                                    icon={<DownloadOutlined />}
                                    title={t('actions:download')}
                                    disabled={!record.binaryDocument}
                                    loading={downloadingKey === String(record.id)}
                                    onClick={() => download(record, String(record.id))}
                                />
                            </Space>
                        )
                    }
                ]}
                routeDetailPage={`${rootPath}/:id`}
            />
            <DocumentHistoryPreviewModal
                record={previewRecord}
                onClose={() => setPreviewRecord(null)}
            />
        </>
    );
};

DocumentHistoryPages.layout = MainLayout;

export default DocumentHistoryPages;
