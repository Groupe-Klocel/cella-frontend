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
import MainLayout from 'components/layouts/MainLayout';
import { AddCustomObjectLine } from 'modules/CustomObjects/PagesContainer/AddCustomObjectLine';
import { useRouter } from 'next/router';
import { FC } from 'react';
import { Result } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

const AddCustomObjectLinePage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();
    // router.query is empty on the first render and a param can arrive as an array — normalise it
    // and wait until the parent id is known before rendering the form (avoids a missing FK).
    const rawId = router.query.customObjectId;
    const customObjectId = Array.isArray(rawId) ? rawId[0] : rawId;
    // A line can only be created under a parent custom object. If the router has resolved and there
    // is still no parent id (page opened via a direct URL / bookmark), show an error with a way
    // back instead of spinning forever.
    const missingParent = router.isReady && !customObjectId;

    return (
        <>
            <AppHead title={t('actions:add2', { name: t('common:custom-object-line') })} />
            {customObjectId ? (
                <AddCustomObjectLine customObjectId={customObjectId} />
            ) : missingParent ? (
                <Result
                    status="warning"
                    title={t('messages:no-data')}
                    extra={
                        <LinkButton
                            title={t('menu:custom-objects')}
                            path="/custom-objects"
                            type="primary"
                        />
                    }
                />
            ) : (
                <ContentSpin />
            )}
        </>
    );
};

AddCustomObjectLinePage.layout = MainLayout;

export default AddCustomObjectLinePage;
