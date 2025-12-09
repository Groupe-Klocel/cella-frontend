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
import { useAuth } from 'context/AuthContext';
import configs from '../../../common/configs.json';
import {
    GetAllArticlesQuery,
    useGetAllArticlesQuery,
    useGetAllBarcodesQuery,
    GetAllBarcodesQuery,
    useGetArticleIdsQuery,
    GetArticleIdsQuery,
    useGetMyInfoQuery,
    GetMyInfoQuery,
    useGetAllCarriersQuery,
    GetAllCarriersQuery,
    useGetCarrierIdsQuery,
    GetCarrierIdsQuery,
    useGetAllBlocksQuery,
    GetAllBlocksQuery,
    GetAllLocationsQuery,
    useGetAllLocationsQuery,
    GetLocationIdsQuery,
    useGetLocationIdsQuery,
    GetPurchaseOrderIdsQuery,
    useGetPurchaseOrderIdsQuery,
    GetAllBuildingsQuery,
    useGetAllBuildingsQuery,
    useGetAllPurchaseOrdersQuery,
    GetAllPurchaseOrdersQuery,
    useGetAllPurchaseOrderLinesQuery,
    GetAllPurchaseOrderLinesQuery,
    ListParametersForAScopeQuery,
    useListParametersForAScopeQuery,
    useGetAllEquipmentQuery,
    GetAllEquipmentQuery,
    useGetAllEquipmentDetailsQuery,
    GetAllEquipmentDetailsQuery,
    useGetAllPatternsQuery,
    GetAllPatternsQuery,
    useGetStockOwnerIdsQuery,
    GetStockOwnerIdsQuery,
    GetAllPatternPathsQuery,
    useGetAllPatternPathsQuery,
    useGetPatternIdsQuery,
    GetPatternIdsQuery,
    useGetPatternPathLocationsQuery,
    GetPatternPathLocationsQuery,
    useGetAllFeatureCodesQuery,
    GetAllFeatureCodesQuery,
    useGetAllParamsQuery,
    GetAllParamsQuery,
    useGetAllFeatureTypeDetailsQuery,
    GetAllFeatureTypeDetailsQuery,
    useGetAllArticleSetQuery,
    GetAllArticleSetQuery,
    useGetAllArticleSetDetailsQuery,
    GetAllArticleSetDetailsQuery,
    useGetSimpleArticleLusQuery,
    GetSimpleArticleLusQuery,
    useGetLogisticUnitIdsQuery,
    GetLogisticUnitIdsQuery,
    useGetAllLogisticUnitsQuery,
    GetAllLogisticUnitsQuery,
    GetArticleLuBarcodesQuery,
    useGetArticleLuBarcodesQuery,
    useGetAllBoxLinesQuery,
    GetAllBoxLinesQuery,
    useGetHandlingUnitModelIdsQuery,
    GetHandlingUnitModelIdsQuery,
    useGetDeliveryLineIdsQuery,
    GetDeliveryLineIdsQuery,
    useGetBlockIdsQuery,
    GetBlockIdsQuery,
    useGetEquipmentIdsQuery,
    GetEquipmentIdsQuery,
    useGetBoxIdsQuery,
    GetBoxIdsQuery,
    useGetRoundIdsQuery,
    GetRoundIdsQuery,
    GetWarehousesQuery,
    useGetWarehousesQuery,
    useGetPurchaseOrderLineIdsQuery,
    GetPurchaseOrderLineIdsQuery,
    useGetWarehouseWorkersQuery,
    GetWarehouseWorkersQuery,
    useGetRolesQuery,
    GetRolesQuery,
    useGetAllPermissionsQuery,
    GetAllPermissionsQuery,
    useGetAllHandlingUnitModelsQuery,
    GetAllHandlingUnitModelsQuery,
    useGetAllConfigsQuery,
    GetAllConfigsQuery,
    useGetAllStockOwnersQuery,
    GetAllStockOwnersQuery,
    useGetRuleVersionIdsQuery,
    GetRuleVersionIdsQuery,
    useGetRuleVersionConfigIdsQuery,
    GetRuleVersionConfigIdsQuery,
    useGetOrderLineIdsQuery,
    GetOrderLineIdsQuery,
    useGetCarrierShippingModeIdsQuery,
    GetCarrierShippingModeIdsQuery,
    useSimpleGetAllCarrierShippingModesQuery,
    SimpleGetAllCarrierShippingModesQuery,
    useGetHandlingUnitsQuery,
    GetHandlingUnitsQuery,
    useGetAllHandlingUnitContentsQuery,
    GetAllHandlingUnitContentsQuery
} from 'generated/graphql';
import { useRouter } from 'next/router';
import parameters from '../../../common/parameters.json';

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

const useArticleIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const articles = useGetArticleIdsQuery<Partial<GetArticleIdsQuery>, Error>(
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

const useArticleWithBarcodes = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'id',
        ascending: false
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const articles = useGetArticleLuBarcodesQuery<Partial<GetArticleLuBarcodesQuery>, Error>(
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

const useArticleLus = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'id',
        ascending: false
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const articleLus = useGetSimpleArticleLusQuery<Partial<GetSimpleArticleLusQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return articleLus;
};

const useArticleSets = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const articleSets = useGetAllArticleSetQuery<Partial<GetAllArticleSetQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return articleSets;
};

const useArticleSetDetails = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const articleSetDetails = useGetAllArticleSetDetailsQuery<
        Partial<GetAllArticleSetDetailsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return articleSetDetails;
};

const useBlocks = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const blocks = useGetAllBlocksQuery<Partial<GetAllBlocksQuery>, Error>(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return blocks;
};
const useLocations = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const locations = useGetAllLocationsQuery<Partial<GetAllLocationsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return locations;
};

const useLocationIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const locations = useGetLocationIdsQuery<Partial<GetLocationIdsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return locations;
};

const useBarcodes = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const barcodes = useGetAllBarcodesQuery<Partial<GetAllBarcodesQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return barcodes;
};

const useBoxLines = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

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

    const boxLines = useGetAllBoxLinesQuery<Partial<GetAllBoxLinesQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage,
            language: router.locale
        }
    );

    return boxLines;
};

const useBuildings = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const buildings = useGetAllBuildingsQuery<Partial<GetAllBuildingsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return buildings;
};

const useCarriers = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const carriers = useGetAllCarriersQuery<Partial<GetAllCarriersQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );
    return carriers;
};

const useCarrierIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const carriers = useGetCarrierIdsQuery<Partial<GetCarrierIdsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return carriers;
};

const useGetCarrierShippingModes = (
    search: any,
    page: number,
    itemsPerPage: number,
    sort: any,
    language = 'en'
) => {
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

    const carrierShippingModes = useSimpleGetAllCarrierShippingModesQuery<
        Partial<SimpleGetAllCarrierShippingModesQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage,
        language: language
    });

    return carrierShippingModes;
};

const useCarrierShippingModeIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const carrierShippingModes = useGetCarrierShippingModeIdsQuery<
        Partial<GetCarrierShippingModeIdsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return carrierShippingModes;
};

const useConfigs = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortBy = {
        field: 'code',
        ascending: true
    };

    let newSort;

    if (sort === null) {
        newSort = sortBy;
    } else {
        newSort = sort;
    }

    const configs = useGetAllConfigsQuery<Partial<GetAllConfigsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return configs;
};

const useDeliveryLineIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const deliveryLineIds = useGetDeliveryLineIdsQuery<Partial<GetDeliveryLineIdsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return deliveryLineIds;
};

const useEquipment = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const equipment = useGetAllEquipmentQuery<Partial<GetAllEquipmentQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return equipment;
};

const useEquipmentDetails = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const equipmentDetails = useGetAllEquipmentDetailsQuery<
        Partial<GetAllEquipmentDetailsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return equipmentDetails;
};

const useMyInfo = () => {
    const { graphqlRequestClient } = useAuth();

    const myInfo = useGetMyInfoQuery<Partial<GetMyInfoQuery>, Error>(graphqlRequestClient);

    return myInfo;
};

const useFeatureCodes = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    // default sort by creation date
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

    const featureCodes = useGetAllFeatureCodesQuery<Partial<GetAllFeatureCodesQuery>, Error>(
        graphqlRequestClient,

        {
            filters: search,

            orderBy: newSort,

            page: page,

            itemsPerPage: itemsPerPage
        }
    );

    return featureCodes;
};

const useFeatureTypes = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    // default sort by creation date
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

    // inject filter on scope
    const defaultFilter = { scope: 'feature_type' };

    let newFilter;

    if (search === null) {
        newFilter = defaultFilter;
    } else {
        newFilter = { ...search, ...defaultFilter };
    }

    const featureTypes = useGetAllParamsQuery<Partial<GetAllParamsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: newFilter,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return featureTypes;
};

const useFeatureTypeDetails = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const featureTypeDetails = useGetAllFeatureTypeDetailsQuery<
        Partial<GetAllFeatureTypeDetailsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return featureTypeDetails;
};

const useParams = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortBy = {
        field: 'code',
        ascending: true
    };

    let newSort;

    if (sort === null) {
        newSort = sortBy;
    } else {
        newSort = sort;
    }

    const params = useGetAllParamsQuery<Partial<GetAllParamsQuery>, Error>(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return params;
};

const useActionCodes = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    // default sort by creation date
    const sortByDate = {
        field: 'code',
        ascending: true
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    // inject filter on scope
    const defaultFilter = { scope: 'action_code' };

    let newFilter;

    if (search === null) {
        newFilter = defaultFilter;
    } else {
        newFilter = { ...search, ...defaultFilter };
    }

    const actionCodes = useGetAllParamsQuery<Partial<GetAllParamsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: newFilter,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return actionCodes;
};

const useReturnCodes = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    // default sort by creation date
    const sortByDate = {
        field: 'code',
        ascending: true
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    // inject filter on scope
    const defaultFilter = { scope: 'return_code' };

    let newFilter;

    if (search === null) {
        newFilter = defaultFilter;
    } else {
        newFilter = { ...search, ...defaultFilter };
    }

    const returnCodes = useGetAllParamsQuery<Partial<GetAllParamsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: newFilter,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return returnCodes;
};

const useStockOwners = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const stockOwners = useGetAllStockOwnersQuery<Partial<GetAllStockOwnersQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return stockOwners;
};

const useStockOwnerIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const stockOwners = useGetStockOwnerIdsQuery<Partial<GetStockOwnerIdsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return stockOwners;
};

const usePurchaseOrders = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const purchaseOrders = useGetAllPurchaseOrdersQuery<Partial<GetAllPurchaseOrdersQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return purchaseOrders;
};

const usePurchaseOrderLines = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const poLines = useGetAllPurchaseOrderLinesQuery<Partial<GetAllPurchaseOrderLinesQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return poLines;
};
const usePurchaseOrderLineIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const purchaseOrderLineIds = useGetPurchaseOrderLineIdsQuery<
        Partial<GetPurchaseOrderLineIdsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return purchaseOrderLineIds;
};

const useStockStatuses = () => {
    const { graphqlRequestClient } = useAuth();
    const stockStatuses = useListParametersForAScopeQuery<
        Partial<ListParametersForAScopeQuery>,
        Error
    >(graphqlRequestClient, {
        scope: 'stock_statuses'
    });

    return stockStatuses;
};

const usePatterns = (
    search: any,
    page: number,
    itemsPerPage: number,
    sort: any,
    language = 'en'
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

    const patterns = useGetAllPatternsQuery<Partial<GetAllPatternsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage,
            language: language
        }
    );

    return patterns;
};

const usePatternPaths = (
    search: any,
    page: number,
    itemsPerPage: number,
    sort: any,
    language = 'en'
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

    const patternPaths = useGetAllPatternPathsQuery<Partial<GetAllPatternPathsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage,
            language: language
        }
    );

    return patternPaths;
};

const usePatternIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const patterns = useGetPatternIdsQuery<Partial<GetPatternIdsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return patterns;
};

const usePatternPathLocations = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'order',
        ascending: false
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const patternPathLocations = useGetPatternPathLocationsQuery<
        Partial<GetPatternPathLocationsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return patternPathLocations;
};

const usePurchaseOrderIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const purchaseOrders = useGetPurchaseOrderIdsQuery<Partial<GetPurchaseOrderIdsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return purchaseOrders;
};

const useLogisticUnits = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const logisticUnits = useGetAllLogisticUnitsQuery<Partial<GetAllLogisticUnitsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return logisticUnits;
};

const useLogisticUnitIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const logisticUnits = useGetLogisticUnitIdsQuery<Partial<GetLogisticUnitIdsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return logisticUnits;
};

const useHandlingUnitModels = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'name',
        ascending: true
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const defaultFilter = { status: configs.HANDLING_UNIT_MODEL_STATUS_IN_PROGRESS };
    let newFilter = defaultFilter;
    if (search !== null) {
        newFilter = { ...search, ...defaultFilter };
    }

    const handlingUnitModels = useGetAllHandlingUnitModelsQuery<
        Partial<GetAllHandlingUnitModelsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return handlingUnitModels;
};

const useHandlingUnitModelIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const handlingUnitModel = useGetHandlingUnitModelIdsQuery<
        Partial<GetHandlingUnitModelIdsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return handlingUnitModel;
};

const useGetHandlingUnits = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'name',
        ascending: true
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const handlingUnits = useGetHandlingUnitsQuery<Partial<GetHandlingUnitsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return handlingUnits;
};
const useGetHandlingUnitContents = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();
    const router = useRouter();

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

    const hucs = useGetAllHandlingUnitContentsQuery<
        Partial<GetAllHandlingUnitContentsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage,
        language: router.locale
    });

    return hucs;
};
const useBlockIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const blocks = useGetBlockIdsQuery<Partial<GetBlockIdsQuery>, Error>(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return blocks;
};

const useEquipmentIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const equipments = useGetEquipmentIdsQuery<Partial<GetEquipmentIdsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return equipments;
};

const useBoxIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const boxes = useGetBoxIdsQuery<Partial<GetBoxIdsQuery>, Error>(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return boxes;
};

const useRoundIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const rounds = useGetRoundIdsQuery<Partial<GetRoundIdsQuery>, Error>(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return rounds;
};

const useGetWarehouses = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const warehouses = useGetWarehousesQuery<Partial<GetWarehousesQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return warehouses;
};

const useGetWarehouseWorkers = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortByDate = {
        field: 'username',
        ascending: false
    };

    let newSort;

    if (sort === null) {
        newSort = sortByDate;
    } else {
        newSort = sort;
    }

    const warehouseWorkers = useGetWarehouseWorkersQuery<Partial<GetWarehouseWorkersQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return warehouseWorkers;
};

const useGetRoles = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const roles = useGetRolesQuery<Partial<GetRolesQuery>, Error>(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return roles;
};

const useGetPermissions = (search: any, page: number, itemsPerPage: number, sort: any) => {
    const { graphqlRequestClient } = useAuth();

    const sortBy = {
        field: 'table',
        ascending: true
    };

    let newSort;

    if (sort === null) {
        newSort = sortBy;
    } else {
        newSort = sort;
    }

    const permissions = useGetAllPermissionsQuery<Partial<GetAllPermissionsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return permissions;
};

const useRuleVersionIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const ruleVersionIds = useGetRuleVersionIdsQuery<Partial<GetRuleVersionIdsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return ruleVersionIds;
};

const useRuleVersionConfigIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const ruleVersionConfigIds = useGetRuleVersionConfigIdsQuery<
        Partial<GetRuleVersionConfigIdsQuery>,
        Error
    >(graphqlRequestClient, {
        filters: search,
        orderBy: newSort,
        page: page,
        itemsPerPage: itemsPerPage
    });

    return ruleVersionConfigIds;
};

const useOrderLineIds = (search: any, page: number, itemsPerPage: number, sort: any) => {
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

    const orderLineIds = useGetOrderLineIdsQuery<Partial<GetOrderLineIdsQuery>, Error>(
        graphqlRequestClient,
        {
            filters: search,
            orderBy: newSort,
            page: page,
            itemsPerPage: itemsPerPage
        }
    );

    return orderLineIds;
};

export {
    useArticles,
    useArticleLus,
    useBlocks,
    useBlockIds,
    useBoxIds,
    useBoxLines,
    useBuildings,
    useCarriers,
    useCarrierIds,
    useCarrierShippingModeIds,
    useConfigs,
    useEquipment,
    useEquipmentIds,
    useEquipmentDetails,
    useArticleSets,
    useArticleSetDetails,
    useLocations,
    useLocationIds,
    useBarcodes,
    useFeatureCodes,
    useFeatureTypes,
    useFeatureTypeDetails,
    useArticleIds,
    useMyInfo,
    useParams,
    useActionCodes,
    useReturnCodes,
    usePatterns,
    useStockOwners,
    useStockOwnerIds,
    usePatternPaths,
    usePatternIds,
    usePatternPathLocations,
    usePurchaseOrders,
    usePurchaseOrderLines,
    useRoundIds,
    useStockStatuses,
    usePurchaseOrderIds,
    useArticleWithBarcodes,
    useLogisticUnits,
    useLogisticUnitIds,
    useDeliveryLineIds,
    useGetWarehouses,
    usePurchaseOrderLineIds,
    useGetWarehouseWorkers,
    useGetRoles,
    useGetPermissions,
    useHandlingUnitModels,
    useRuleVersionIds,
    useRuleVersionConfigIds,
    useOrderLineIds,
    useGetCarrierShippingModes,
    useGetHandlingUnits,
    useGetHandlingUnitContents
};
