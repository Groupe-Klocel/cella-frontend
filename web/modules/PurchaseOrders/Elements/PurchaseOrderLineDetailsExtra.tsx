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
import { LinkButton } from '@components';
import { EyeTwoTone } from '@ant-design/icons';
import { pathParams, getModesFromPermissions } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Divider, Space, Typography } from 'antd';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { HeaderData, ListComponent } from 'modules/Crud/ListComponent';

const { Title } = Typography;

export interface IItemDetailsProps {
    purchaseOrderLineId?: string | any;
    status?: number | any;
    type?: number | any;
}

const PurchaseOrderLineDetailsExtra = ({
    purchaseOrderLineId,
    status,
    type
}: IItemDetailsProps) => {
    const { t } = useTranslation();

    const { permissions } = useAppState();
    const modes = getModesFromPermissions(permissions, Table.PurchaseOrderLine);

    return <></>;
};

export { PurchaseOrderLineDetailsExtra };
