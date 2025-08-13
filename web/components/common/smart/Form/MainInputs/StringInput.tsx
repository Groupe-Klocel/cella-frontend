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
import { Form, Input } from 'antd';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC } from 'react';
import CaseJokerButton from '../SubInputs/CaseJokerButton';

export interface IDraggerInputProps {
    item: {
        name: string;
        displayName?: string;
        initialValue?: string;
        maxLength?: number;
    };
    key?: string;
    filtersParameters?: {
        selectCase: string[];
        setSelectCase: React.Dispatch<React.SetStateAction<string[]>>;
        selectJoker: string[];
        setSelectJoker: React.Dispatch<React.SetStateAction<string[]>>;
    };
}

const StringInput: FC<IDraggerInputProps> = ({ item, filtersParameters }) => {
    const { t } = useTranslation();

    return (
        <Form.Item
            name={item.name}
            label={item.displayName ? item.displayName : t(`d:${item.name}`)}
            normalize={(value) => (value ? value : undefined)}
            initialValue={item?.initialValue ? item?.initialValue : undefined}
        >
            <Input
                maxLength={item.maxLength ? item.maxLength : 100}
                allowClear
                suffix={
                    filtersParameters && (
                        <CaseJokerButton
                            item={item}
                            selectCase={filtersParameters.selectCase}
                            setSelectCase={filtersParameters.setSelectCase}
                            selectJoker={filtersParameters.selectJoker}
                            setSelectJoker={filtersParameters.setSelectJoker}
                        />
                    )
                }
            />
        </Form.Item>
    );
};

StringInput.displayName = 'StringInput';

export default StringInput;
