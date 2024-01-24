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
import { LinkButton } from '@components';
import { DeleteOutlined, EditTwoTone, EyeTwoTone, LockTwoTone } from '@ant-design/icons';
import {
    pathParams,
    getModesFromPermissions,
    pathParamsFromDictionary,
    showSuccess,
    showError
} from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Button, Divider, Modal, Space, Typography } from 'antd';
import { useAppState } from 'context/AppContext';
import {
    DeleteArticleSetDetailMutation,
    DeleteArticleSetDetailMutationVariables,
    ModeEnum,
    Table,
    useDeleteArticleSetDetailMutation
} from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { ArticleSetDetailModelV2 } from 'models/ArticleSetDetailModelV2';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { useState } from 'react';

const { Title } = Typography;

export interface IItemDetailsProps {
    articleSetId?: string | any;
    articleSetName?: string | any;
    stockOwnerId?: string | any;
    stockOwnerName?: string | any;
    articleId?: number | any;
    articleName?: string | any;
}

const ArticleSetDetailsExtra = ({
    articleSetId,
    articleSetName,
    stockOwnerId,
    stockOwnerName,
    articleId,
    articleName
}: IItemDetailsProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.ArticleSetDetail);
    const router = useRouter();

    const articleSetDetailHeaderData: HeaderData = {
        title: t('common:set-details'),
        routes: [],
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Create) ? (
                <LinkButton
                    title={t('actions:add2', { name: t('common:set-detail') })}
                    path={pathParamsFromDictionary('/article-sets/detail/add', {
                        articleSetId: articleSetId,
                        articleSetName: articleSetName,
                        stockOwnerId: stockOwnerId,
                        stockOwnerName: stockOwnerName,
                        articleId: articleId,
                        articleName: articleName
                    })}
                    type="primary"
                />
            ) : null
    };

    // DELETE
    const { mutate: DeleteMutate, isLoading: deleteLoading } =
        useDeleteArticleSetDetailMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: DeleteArticleSetDetailMutation,
                _variables: DeleteArticleSetDetailMutationVariables,
                _context: any
            ) => {
                if (!deleteLoading) {
                    if (data.deleteArticleSetDetail) {
                        showSuccess(t('messages:success-deleted'));
                        router.reload();
                    } else {
                        showError(t('messages:error-delete-set-impossible'));
                    }
                }
            },
            onError: (err) => {
                showError(t('messages:error-deleting-data'));
            }
        });

    const deleteArticleSetDetail = ({ id }: DeleteArticleSetDetailMutationVariables) => {
        Modal.confirm({
            title: t('messages:delete-confirm'),
            onOk: () => {
                DeleteMutate({ id });
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
            {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ articleId: articleId }}
                        dataModel={ArticleSetDetailModelV2}
                        headerData={articleSetDetailHeaderData}
                        routeDetailPage={'/article-sets/detail/:id'}
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
                                        {modes.length > 0 && modes.includes(ModeEnum.Read) ? (
                                            <LinkButton
                                                icon={<EyeTwoTone />}
                                                path={pathParams(
                                                    '/article-sets/detail/[id]',
                                                    record.id
                                                )}
                                            />
                                        ) : (
                                            <></>
                                        )}
                                        {modes.length > 0 &&
                                        modes.includes(ModeEnum.Update) &&
                                        ArticleSetDetailModelV2.isEditable ? (
                                            <LinkButton
                                                icon={<EditTwoTone />}
                                                path={pathParamsFromDictionary(
                                                    '/article-sets/detail/edit/[id]',
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
                                        {modes.length > 0 &&
                                        modes.includes(ModeEnum.Delete) &&
                                        ArticleSetDetailModelV2.isSoftDeletable ? (
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
                                        ArticleSetDetailModelV2.isDeletable ? (
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
export { ArticleSetDetailsExtra };
