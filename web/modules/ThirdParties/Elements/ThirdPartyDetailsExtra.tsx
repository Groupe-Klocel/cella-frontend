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
import { Button, Divider, Modal, Space, Typography } from 'antd';
import { ModeEnum } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { ThirdPartyAddressModelV2 as model } from 'models/ThirdPartyAddressModelV2';
import { ThirdPartyDocumentModelV2 } from 'models/ThirdPartyDocumentModelV2';
import { getModesFromPermissions, pathParams, pathParamsFromDictionary } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useState } from 'react';
import configs from '../../../../common/configs.json';
import { LinkButton } from '@components';
import {
    DeleteOutlined,
    EditTwoTone,
    EyeTwoTone,
    LockTwoTone,
    PrinterOutlined,
    UnlockTwoTone
} from '@ant-design/icons';

const { Title } = Typography;

export interface IItemDetailsProps {
    thirdPartyId?: string | any;
    thirdPartyName?: string | any;
    thirdPartyStatus?: string | any;
}

const ThirdPartyDetailsExtra = ({
    thirdPartyId,
    thirdPartyName,
    thirdPartyStatus
}: IItemDetailsProps) => {
    const { t } = useTranslation();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [reopenInfo, setReopenInfo] = useState<string | undefined>();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const documentModes = getModesFromPermissions(permissions, ThirdPartyDocumentModelV2.tableName);
    const [documentIdToDelete, setDocumentIdToDelete] = useState<string | undefined>();

    const thirdPartyAddressHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:third-party-addresses') }),
        routes: [],
        actionsComponent:
            modes.length > 0 &&
            modes.includes(ModeEnum.Create) &&
            thirdPartyStatus != configs.THIRD_PARTY_STATUS_DISABLED ? (
                <LinkButton
                    title={t('actions:associate', { name: t('common:third-party-address') })}
                    path={pathParamsFromDictionary('/third-parties/address/add', {
                        thirdPartyId: thirdPartyId,
                        thirdPartyName: thirdPartyName
                    })}
                    type="primary"
                />
            ) : null
    };

    const thirdPartyDocumentHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:documents') }),
        routes: [],
        actionsComponent:
            modes.length > 0 &&
            modes.includes(ModeEnum.Create) &&
            thirdPartyStatus != configs.THIRD_PARTY_STATUS_DISABLED ? (
                <LinkButton
                    title={t('actions:associate', { name: t('common:documents') })}
                    path={pathParamsFromDictionary('/third-parties/document/add', {
                        thirdPartyId: thirdPartyId,
                        thirdPartyName: thirdPartyName
                    })}
                    type="primary"
                />
            ) : null
    };

    const confirmAction = (
        info: any | undefined,
        setInfo: any,
        action: 'delete' | 'disable' | 'enable'
    ) => {
        return () => {
            const titre =
                action == 'enable'
                    ? 'messages:enable-confirm'
                    : action == 'delete'
                      ? 'messages:delete-confirm'
                      : 'messages:disable-confirm';
            Modal.confirm({
                title: t(titre),
                onOk: () => {
                    setInfo(info);
                },
                okText: t('messages:confirm'),
                cancelText: t('messages:cancel')
            });
        };
    };

    function downloadDocument(base64Data: string, fileName: string) {
        const [header, actualBase64] = base64Data.split(',');
        const fileType = header.split(':')[1].split(';')[0];

        const byteCharacters = window.atob(actualBase64);
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

    return (
        <>
            {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ thirdPartyId: thirdPartyId }}
                        dataModel={model}
                        headerData={thirdPartyAddressHeaderData}
                        routeDetailPage={'/third-parties/address/:id'}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        triggerReopen={{ reopenInfo, setReopenInfo }}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: {
                                    id: string;
                                    articleId: string;
                                    article_name: string;
                                    barcodeId: string;
                                    barcode_name: string;
                                    name: string;
                                    status: number;
                                }) => (
                                    <Space>
                                        {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                            <LinkButton
                                                icon={<EyeTwoTone />}
                                                path={pathParams(
                                                    '/third-parties/address/[id]',
                                                    record.id
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {modes.length > 0 &&
                                        modes.includes(ModeEnum.Update) &&
                                        model.isEditable &&
                                        record.status !=
                                            configs.THIRD_PARTY_ADDRESS_STATUS_DISABLED ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/third-parties/address/edit/[id]',
                                                    {
                                                        id: record.id
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {modes.length > 0 &&
                                        modes.includes(ModeEnum.Delete) &&
                                        model.isSoftDeletable &&
                                        record.status !=
                                            configs.THIRD_PARTY_ADDRESS_STATUS_DISABLED ? (
                                            <Button
                                                icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDisable,
                                                        'disable'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                        {modes.length > 0 &&
                                        modes.includes(ModeEnum.Delete) &&
                                        model.isDeletable &&
                                        record.status !=
                                            configs.THIRD_PARTY_ADDRESS_STATUS_DISABLED ? (
                                            <Button
                                                icon={<DeleteOutlined />}
                                                danger
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDelete,
                                                        'delete'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                        {record.status ==
                                        configs.THIRD_PARTY_ADDRESS_STATUS_DISABLED ? (
                                            <Button
                                                icon={<UnlockTwoTone twoToneColor="#b3cad6" />}
                                                onClick={() =>
                                                    confirmAction(
                                                        {
                                                            id: record.id,
                                                            status: configs.THIRD_PARTY_ADDRESS_STATUS_ENABLED
                                                        },
                                                        setReopenInfo,
                                                        'enable'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                )
                            }
                        ]}
                        searchable={false}
                    />
                    <ListComponent
                        searchCriteria={{ thirdPartyId: thirdPartyId }}
                        dataModel={ThirdPartyDocumentModelV2}
                        headerData={thirdPartyDocumentHeaderData}
                        routeDetailPage={'/third-parties/document/:id'}
                        triggerDelete={{
                            idToDelete: documentIdToDelete,
                            setIdToDelete: setDocumentIdToDelete
                        }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                        triggerReopen={{ reopenInfo, setReopenInfo }}
                        actionColumns={[
                            {
                                title: 'actions:actions',
                                key: 'actions',
                                render: (record: {
                                    id: string;
                                    name: string;
                                    documentAttached: string;
                                }) => (
                                    <Space>
                                        {documentModes.length > 0 &&
                                        documentModes.includes(ModeEnum.Read) ? (
                                            <LinkButton
                                                icon={<EyeTwoTone />}
                                                path={pathParams(
                                                    '/third-parties/document/[id]',
                                                    record.id
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        <Button
                                            onClick={() =>
                                                downloadDocument(
                                                    record.documentAttached,
                                                    record.name
                                                )
                                            }
                                            icon={<PrinterOutlined />}
                                        />
                                        {documentModes.length > 0 &&
                                        documentModes.includes(ModeEnum.Update) &&
                                        ThirdPartyDocumentModelV2.isEditable ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/third-parties/document/edit/[id]',
                                                    {
                                                        id: record.id
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {documentModes.length > 0 &&
                                        documentModes.includes(ModeEnum.Delete) &&
                                        ThirdPartyDocumentModelV2.isSoftDeletable ? (
                                            <Button
                                                icon={<LockTwoTone twoToneColor="#ffbbaf" />}
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setIdToDisable,
                                                        'disable'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                        {documentModes.length > 0 &&
                                        documentModes.includes(ModeEnum.Delete) &&
                                        ThirdPartyDocumentModelV2.isDeletable ? (
                                            <Button
                                                icon={<DeleteOutlined />}
                                                danger
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setDocumentIdToDelete,
                                                        'delete'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                        {ThirdPartyDocumentModelV2.isSoftDeletable ? (
                                            <Button
                                                icon={<UnlockTwoTone twoToneColor="#b3cad6" />}
                                                onClick={() =>
                                                    confirmAction(
                                                        {
                                                            id: record.id,
                                                            status: configs.THIRD_PARTY_ADDRESS_STATUS_ENABLED
                                                        },
                                                        setReopenInfo,
                                                        'enable'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                    </Space>
                                )
                            }
                        ]}
                        searchable={false}
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { ThirdPartyDetailsExtra };
