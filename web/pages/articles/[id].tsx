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
import { ArticleModelV2 as model } from 'models/ArticleModelV2';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { META_DEFAULTS, getModesFromPermissions, showError, showInfo, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { articlesRoutes as itemRoutes } from 'modules/Articles/Static/articlesRoutes';
import { Button, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';
import configs from '../../../common/configs.json';
import { ArticleDetailsExtra } from 'modules/Articles/Elements/ArticleDetailsExtra';

type PageComponent = FC & { layout: typeof MainLayout };

const ArticlePage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();
    const [reopenInfo, setReopenInfo] = useState<any | undefined>();

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:article')} ${data?.name}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

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

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent:
            data?.status !== configs.ARTICLE_STATUS_CLOSED ? (
                <Space>
                    {modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable ? (
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
                    model.isSoftDeletable ? (
                        <Button
                            onClick={() => confirmAction(id as string, setIdToDisable, 'disable')()}
                            type="primary"
                        >
                            {t('actions:disable')}
                        </Button>
                    ) : (
                        <></>
                    )}
                    {modes.length > 0 && modes.includes(ModeEnum.Delete) && model.isDeletable ? (
                        <Button
                            onClick={() => confirmAction(id as string, setIdToDelete, 'delete')()}
                        >
                            {t('actions:delete')}
                        </Button>
                    ) : (
                        <></>
                    )}
                </Space>
            ) : (
                <Button
                    onClick={() =>
                        confirmAction(
                            { id, status: configs.ARTICLE_STATUS_IN_PROGRESS },
                            setReopenInfo,
                            'enable'
                        )()
                    }
                    type="primary"
                >
                    {t('actions:enable')}
                </Button>
            )
    };
    // #endregion
    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <ItemDetailComponent
                id={id!}
                extraDataComponent={
                    <ArticleDetailsExtra
                        articleId={id}
                        articleName={data?.name}
                        articleStatus={data?.status}
                        stockOwnerName={data?.stockOwner_name}
                        stockOwnerId={data?.stockOwnerId}
                    />
                }
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
                triggerReopen={{ reopenInfo, setReopenInfo }}
            />
        </>
    );
};

ArticlePage.layout = MainLayout;

export default ArticlePage;
