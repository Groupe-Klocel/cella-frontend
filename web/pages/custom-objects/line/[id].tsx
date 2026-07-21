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
import { AppHead, ContentSpin, LinkButton } from '@components';
import { CustomObjectLineModelV2 as model } from '@helpers';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useState } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { getModesFromPermissions } from '@helpers';
import { customObjectsRoutes as itemRoutes } from 'modules/CustomObjects/Static/customObjectsRoutes';
import { Button, Layout, Modal, Space, Typography } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import { DocumentPreview } from 'modules/CustomObjects/Elements/DocumentPreview';
import styled from 'styled-components';

const { Title } = Typography;

const StyledPageContent = styled(Layout.Content)`
    margin: 15px 30px;
`;

type PageComponent = FC & { layout: typeof MainLayout };

const CustomObjectLinePage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const [data, setData] = useState<any>();
    // router.query is empty on the first client render; normalize the id (a catch-all could yield an
    // array) and hold off rendering the detail component until it is available, so useDetail never
    // fires with an undefined id ($id: String!).
    const rawId = router.query.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const modes = getModesFromPermissions(permissions, model.tableName);

    const parentPath = data?.customObjectId
        ? `/custom-objects/${data.customObjectId}`
        : '/custom-objects';

    const breadcrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:custom-object-line')} ${data?.name}`;

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
        onBackRoute: parentPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`/custom-objects/line/edit/${id}`}
                        type="primary"
                    />
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
            {id ? (
                <>
                    <ItemDetailComponent
                        id={id}
                        headerData={headerData}
                        dataModel={model}
                        setData={setData}
                        triggerDelete={{ idToDelete, setIdToDelete }}
                        triggerSoftDelete={{ idToDisable, setIdToDisable }}
                    />
                    {data?.documentAttached ? (
                        <StyledPageContent>
                            <Title level={5}>{t('d:documentAttached')}</Title>
                            <DocumentPreview src={data.documentAttached} title={data?.name} />
                        </StyledPageContent>
                    ) : (
                        <></>
                    )}
                </>
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

CustomObjectLinePage.layout = MainLayout;

export default CustomObjectLinePage;
