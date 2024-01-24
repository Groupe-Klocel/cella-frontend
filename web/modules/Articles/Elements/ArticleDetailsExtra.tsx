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
import { LinkButton, NumberOfPrintsModal, NumberOfPrintsModalV2 } from '@components';
import {
    BarcodeOutlined,
    DeleteOutlined,
    EditTwoTone,
    EyeTwoTone,
    PrinterOutlined,
    LockTwoTone
} from '@ant-design/icons';
import { pathParams, getModesFromPermissions, pathParamsFromDictionary } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Button, Divider, Modal, Space, Typography } from 'antd';
import { useState } from 'react';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { ArticleLuBarcodeModelV2 } from 'models/ArticleLuBarcodeModelV2';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { ArticleLuModelV2 } from 'models/ArticleLuModelV2';
import configs from '../../../../common/configs.json';

const { Title } = Typography;

export interface IItemDetailsProps {
    articleId?: string | any;
    articleName?: string | any;
    articleStatus?: number | any;
    stockOwnerId?: string | any;
    stockOwnerName?: string | any;
}

const ArticleDetailsExtra = ({
    articleId,
    articleName,
    articleStatus,
    stockOwnerId,
    stockOwnerName
}: IItemDetailsProps) => {
    const { t } = useTranslation();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [articleLuBarcodeIdToDelete, setArticleLuBarcodeIdToDelete] = useState<
        string | undefined
    >();
    const [articleLuIdToDelete, setArticleLuIdToDelete] = useState<string | undefined>();

    const { permissions } = useAppState();
    const articleLuModes = getModesFromPermissions(permissions, Table.ArticleLu);
    const articleLuBarcodeModes = getModesFromPermissions(permissions, Table.ArticleLuBarcode);
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();

    const articleLuHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:logistic-units') }),
        routes: [],
        actionsComponent:
            articleLuModes.length > 0 &&
            articleLuModes.includes(ModeEnum.Create) &&
            articleStatus != configs.ARTICLE_STATUS_CLOSED ? (
                <LinkButton
                    title={t('actions:associate', { name: t('common:logistic-unit') })}
                    path={pathParamsFromDictionary('/articles/lu/add', {
                        articleId: articleId,
                        articleName: articleName,
                        stockOwnerId: stockOwnerId,
                        stockOwnerName: stockOwnerName
                    })}
                    type="primary"
                />
            ) : null
    };

    const articleLuBarcodeHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:barcodes') }),
        routes: [],
        actionsComponent:
            articleLuBarcodeModes.length > 0 &&
            articleLuBarcodeModes.includes(ModeEnum.Create) &&
            articleStatus != configs.ARTICLE_STATUS_CLOSED ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:barcode') })}
                    path={pathParamsFromDictionary('/articles/barcode/add', {
                        articleId: articleId,
                        articleName: articleName,
                        stockOwnerId: stockOwnerId,
                        stockOwnerName: stockOwnerName
                    })}
                    type="primary"
                />
            ) : null
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
            {articleLuModes.length > 0 && articleLuModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ articleId: articleId }}
                        dataModel={ArticleLuModelV2}
                        headerData={articleLuHeaderData}
                        routeDetailPage={'/articles/lu/:id'}
                        triggerDelete={{
                            idToDelete: articleLuIdToDelete,
                            setIdToDelete: setArticleLuIdToDelete
                        }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
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
                                }) => (
                                    <Space>
                                        {articleLuModes.length > 0 &&
                                        articleLuModes.includes(ModeEnum.Read) ? (
                                            <LinkButton
                                                icon={<EyeTwoTone />}
                                                path={pathParams('/articles/lu/[id]', record.id)}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {articleLuModes.length > 0 &&
                                        articleLuModes.includes(ModeEnum.Update) &&
                                        ArticleLuModelV2.isEditable ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/articles/lu/edit/[id]',
                                                    {
                                                        id: record.id,
                                                        articleId: record?.articleId,
                                                        articleName: record?.article_name,
                                                        name: record?.name
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {articleLuModes.length > 0 &&
                                        articleLuModes.includes(ModeEnum.Delete) &&
                                        ArticleLuModelV2.isSoftDeletable ? (
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
                                        {articleLuModes.length > 0 &&
                                        articleLuModes.includes(ModeEnum.Delete) &&
                                        ArticleLuModelV2.isDeletable ? (
                                            <Button
                                                icon={<DeleteOutlined />}
                                                danger
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setArticleLuIdToDelete,
                                                        'delete'
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
            {articleLuBarcodeModes.length > 0 && articleLuBarcodeModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ articleId: articleId }}
                        dataModel={ArticleLuBarcodeModelV2}
                        headerData={articleLuBarcodeHeaderData}
                        triggerDelete={{
                            idToDelete: articleLuBarcodeIdToDelete,
                            setIdToDelete: setArticleLuBarcodeIdToDelete
                        }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
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
                                }) => (
                                    <Space>
                                        {articleLuBarcodeModes.length > 0 &&
                                        articleLuBarcodeModes.includes(ModeEnum.Read) ? (
                                            <LinkButton
                                                icon={<EyeTwoTone />}
                                                path={pathParams(
                                                    '/articles/barcode/[id]',
                                                    record.id
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {articleLuBarcodeModes.length > 0 &&
                                        articleLuBarcodeModes.includes(ModeEnum.Update) &&
                                        ArticleLuBarcodeModelV2.isEditable ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/articles/barcode/edit/[id]',
                                                    {
                                                        id: record.id,
                                                        articleId: record?.articleId,
                                                        articleName: record?.article_name,
                                                        barcodeId: record?.barcodeId,
                                                        barcodeName: record?.barcode_name,
                                                        name: record?.barcode_name
                                                    }
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {articleLuBarcodeModes.length > 0 &&
                                        articleLuBarcodeModes.includes(ModeEnum.Delete) &&
                                        ArticleLuBarcodeModelV2.isSoftDeletable ? (
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
                                        {articleLuBarcodeModes.length > 0 &&
                                        articleLuBarcodeModes.includes(ModeEnum.Delete) &&
                                        ArticleLuBarcodeModelV2.isDeletable ? (
                                            <Button
                                                icon={<DeleteOutlined />}
                                                danger
                                                onClick={() =>
                                                    confirmAction(
                                                        record.id,
                                                        setArticleLuBarcodeIdToDelete,
                                                        'delete'
                                                    )()
                                                }
                                            ></Button>
                                        ) : (
                                            <></>
                                        )}
                                        <Button
                                            type="primary"
                                            ghost
                                            onClick={() => {
                                                setShowNumberOfPrintsModal(true);
                                                setIdToPrint(record.id as string);
                                            }}
                                            icon={<BarcodeOutlined />}
                                        />
                                    </Space>
                                )
                            }
                        ]}
                        searchable={false}
                    />
                    <NumberOfPrintsModalV2
                        showModal={{
                            showNumberOfPrintsModal,
                            setShowNumberOfPrintsModal
                        }}
                        dataToPrint={{ id: idToPrint }}
                        documentName="K_BarcodeLabel"
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

export { ArticleDetailsExtra };
