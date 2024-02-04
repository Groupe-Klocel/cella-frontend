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
import { useState } from 'react';
import { useAuth } from 'context/AuthContext';
import {
    GetAllArticlesQuery,
    GetArticleLuBarcodeIdsQuery,
    GetHandlingUnitContentsQuery,
    GetHandlingUnitInboundsQuery,
    GetHandlingUnitsQuery,
    GetLocationIdsQuery,
    GetAllBoxesQuery,
    useGetAllArticlesQuery,
    useGetArticleLuBarcodeIdsQuery,
    useGetHandlingUnitContentsQuery,
    useGetHandlingUnitInboundsQuery,
    useGetHandlingUnitsQuery,
    useGetLocationIdsQuery,
    useGetAllBoxesQuery,
    useGetLoadsQuery,
    GetLoadsQuery,
    useGetHandlingUnitContentFeaturesQuery,
    GetHandlingUnitContentFeaturesQuery
} from 'generated/graphql';

const useDrawerState = (initialState: { isOpen: boolean; drawerProps: any }) => {
    const [isOpen, setIsOpen] = useState(initialState.isOpen);
    const [drawerProps, setDrawerProps] = useState(initialState.drawerProps);

    const setDrawerState = ({ isOpen, drawerProps = {} }: any) => {
        setIsOpen(isOpen);
        setDrawerProps(drawerProps);
    };

    return [{ isOpen, drawerProps }, setDrawerState];
};

const useArticles = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'created',
        ascending: false
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const articles = useGetAllArticlesQuery<Partial<GetAllArticlesQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return articles;
};

const useArticleLuBarcodeIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'created',
        ascending: false
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const articleLuBarcode = useGetArticleLuBarcodeIdsQuery<
        Partial<GetArticleLuBarcodeIdsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return articleLuBarcode;
};

const useBoxes = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'created',
        ascending: false
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const boxes = useGetAllBoxesQuery<Partial<GetAllBoxesQuery>, Error>(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return boxes;
};

const useHandlingUnits = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'name',
        ascending: false
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const hu = useGetHandlingUnitsQuery<Partial<GetHandlingUnitsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return hu;
};

const useHandlingUnitInbounds = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'created',
        ascending: false
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const hu_inbounds = useGetHandlingUnitInboundsQuery<
        Partial<GetHandlingUnitInboundsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return hu_inbounds;
};

const useHandlingUnitOutbounds = (
    search: any,
    advancedSearch: any,
    page: number,
    itemsPerPage: number,
    sort: any
) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'created',
        ascending: false
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const hu_outbounds = useGetAllBoxesQuery<Partial<GetAllBoxesQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return hu_outbounds;
};

const useHandlingUnitContents = (
    search: any,
    page: number,
    itemsPerPage: number,
    sort: any,
    language: any
) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'quantity',
        ascending: false
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const hu_contents = useGetHandlingUnitContentsQuery<
        Partial<GetHandlingUnitContentsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage,
        language: language
    });

    return hu_contents;
};

const useHandlingUnitContentFeatures = (
    search: any,
    page: number,
    itemsPerPage: number,
    sort: any,
    language: any
) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'created',
        ascending: false
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const hu_content_features = useGetHandlingUnitContentFeaturesQuery<
        Partial<GetHandlingUnitContentFeaturesQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage,
        language: language
    });

    return hu_content_features;
};

const useLocationIds = (
    search: any,
    page: number,
    itemsPerPage: number,
    sort: any,
    language: any
) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'created',
        ascending: false
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const locations = useGetLocationIdsQuery<Partial<GetLocationIdsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage,
            language: language
        }
    );

    return locations;
};

const useLoadIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'created',
        ascending: false
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const loads = useGetLoadsQuery<Partial<GetLoadsQuery>, Error>(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return loads;
};

export {
    useDrawerState,
    useArticles,
    useArticleLuBarcodeIds,
    useBoxes,
    useLocationIds,
    useHandlingUnits,
    useHandlingUnitContents,
    useHandlingUnitContentFeatures,
    useHandlingUnitInbounds,
    useHandlingUnitOutbounds,
    useLoadIds
};
