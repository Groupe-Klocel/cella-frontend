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
import { MailTemplateModelV2 as model } from '@helpers';
import { HeaderData, ItemDetailComponent } from 'modules/Crud/ItemDetailComponentV2';
import { useRouter } from 'next/router';
import { FC, useMemo, useState } from 'react';
import MainLayout from '../../components/layouts/MainLayout';
import { getModesFromPermissions } from '@helpers';
import { mailTemplatesRoutes as itemRoutes } from 'modules/MailTemplates/Static/mailTemplatesRoutes';
import { Button, Layout, Modal, Space, Typography } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModeEnum } from 'generated/graphql';
import {
    MailTemplatePreview,
    decodeMailTemplateContent
} from 'modules/MailTemplates/Elements/MailTemplateContent';
import styled from 'styled-components';

const { Title } = Typography;

const StyledPageContent = styled(Layout.Content)`
    margin: 15px 30px;
`;

type PageComponent = FC & { layout: typeof MainLayout };

const MailTemplatePage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { permissions } = useAppState();
    const [data, setData] = useState<any>();
    const { id } = router.query;
    const [idToDelete, setIdToDelete] = useState<string | undefined>();
    const [idToDisable, setIdToDisable] = useState<string | undefined>();

    const modes = getModesFromPermissions(permissions, model.tableName);

    const breadcrumb = [
        ...itemRoutes,
        {
            breadcrumbName: `${data?.name}`
        }
    ];

    const pageTitle = `${t('common:mail-template')} ${data?.name}`;

    // #region handle standard buttons according to Model (can be customized when additional buttons are needed)
    const rootPath = (itemRoutes[itemRoutes.length - 1] as { path: string }).path;

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

    function downloadMailTemplate(base64Data: string, fileName: string) {
        // description holds the raw base64 of the html file (no data-url header)
        const actualBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        const byteCharacters = window.atob(actualBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName.match(/\.html?$/i) ? fileName : `${fileName}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const headerData: HeaderData = {
        title: pageTitle,
        routes: breadcrumb,
        onBackRoute: rootPath,
        actionsComponent: (
            <Space>
                {modes.length > 0 && modes.includes(ModeEnum.Read) && data?.description ? (
                    <Button
                        type="primary"
                        onClick={() => downloadMailTemplate(data.description, data.name)}
                    >
                        {t('actions:download')}
                    </Button>
                ) : (
                    <></>
                )}
                {modes.length > 0 && modes.includes(ModeEnum.Update) && model.isEditable ? (
                    <LinkButton
                        title={t('actions:edit')}
                        path={`${rootPath}/edit/${id}`}
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

    const content = useMemo(
        () => (data?.description ? decodeMailTemplateContent(data.description) : ''),
        [data?.description]
    );

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
            {content ? (
                <StyledPageContent>
                    <Title level={5}>{t('d:template')}</Title>
                    <MailTemplatePreview content={content} />
                </StyledPageContent>
            ) : (
                <></>
            )}
        </>
    );
};

MailTemplatePage.layout = MainLayout;

export default MailTemplatePage;
