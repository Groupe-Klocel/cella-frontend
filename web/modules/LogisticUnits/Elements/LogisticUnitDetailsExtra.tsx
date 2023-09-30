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
import { EyeTwoTone, PrinterOutlined } from '@ant-design/icons';
import { pathParams, getModesFromPermissions } from '@helpers';
import useTranslation from 'next-translate/useTranslation';
import { Button, Divider, Space, Typography } from 'antd';
import { useState } from 'react';
import { BarcodeRenderModal } from 'modules/Barcodes/Elements/BarcodeRenderModal';
import { useAppState } from 'context/AppContext';
import { ModeEnum, Table } from 'generated/graphql';
import { ListComponent } from 'modules/Crud/ListComponentV2';

const { Title } = Typography;

export interface IItemDetailsProps {
    logisticUnitId?: string | any;
}

const LogisticUnitDetailsExtra = ({ logisticUnitId }: IItemDetailsProps) => {
    return <></>;
};

export { LogisticUnitDetailsExtra };
