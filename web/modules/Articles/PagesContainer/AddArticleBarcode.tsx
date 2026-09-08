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
import { ContentSpin, HeaderContent } from '@components';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import styled from 'styled-components';
import { Alert, Form, Layout } from 'antd';
import { useRouter } from 'next/router';
import { articlesRoutes } from '../Static/articlesRoutes';
import { safeReturnPath } from '../Static/articleLusRoutes';
import { AddArticleBarcodeForm } from '../Forms/AddArticleBarcodeForm';
import { ModeEnum, Table } from 'generated/graphql';
import { useAppState } from 'context/AppContext';
import { getModesFromPermissions } from '@helpers';

const StyledPageContent = styled(Layout.Content)`
    margin: 15px 30px;
`;

export interface ISingleItemProps {
    articleId: string | any;
    articleName: string | any;
    stockOwnerId: string | any;
    stockOwnerName: string | any;
    // filled in when the barcode is added from a packaging detail
    articleLuId?: string;
    articleLuName?: string;
    returnPath?: string;
}

const AddArticleBarcode = (props: ISingleItemProps) => {
    const { t } = useTranslation('actions');
    const router = useRouter();

    const articleDetailBreadCrumb = [
        ...articlesRoutes,
        {
            breadcrumbName: `${props.articleName}`,
            path: '/articles/' + props.articleId
        },
        // when coming from a packaging, keep it in the trail. The name can be missing from
        // the query string while the id is there, and a crumb labelled "undefined" helps nobody -
        // fall back to the id.
        ...(props.articleLuId
            ? [
                  {
                      breadcrumbName: `${props.articleLuName ?? props.articleLuId}`,
                      path: '/articles/lu/' + props.articleLuId
                  }
              ]
            : [])
    ];
    const breadsCrumb = [
        ...articleDetailBreadCrumb,
        {
            breadcrumbName: t('add2', { name: t('common:barcode') })
        }
    ];

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.ArticleLuBarcode);

    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Create) ? (
                    <>
                        <Alert
                            message={t('messages:error')}
                            description={t('errors:APP-000200')}
                            type="error"
                            showIcon
                        />
                    </>
                ) : (
                    <>
                        <HeaderContent
                            title={t('add2', { name: t('common:barcode') })}
                            routes={breadsCrumb}
                            onBack={() =>
                                router.push(
                                    safeReturnPath(
                                        props?.returnPath,
                                        '/articles/' + props?.articleId
                                    )
                                )
                            }
                        />
                        <StyledPageContent>
                            <AddArticleBarcodeForm
                                articleId={props.articleId}
                                articleName={props.articleName}
                                stockOwnerId={props.stockOwnerId}
                                stockOwnerName={props.stockOwnerName}
                                articleLuId={props.articleLuId}
                                returnPath={props.returnPath}
                            />
                        </StyledPageContent>
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

export { AddArticleBarcode };
