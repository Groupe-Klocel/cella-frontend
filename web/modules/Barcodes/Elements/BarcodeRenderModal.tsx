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
import { DetailsList } from '@components';
import useTranslation from 'next-translate/useTranslation';
import { Input, Modal, Typography } from 'antd';
import { useState } from 'react';
import {
    RenderDocumentMutation,
    RenderDocumentMutationVariables,
    useRenderDocumentMutation
} from 'generated/graphql';
import { showError } from '@helpers';
import { useAuth } from 'context/AuthContext';

export interface IBarcodeRenderModalProps {
    visible: boolean;
    code: string;
    showhideModal: () => void;
}

const BarcodeRenderModal = ({ visible, showhideModal, code }: IBarcodeRenderModalProps) => {
    const { t } = useTranslation();
    const { graphqlRequestClient } = useAuth();

    const [pageNumber, setPageNumber] = useState(1);
    const [isModalVisible, setIsModalVisible] = useState(visible);

    const { mutate } = useRenderDocumentMutation<Error>(graphqlRequestClient, {
        onSuccess: (
            data: RenderDocumentMutation,
            _variables: RenderDocumentMutationVariables,
            _context: any
        ) => {
            if (data.renderDocument.__typename == 'RenderedDocument') {
                window.open(data.renderDocument.url, '_blank');
            }
        },
        onError: () => {
            showError(t('messages:error-barcode-not-render'));
        }
    });

    const handleCancel = () => {
        setIsModalVisible(false);
        showhideModal();
    };

    const onClickOk = () => {
        mutate({
            templateFilename: 'barcode_template.rml',
            context: {
                barcode_code: code,
                barcode_category: 'Code128',
                pages: pageNumber
            }
        });
        showhideModal();
    };
    return (
        <Modal title="Input Page Number" open={visible} onOk={onClickOk} onCancel={handleCancel}>
            <p>{t('actions:enter-page-number')}</p>
            <Input
                name="pages"
                type="number"
                min={0}
                max={100}
                value={pageNumber}
                onChange={(e) => {
                    setPageNumber(parseInt(e.target.value));
                }}
            />
        </Modal>
    );
};

export { BarcodeRenderModal };
