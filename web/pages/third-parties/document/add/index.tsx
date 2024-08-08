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
import { AppHead, HeaderContent } from '@components';
import { useRouter } from 'next/router';
import { FC } from 'react';
import MainLayout from '../../../../components/layouts/MainLayout';
import { ThirdPartyDocumentModelV2 } from 'models/ThirdPartyDocumentModelV2';
import { AddItemComponent } from 'modules/Crud/AddItemComponentV2';
import useTranslation from 'next-translate/useTranslation';
import { addThirdPartyRoutes } from 'modules/ThirdParties/Static/thirdPartiesRoutes';
import { META_DEFAULTS } from '@helpers';
import parameters from '../../../../../common/parameters.json';
import { AddDocuments } from 'modules/ThirdParties/PagesContainer/AddDocuments';

type PageComponent = FC & { layout: typeof MainLayout };

const AddThirdPartyPage: PageComponent = () => {
    const { t } = useTranslation();
    const router = useRouter();

    //enter between {} the default values for the form (for instance status "In progress"))
    const defaultValues = {
        category: parameters.CUSTOM_OBJECT_CATEGORY_THIRD_PARTY_DOCUMENT,
        thirdPartyId: router.query.thirdPartyId
    };

    return (
        <>
            <AppHead title={META_DEFAULTS.title} />
            <AddDocuments
                thirdPartyId={router.query.thirdPartyId}
                thirdPartyName={router.query.thirdPartyName}
            />
        </>
    );
};

AddThirdPartyPage.layout = MainLayout;

export default AddThirdPartyPage;
