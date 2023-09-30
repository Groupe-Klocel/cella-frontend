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
import { LanguageType } from '@helpers';

const isoLangs: Array<LanguageType> = [
    {
        name: 'English',
        code: 'en-US',
        flag: '/images/usa.png'
    },
    {
        name: 'Français',
        code: 'fr',
        flag: '/images/fr.png'
    }
];

// PAgination setting
const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_ITEMS_PER_PAGE = 20;

export { isoLangs, DEFAULT_PAGE_NUMBER, DEFAULT_ITEMS_PER_PAGE };
