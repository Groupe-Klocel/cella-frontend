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
import { LinkButton, NumberOfPrintsModal } from '@components';
import { Space, Button, Form, Modal } from 'antd';
import { articlesRoutes } from 'modules/Articles/Static/articlesRoutes';
import { useTranslationWithFallback as useTranslation } from '@helpers';

import { FC, useState } from 'react';
import { useRouter } from 'next/router';
import { HeaderContent } from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { useAppState } from 'context/AppContext';
import { ModelType } from 'models/Models';
import {
    DeleteArticleLuBarcodeMutation,
    DeleteArticleLuBarcodeMutationVariables,
    ModeEnum,
    UpdateBarcodeMutation,
    UpdateBarcodeMutationVariables,
    useDeleteArticleLuBarcodeMutation,
    useUpdateBarcodeMutation
} from 'generated/graphql';
import { useAuth } from 'context/AuthContext';

export interface ISingleItemProps {
    id: string | any;
    name: string | any;
    dataModel: ModelType;
    articleId: string | any;
    articleName: string | any;
    barcodeId: string | any;
    barcodeName: string | any;
}

const ArticleLuBarcodeDetailsHeader: FC<ISingleItemProps> = (props: ISingleItemProps) => {
    const router = useRouter();
    const { graphqlRequestClient } = useAuth();

    const { t } = useTranslation();
    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, props.dataModel.tableName);
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);
    const { id } = router.query;

    const articleDetailBreadCrumb = [
        ...articlesRoutes,
        {
            breadcrumbName: `${props.articleName}`,
            path: '/articles/' + props.articleId
        }
    ];
    const breadsCrumb = [
        ...articleDetailBreadCrumb,
        {
            breadcrumbName: `${props.name}`
        }
    ];

    // To delete ArticleLuBarcode
    const [form] = Form.useForm();
    const formData = form.getFieldsValue(true);

    // To Update Barcode as blacklisted
    const {
        mutate: UpdateBarcode,
        isPending: updateLoading,
        data
    } = useUpdateBarcodeMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: UpdateBarcodeMutation,
            _variables: UpdateBarcodeMutationVariables,
            _context: any
        ) => {
            router.push(`/articles/${props.articleId}`);
            showSuccess(t('messages:success-updated'));
        },
        onError: (error) => {
            showError(t('messages:error-update-data'));
        }
    });

    const { mutate: DeleteArticleLuBarcode, isPending: deleteLoading } =
        useDeleteArticleLuBarcodeMutation<Error>(graphqlRequestClient, {
            onSuccess: (
                data: DeleteArticleLuBarcodeMutation,
                _variables: DeleteArticleLuBarcodeMutationVariables,
                _context: any
            ) => {
                // Update Barcode as blacklisted
                formData['blacklisted'] = true;
                UpdateBarcode({ id: props.barcodeId, input: formData });
            },
            onError: () => {
                showError(t('messages:error-deleting-data'));
            }
        });

    const deleteArticleLuBarcode = ({ id }: DeleteArticleLuBarcodeMutationVariables) => {
        Modal.confirm({
            title: t('messages:delete-confirm'),
            onOk: () => {
                DeleteArticleLuBarcode({ id });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const title = props.articleName + ' / ' + props.name;

    return (
        <>
            <HeaderContent
                title={`${t('common:barcode')} ${title}`}
                routes={breadsCrumb}
                onBack={() => router.push('/articles/' + props.articleId)}
                actionsRight={
                    <Space>
                        <Button type="primary" onClick={() => setShowNumberOfPrintsModal(true)}>
                            {t('actions:print-label')}
                        </Button>
                        {modes.length > 0 && modes.includes(ModeEnum.Update) ? (
                            <LinkButton
                                title={t('actions:edit')}
                                path={`/articles/barcode/edit/${props.id}`}
                                type="primary"
                            />
                        ) : (
                            <></>
                        )}
                        {modes.length > 0 && modes.includes(ModeEnum.Delete) ? (
                            <Button
                                loading={deleteLoading}
                                onClick={() => deleteArticleLuBarcode({ id: props.id })}
                            >
                                {t('actions:delete')}
                            </Button>
                        ) : (
                            <></>
                        )}
                    </Space>
                }
            />
            <NumberOfPrintsModal
                showModal={{
                    showNumberOfPrintsModal,
                    setShowNumberOfPrintsModal
                }}
                id={props.id}
                path="/api/barcodes/print/label"
            />
        </>
    );
};

export { ArticleLuBarcodeDetailsHeader };
