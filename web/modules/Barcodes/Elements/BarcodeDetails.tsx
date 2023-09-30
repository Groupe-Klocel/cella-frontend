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

export type BarcodeDetailsTypeProps = {
    details?: any;
};

const BarcodeDetails = ({ details }: BarcodeDetailsTypeProps) => {
    const { t } = useTranslation();

    const refurbDetails = {
        ...details,
        associatedStockOwner: details.stockOwner.name,
        articleDescription: details.articleLuBarcodes[0].article.description,
        articleName: details.articleLuBarcodes[0].article.name,
        rotationText: details.rotationText == 'To be defined' ? '-' : details.rotationText
    };
    delete refurbDetails['stockOwner'];
    delete refurbDetails['rotation'];
    delete refurbDetails['preparationMode'];
    delete refurbDetails['id'];
    delete refurbDetails['stockOwnerId'];
    delete refurbDetails['articleLuBarcodes'];

    return (
        <>
            <DetailsList details={refurbDetails} />
        </>
    );
};

export { BarcodeDetails };
