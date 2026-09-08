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
import { DeleteOutlined, EditTwoTone, EyeTwoTone, UnlockTwoTone } from '@ant-design/icons';
import { AppHead, LinkButton } from '@components';
import {
    getModesFromPermissions,
    pathParams,
    pathParamsFromDictionary,
    useTranslationWithFallback as useTranslation
} from '@helpers';
import { ArticleLuModelV2 as model } from '@helpers';
import { Button, Modal, Space } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { EditArticleLusRenderModal } from 'modules/Articles/Forms/EditArticleLusModal';
import { articleLusRoutes as itemRoutes } from 'modules/Articles/Static/articleLusRoutes';
import { ActionButtons, HeaderData, ListComponent } from 'modules/Crud/ListComponentV2';
import { FC, Key, useState } from 'react';
import configs from '../../../../common/configs.json';

type PageComponent = FC & { layout: typeof MainLayout };

/**
 * Packaging management screen.
 *
 * Same shape as /articles: the generic list plus row selection and a bulk-edit modal. It exists so
 * that packagings can be reviewed and corrected without opening each article detail one by one -
 * hence the article header columns and filters coming from modelsSpe/ArticleLuSpeModel.ts.
 *
 * There is deliberately no "create" button: a packaging belongs to an article, and
 * AddArticleLogisticUnit needs its articleId/articleName/stockOwnerId/stockOwnerName. Creation
 * stays on the article detail.
 */
const ArticleLuPages: PageComponent = () => {
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [tableData, setTableData] = useState<any[]>([]);
    const [reopenInfo, setReopenInfo] = useState<any | undefined>();
    const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [refetch, setRefetch] = useState<boolean>(false);

    const headerData: HeaderData = {
        title: t('common:logistic-units'),
        routes: itemRoutes,
        actionsComponent: null
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

    const hasSelected = selectedRowKeys.length > 0;

    // Selection is accumulated across server-paginated pages: keys of the pages the user has left
    // are kept, only the keys belonging to the page currently displayed can be unselected.
    const onSelectChange = (newSelectedRowKeys: any[]) => {
        selectedRowKeys.forEach((key: string) => {
            if (!newSelectedRowKeys.includes(key) && tableData.map((d) => d.id).includes(key)) {
                setSelectedRowKeys((prevKeys: Key[]) => prevKeys.filter((k) => k !== key));
            }
        });
        newSelectedRowKeys.forEach((value: string) => {
            if (!selectedRowKeys?.includes(value)) {
                setSelectedRowKeys((prevKeys: Key[]) => [...prevKeys, value]);
            }
        });
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        getCheckboxProps: (record: any) => ({
            disabled: record.status == configs.ARTICLE_LU_STATUS_CLOSED ? true : false
        })
    };

    const actionButtons: ActionButtons = {
        actionsComponent:
            modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                <>
                    <span className="selected-span" style={{ marginLeft: 16 }}>
                        {hasSelected
                            ? `${t('messages:selected-items-number', {
                                  number: selectedRowKeys.length
                              })}`
                            : ''}
                    </span>
                    <span style={{ marginLeft: 16 }}>
                        <Button
                            type="primary"
                            onClick={() => {
                                setShowModal(true);
                            }}
                            disabled={!hasSelected}
                        >
                            {t('actions:edit')}
                        </Button>
                    </span>
                    <EditArticleLusRenderModal
                        visible={showModal}
                        rows={rowSelection}
                        showhideModal={() => {
                            setShowModal(!showModal);
                        }}
                        setRefetch={() => {
                            setRefetch(!refetch);
                        }}
                        setSelectedRowKeys={setSelectedRowKeys}
                    />
                </>
            ) : null
    };

    return (
        <>
            <AppHead title={t('common:logistic-units')} />
            <ListComponent
                headerData={headerData}
                dataModel={model}
                actionButtons={actionButtons}
                rowSelection={rowSelection}
                refetch={refetch}
                setData={setTableData}
                checkbox={true}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                triggerReopen={{ reopenInfo, setReopenInfo }}
                actionColumns={[
                    {
                        title: 'actions:actions',
                        key: 'actions',
                        render: (record: {
                            id: string;
                            name: string;
                            status: number;
                            articleId: string;
                            article_name: string;
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
                                record.status != configs.ARTICLE_LU_STATUS_CLOSED ? (
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={pathParamsFromDictionary(`${rootPath}/edit/[id]`, {
                                            id: record.id,
                                            articleId: record?.articleId,
                                            articleName: record?.article_name,
                                            name: record?.name
                                        })}
                                    />
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Delete) &&
                                model.isDeletable ? (
                                    <Button
                                        icon={<DeleteOutlined />}
                                        onClick={() =>
                                            confirmAction(record.id, setIdToDelete, 'delete')()
                                        }
                                    ></Button>
                                ) : (
                                    <></>
                                )}
                                {modes.length > 0 &&
                                modes.includes(ModeEnum.Update) &&
                                record.status == configs.ARTICLE_LU_STATUS_CLOSED ? (
                                    <Button
                                        icon={<UnlockTwoTone twoToneColor="#b3cad6" />}
                                        onClick={() =>
                                            confirmAction(
                                                {
                                                    id: record.id,
                                                    status: configs.ARTICLE_LU_STATUS_IN_PROGRESS
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
                routeDetailPage={`${rootPath}/:id`}
            />
        </>
    );
};

ArticleLuPages.layout = MainLayout;

export default ArticleLuPages;
