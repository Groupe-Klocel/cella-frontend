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
import { AppHead } from '@components';
import MainLayout from 'components/layouts/MainLayout';
import { AddBlockLocations } from 'modules/Blocks/PagesContainer/AddBlockLocation';
import { useRouter } from 'next/router';
import { FC } from 'react';
import { useTranslationWithFallback as useTranslation } from '@helpers';

type PageComponent = FC & { layout: typeof MainLayout };

const AddBlockLocationPage: PageComponent = () => {
    const router = useRouter();
    const { t } = useTranslation();

    return (
        <>
            <AppHead title={t('actions:add-location')} />
            <AddBlockLocations
                blockId={router.query.blockId}
                blockName={router.query.blockName}
                buildingName={router.query.buildingName}
            />
        </>
    );
};

AddBlockLocationPage.layout = MainLayout;

export default AddBlockLocationPage;
