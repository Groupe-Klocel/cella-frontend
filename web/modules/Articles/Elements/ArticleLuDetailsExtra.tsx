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
    BarcodeOutlined,
    DeleteOutlined,
    EditTwoTone,
    EyeTwoTone,
    LockTwoTone
} from '@ant-design/icons';
import { LinkButton, NumberOfPrintsModalV2 } from '@components';
import {
    ArticleLuBarcodeModelV2,
    getModesFromPermissions,
    pathParams,
    pathParamsFromDictionary,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { Button, Divider, Modal, Space } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { useState } from 'react';
import configs from '../../../../common/configs.json';

export interface IArticleLuDetailsExtraProps {
    articleLuId?: string | any;
    articleLuName?: string | any;
    articleLuStatus?: number | any;
    articleId?: string | any;
    articleName?: string | any;
    stockOwnerId?: string | any;
    stockOwnerName?: string | any;
}

/**
 * Barcodes of ONE packaging, shown below its detail.
 *
 * The article detail already lists barcodes, but flat for the whole article: it cannot tell which
 * barcode belongs to which packaging. Here the list is filtered on `articleLuId`, which is the
 * whole point of the section.
 *
 * `noDBSave` keeps this table out of the user's column settings for the packaging list, which is
 * keyed on the route and would otherwise be shared.
 */
const ArticleLuDetailsExtra = ({
    articleLuId,
    articleLuName,
    articleLuStatus,
    articleId,
    articleName,
    stockOwnerId,
    stockOwnerName
}: IArticleLuDetailsExtraProps) => {
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const articleLuBarcodeModes = getModesFromPermissions(permissions, Table.ArticleLuBarcode);
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);
    const [idToPrint, setIdToPrint] = useState<string>();

    const articleLuBarcodeHeaderData: HeaderData = {
        title: t('common:associated', { name: t('common:barcodes') }),
        routes: [],
        actionsComponent:
            articleLuBarcodeModes.length > 0 &&
            articleLuBarcodeModes.includes(ModeEnum.Create) &&
            // The parent record arrives after the first paint, and `status != CLOSED` is also true
            // while status is undefined - without this the link would be built with undefined
            // article/stock-owner query values.
            articleId &&
            articleLuStatus != configs.ARTICLE_LU_STATUS_CLOSED ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:barcode') })}
                    path={pathParamsFromDictionary('/articles/barcode/add', {
                        articleId: articleId,
                        articleName: articleName,
                        stockOwnerId: stockOwnerId,
                        stockOwnerName: stockOwnerName,
                        // pre-selects this packaging in the form and comes back here afterwards,
                        // instead of dropping the user on the article detail
                        articleLuId: articleLuId,
                        articleLuName: articleLuName,
                        returnPath: `/articles/lu/${articleLuId}`
                    })}
                    type="primary"
                />
            ) : null
    };

    const confirmAction = (id: string | undefined, setId: any) => {
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
            {articleLuBarcodeModes.length > 0 && articleLuBarcodeModes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ articleLuId: articleLuId }}
                        dataModel={ArticleLuBarcodeModelV2}
                        headerData={articleLuBarcodeHeaderData}
                        triggerDelete={{ idToDelete, setIdToDelete }}
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
                                                    confirmAction(record.id, setIdToDisable)()
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
                                                    confirmAction(record.id, setIdToDelete)()
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
                        noDBSave={true}
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

export { ArticleLuDetailsExtra };
