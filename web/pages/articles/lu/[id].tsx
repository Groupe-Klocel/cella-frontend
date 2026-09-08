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
import { AppHead, LinkButton } from '@components';
import { ArticleLuModelV2 as model } from '@helpers';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { META_DEFAULTS, getModesFromPermissions, pathParamsFromDictionary } from '@helpers';
import { articleLusRoutes as itemRoutes } from 'modules/Articles/Static/articleLusRoutes';
import { ArticleLuDetailsExtra } from 'modules/Articles/Elements/ArticleLuDetailsExtra';
import { Button, Modal, Space } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';

type PageComponent = FC & { layout: typeof MainLayout };

const ArticleLuPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const [data, setData] = useState<any>();
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const modes = getModesFromPermissions(permissions, model.tableName);

    const parentBreadcrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.article_name}`,
            path: '/articles/' + data?.articleId
        }
    ];
    const breadcrumb = [
        ...parentBreadcrumb,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const rootPathLu = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

    const title = data?.article_name + ' / ' + data?.name;
    const pageTitle = `${t('common:logistic-unit')} ${title}`;

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
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

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadcrumb,
        onBackRoute: rootPathLu,
        actionsComponent: (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable ? (
                    <LinkButton
                        title={t('actions:edit')}
                        // same query params as the packaging list passes, so the edit screen
                        // gets its name whichever way it is reached - its <AppHead> title is built
                        // from router.query.name and otherwise reads "edit undefined" from here.
                        path={pathParamsFromDictionary(`${rootPathLu}/edit/[id]`, {
                            id: id,
                            articleId: data?.articleId,
                            articleName: data?.article_name,
                            name: data?.name
                        })}
                        type="primary"
                    />
                ) : (
                    <></>
                )}
                {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isSoftDeletable ? (
                    <Button
                        onClick={() => confirmAction(id as string, setIdToDisable)()}
                        type="primary"
                    >
                        {t('actions:disable')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isDeletable ? (
                    <Button onClick={() => confirmAction(id as string, setIdToDelete)()}>
                        {t('actions:delete')}
                    </Button>
                ) : (
                    <></>
                )}
            </Space>
        )
    };

    return (
        <>
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                id={id!}
                extraDataComponent={
                    <ArticleLuDetailsExtra
                        articleLuId={id}
                        articleLuName={data?.name}
                        articleLuStatus={data?.status}
                        articleId={data?.articleId}
                        articleName={data?.article_name}
                        stockOwnerId={data?.stockOwnerId}
                        stockOwnerName={data?.stockOwner_name}
                    />
                }
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
            />
        </>
    );
};

ArticleLuPage.layout = MainLayout;

export default ArticleLuPage;
