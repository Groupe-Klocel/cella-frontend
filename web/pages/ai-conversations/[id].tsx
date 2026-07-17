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
import { AppHead } from '@components';
import { AiConversationModelV2 as model, AiMessageModelV2 } from '@helpers';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { ListComponent } from 'modules/Crud/ListComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { getModesFromPermissions } from '@helpers';
import { useAppState } from 'context/AppContext';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { aiConversationsRoutes as itemRoutes } from 'modules/AiConversations/Static/aiConversationsRoutes';
import { Button, Divider, Modal, Space } from 'antd';
import { ModeEnum } from 'generated/graphql';

type PageComponent = FC & { layout: typeof MainLayout };

const AiConversationPage: PageComponent = () => {
    const router = useRouter();
    const { permissions } = useAppState();
    const { t } = useTranslation();
    const [data, setData] = useState<any>();
    const modes = getModesFromPermissions(permissions, model.tableName);
    const messageModes = getModesFromPermissions(permissions, AiMessageModelV2.tableName);
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    // #region to customize information
    const breadCrumb = [
        ...itemRoutes,
        {
            // Fallback to '' (not the coerced string "undefined") until the detail loads, and for
            // conversations that have no title — matches the `?? ''` used by pageTitle below.
            breadcrumbName: data?.title ?? ''
        }
    ];

    const pageTitle = `${t('common:ai-conversation')} ${data?.title ?? ''}`;
    // #endregions

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = itemRoutes[itemRoutes.length - 1].path;

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
        routes: breadCrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
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

    const aiMessagesHeaderData: HeaderData = {
        title: t('common:ai-messages'),
        routes: [],
        actionsComponent: null
    };
    // #endregion

    return (
        <>
            <AppHead title={headerData.title} />
            <ItemDetailComponent
                id={id!}
                headerData={headerData}
                dataModel={model}
                setData={setData}
                triggerDelete={{ idToDelete, setIdToDelete }}
                triggerSoftDelete={{ idToDisable, setIdToDisable }}
            />
            {/* `typeof id === 'string'`: router.query.id is undefined on the first render — mounting
                the list then would fetch it once WITHOUT the conversationId filter. */}
            {messageModes.length > 0 &&
            messageModes.includes(ModeEnum.Read) &&
            typeof id === 'string' ? (
                <>
                    <Divider />
                    <ListComponent
                        searchCriteria={{ conversationId: id }}
                        dataModel={AiMessageModelV2}
                        headerData={aiMessagesHeaderData}
                        searchable={false}
                        triggerDelete={undefined}
                        triggerSoftDelete={undefined}
                        columnFilter={false}
                        sortDefault={[{ field: 'created', ascending: true }]}
                    />
                </>
            ) : (
                <></>
            )}
        </>
    );
};

AiConversationPage.layout = MainLayout;

export default AiConversationPage;
