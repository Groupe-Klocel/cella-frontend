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
import { META_DEFAULTS } from '@helpers';
import { ManagePatternPathLocation } from 'modules/PatternPaths/PagesContainer/ManagePatternPathLocation';
import { useRouter } from 'next/router';
import { FC } from 'react';
import MainLayout from '../../../components/layouts/MainLayout';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

type PageComponent = FC & { layout: typeof MainLayout };

const ManagePatternPathLocationPage: PageComponent = () => {
    const router = useRouter();
    return (
        <DndProvider backend={HTML5Backend}>
            <AppHead title={META_DEFAULTS.title} />
            <ManagePatternPathLocation
                router={router}
                id={router.query.id!}
                name={router.query.name!}
                patternName={router.query.patternName!}
            />
        </DndProvider>
    );
};

ManagePatternPathLocationPage.layout = MainLayout;

export default ManagePatternPathLocationPage;
