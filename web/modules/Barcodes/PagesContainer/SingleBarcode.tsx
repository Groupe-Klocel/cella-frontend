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
import { DeleteOutlined, EditTwoTone } from '@ant-design/icons';
import {
    ContentSpin,
    HeaderContent,
    LinkButton,
    NumberOfPrintsModal,
    PageContentWrapper
} from '@components';
import { getModesFromPermissions, showError, showSuccess } from '@helpers';
import { Alert, Button, Modal, Space, Typography } from 'antd';
import { useAppState } from 'context/AppContext';
import { useAuth } from 'context/AuthContext';
import {
    DeleteBarcodeMutation,
    DeleteBarcodeMutationVariables,
    GetBarcodeByIdQuery,
    ModeEnum,
    Table,
    useDeleteBarcodeMutation,
    useGetBarcodeByIdQuery
} from 'generated/graphql';
import useTranslation from 'next-translate/useTranslation';
import { NextRouter } from 'next/router';
import { FC, useState } from 'react';
import { BarcodeDetails } from '../Elements/BarcodeDetails';
import { barcodesRoutes } from '../Static/barcodesRoutes';

export type SingleBarcodeTypeProps = {
    id: any;
    router: NextRouter;
};

const SingleBarcode: FC<SingleBarcodeTypeProps> = ({ id, router }: SingleBarcodeTypeProps) => {
    const { graphqlRequestClient } = useAuth();
    const { t } = useTranslation();
    const [showNumberOfPrintsModal, setShowNumberOfPrintsModal] = useState(false);

    const { isLoading, data, error } = useGetBarcodeByIdQuery<GetBarcodeByIdQuery, Error>(
        graphqlRequestClient,
        {
            id: id
        }
    );

    const { mutate, isLoading: deleteLoading } = useDeleteBarcodeMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: DeleteBarcodeMutation,
                _variables: DeleteBarcodeMutationVariables,
                _context: any
            ) => {
                router.back();
                if (!deleteLoading) {
                    showSuccess(t('messages:success-deleted'));
                }
            },
            onError: (err) => {
                showError(t('messages:error-deleting-data'));
            }
        }
    );

    const deleteBarcode = ({ id }: DeleteBarcodeMutationVariables) => {
        Modal.confirm({
            title: t('messages:delete-confirm'),
            onOk: () => {
                mutate({ id });
            },
            okText: t('messages:confirm'),
            cancelText: t('messages:cancel')
        });
    };

    const breadsCrumb = [
        ...barcodesRoutes,
        {
            breadcrumbName: `${data?.barcode?.name}`
        }
    ];

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.Barcode);

    return (
        <>
            {permissions ? (
                !modes.includes(ModeEnum.Read) ? (
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
                            title={`${t('common:barcode')}: ${data?.barcode?.name}`}
                            routes={breadsCrumb}
                            onBack={() => router.push('/barcodes')}
                            actionsRight={
                                <Space>
                                    <Button
                                        type="primary"
                                        onClick={() => setShowNumberOfPrintsModal(true)}
                                    >
                                        {t('actions:print-label')}
                                    </Button>
                                    <LinkButton
                                        icon={<EditTwoTone />}
                                        path={`/barcode/edit/${id}`}
                                    />
                                    <Button
                                        icon={<DeleteOutlined />}
                                        danger
                                        loading={deleteLoading}
                                        onClick={() => deleteBarcode({ id: id })}
                                    />
                                </Space>
                            }
                        />
                        <PageContentWrapper>
                            {/* {!!data}
                        <Typography >Content Does not exist</Typography> */}
                            {data && !isLoading ? (
                                data.barcode !== null ? (
                                    <>
                                        <BarcodeDetails details={data?.barcode} />
                                        {data?.barcode?.articleLuBarcodes[0].id !== null ? (
                                            <NumberOfPrintsModal
                                                showModal={{
                                                    showNumberOfPrintsModal,
                                                    setShowNumberOfPrintsModal
                                                }}
                                                id={data?.barcode?.articleLuBarcodes[0]?.id}
                                                path="/api/barcodes/print/label"
                                            />
                                        ) : (
                                            <></>
                                        )}
                                    </>
                                ) : (
                                    <Typography>Content Does not exist</Typography>
                                )
                            ) : (
                                <ContentSpin />
                            )}
                        </PageContentWrapper>
                    </>
                )
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

SingleBarcode.displayName = 'SingleBarcode';

export { SingleBarcode };
