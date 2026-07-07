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
import { ReactNode } from 'react';

export type LanguageType = {
    name: string;
    code: string;
    flag: string;
};

export type MyColumnType = {
    key: React.Key;
    title: string;
    dataIndex?: string;
    disabled?: boolean;
    fixed?: boolean | string;
    render?: any;
};

export type ProfileMenuType = {
    key: string;
    title: string;
    path?: string;
    icon?: ReactNode;
    onClick?: any;
};

export type BreadcrumbType = {
    path?: string;
    breadcrumbName: string;
};

export type GroupType = {
    id: string;
    name: string;
};

export type DrawerType = {
    context: any;
    title: string;
    cancelButton: boolean;
    comfirmButton: boolean;
    cancelButtonTitle: string;
    comfirmButtonTitle: string;
    placement: 'top' | 'right' | 'bottom' | 'left' | undefined;
    content?: ReactNode;
    onComfirm?: Function;
    onCancel?: Function;
    onClose?: Function;
};

export type PaginationType = {
    total: number | undefined;
    current: number;
    itemsPerPage: number;
};

export type DataQueryType = {
    count: number;
    itemsPerPage: number;
    results: Array<any>;
    totalPages: number;
};
export type DataFilterType = {
    key: React.Key;
    disabled: boolean;
    title: string;
};

export type OnlyChildrenType = {
    children: ReactNode;
};

export type RequireKeys<T, TNames extends keyof T> = T & {
    [P in keyof T]-?: P extends TNames ? T[P] : never;
};

export type GraphQLResponseType = {
    [key: string]: any;
};

export type ButtonManagementType = {
    key?: string; // Optional stable identifier (language-independent) used to configure the button via the RF_PREPARATION_ACTION_BUTTONS parameter
    label: string;
    icon?: any;
    visibleOnSteps: number[];
    permissionsToSeeTheButton?: boolean; // Optional: if not provided, the button will be visible based on steps only
    onClick: (e?: any) => void;
    position: 'top' | 'bottom';
    style?: React.CSSProperties;
}[];

// Declarative configuration of the RadioInfosHeader rows (mirrors ButtonManagementType).
// Array order = display order; rows are kept in the config and toggled via `visible`.
export type HeaderManagementType = {
    label: string;
    value: any;
    visible: boolean;
    bold?: boolean;
    highlight?: boolean;
}[];
