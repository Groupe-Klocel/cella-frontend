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
export const IS_DEV = process.env.APP_ENV === 'development';
export const IS_PROD = process.env.APP_ENV === 'production';
export const IS_FAKE = process.env.NEXT_PUBLIC_FAKE_DATA_ON === 'true';
export const IS_SAME_SEED = process.env.NEXT_PUBLIC_SAME_SEED_ON === 'true';
export const IS_LS_SECURED = process.env.NEXT_PUBLIC_LS_SECURE === 'true';
export const WMS_URL = process.env.NEXT_PUBLIC_WMS_URL;
