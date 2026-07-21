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
import { AppHead, ContentSpin } from '@components';
import { useRouter } from 'next/router';
import { FC } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { EditCustomObject } from 'modules/CustomObjects/PagesContainer/EditCustomObject';
import { useTranslationWithFallback as useTranslation } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

const EditCustomObjectPage: PageComponent = () => {
    const router = useRouter();
    // router.query is empty on the first client render; normalize the id and wait for it before
    // mounting the edit container, so its useDetail never fires with an undefined id ($id: String!).
    const rawId = router.query.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { t } = useTranslation();

    return (
        <>
            <AppHead title={`${t('actions:edit')} ${t('common:custom-object')}`} />
            {id ? <EditCustomObject id={id} router={router} /> : <ContentSpin />}
        </>
    );
};

EditCustomObjectPage.layout = MainLayout;

export default EditCustomObjectPage;
