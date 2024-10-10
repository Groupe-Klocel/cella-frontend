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
import { UploadOutlined } from '@ant-design/icons';
import { AppHead, ContentSpin, HeaderContent } from '@components';
import { META_DEFAULTS, showError, showSuccess } from '@helpers';
import { Button, Layout, Upload } from 'antd';
import MainLayout from 'components/layouts/MainLayout';
import { useAuth } from 'context/AuthContext';
import {
    UploadFileMutation,
    UploadFileMutationVariables,
    useUploadFileMutation
} from 'generated/graphql';

import useTranslation from 'next-translate/useTranslation';
import Link from 'next/link';
import { FC, useState } from 'react';
import styled from 'styled-components';

type PageComponent = FC & { layout: typeof MainLayout };

const StyledPageContent = styled(Layout.Content)`
    margin: 0px 30px 50px 30px;
    padding: 0px 20px;
`;

const HandlingUnitsPage: PageComponent = () => {
    const { t } = useTranslation();

    const { graphqlRequestClient } = useAuth();

    const [uploadedFileUrl, setUploadedFileUrl] = useState('');

    const { mutate: uploadFileMutate, isPending: uploadFileLoading } = useUploadFileMutation<Error>(
        graphqlRequestClient,
        {
            onSuccess: (
                data: UploadFileMutation,
                _variables: UploadFileMutationVariables,
                _context: any
            ) => {
                if (data.uploadFile) setUploadedFileUrl(data.uploadFile.presignedUrl);
                showSuccess(t('messages:success-created'));
            },
            onError: () => {
                showError(t('messages:error-creating-data'));
            }
        }
    );

    const uploadFile = async (options: any) => {
        const { onSuccess, onError, file, onProgress } = options;
        uploadFileMutate({ stockOwnerId: 'soid', file: file });
    };

    const handleOnChange = (info: any) => {};

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <HeaderContent title={`File Upload`} routes={[]} />
            <StyledPageContent>
                <Upload
                    customRequest={uploadFile}
                    itemRender={(originNode, file, currFileList) => <></>}
                >
                    <Button icon={<UploadOutlined />}>Click to Upload</Button>
                </Upload>
                {uploadedFileUrl ? <Link href={uploadedFileUrl}>{uploadedFileUrl}</Link> : <></>}
                {uploadFileLoading ? <ContentSpin /> : <></>}
            </StyledPageContent>
        </>
    );
};

HandlingUnitsPage.layout = MainLayout;

export default HandlingUnitsPage;
