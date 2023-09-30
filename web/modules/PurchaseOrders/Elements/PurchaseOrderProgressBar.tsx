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
import { Progress } from 'antd';
import { ProgressBar } from 'components/common/dumb/ProgressBar/ProgressBar';
import { useAuth } from 'context/AuthContext';
import configs from '../../../../common/configs.json';
import {
    GetAllPurchaseOrderLinesQuery,
    GetPurchaseOrderLineByIdQuery,
    useGetAllPurchaseOrderLinesQuery,
    useGetPurchaseOrderLineByIdQuery
} from 'generated/graphql';
import { FC, useEffect, useState } from 'react';

interface IPurchaseOrderProgressBarProps {
    id: string;
    status: number;
    done?: number;
}

const PurchaseOrderProgressBar = ({ id, status, done }: IPurchaseOrderProgressBarProps) => {
    const [value, setValue] = useState(status == configs.PURCHASE_ORDER_STATUS_CLOSED ? 100 : 0);
    const { graphqlRequestClient } = useAuth();

    const { isLoading, data, error } = useGetAllPurchaseOrderLinesQuery<
        GetAllPurchaseOrderLinesQuery,
        Error
    >(graphqlRequestClient, {
        filters: {
            purchaseOrderId: id as any
        },
        page: 1,
        itemsPerPage: 100
    });

    useEffect(() => {
        if (data?.purchaseOrderLines && !isLoading) {
            let sumQty = 0;
            let sumReceivedQty = 0;
            data?.purchaseOrderLines.results.forEach((poline: any) => {
                sumQty += poline.quantity;
                sumReceivedQty += poline.receivedQuantity;
            });

            if (sumQty > 0) {
                const v: number = (sumReceivedQty * 100) / sumQty;
                const decimals = 1;
                const factor = Math.pow(10, decimals || 0);
                const roundedV = Math.round(v * factor) / factor;
                setValue(roundedV);
            } else {
                setValue(0);
            }
        }
        if (done) {
            setValue(done);
        }
    }, [data]);

    return <Progress type="dashboard" percent={value} width={80} />;
};

export { PurchaseOrderProgressBar };
