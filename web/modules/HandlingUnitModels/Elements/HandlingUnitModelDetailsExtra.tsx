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
import { DetailsList } from '@components';

// backend default (bee_v2 HandlingUnitModel.cubing_max_fill_rate)
const DEFAULT_CUBING_MAX_FILL_RATE = 100;

// Inside volume usable by the auto cubing, as the custom_cubing function builds its containers:
// each inside dimension when > 0, else the outside one, times cubingMaxFillRate (a percentage).
// In the cube of the dimensions' unit, no conversion.
// Not an API field: computed from the flattened detail record, which must therefore request the
// dimensions and cubingMaxFillRate (they are in the model).
const computeUsableInsideVolume = (record: any): number | null => {
    if (!record) return null;
    const dimension = (inside: number | null, outside: number | null) =>
        inside && inside > 0 ? inside : (outside ?? 0);
    const length = dimension(record.insideLength, record.length);
    const width = dimension(record.insideWidth, record.width);
    const height = dimension(record.insideHeight, record.height);
    if (length <= 0 || width <= 0 || height <= 0) return null;
    const fillRate = record.cubingMaxFillRate ?? DEFAULT_CUBING_MAX_FILL_RATE;
    return Math.round(length * width * height * fillRate) / 100;
};

export interface IItemDetailsProps {
    handlingUnitModelId?: string | any;
    // flattened detail record, as given by ItemDetailComponent's setData
    data?: any;
}

const HandlingUnitModelDetailsExtra = ({ data }: IItemDetailsProps) => {
    if (!data) return <></>;
    return <DetailsList details={{ usableInsideVolume: computeUsableInsideVolume(data) }} />;
};

export { HandlingUnitModelDetailsExtra };
