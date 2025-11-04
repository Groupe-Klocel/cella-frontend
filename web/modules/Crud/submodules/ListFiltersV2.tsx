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
import { Form, Input, Button, InputNumber, Checkbox, Select, DatePicker } from 'antd';
import { RangePickerProps } from 'antd/lib/date-picker';
import { debounce } from 'lodash';
import moment from 'moment';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import 'dayjs/locale/en';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { FC, useEffect, useState } from 'react';
import { FilterFieldType, FormDataType, FormOptionType } from '../../../models/ModelsV2';
import { useRouter } from 'next/router';
import { useAuth } from 'context/AuthContext';
import { isNumeric, pluralize } from '@helpers';
import { gql } from 'graphql-request';
import { ContentSpin } from '@components';
import fr_FR from 'antd/lib/date-picker/locale/fr_FR';
import en_US from 'antd/lib/date-picker/locale/en_US';
import 'moment/locale/fr';
import AutoComplete from '../../../components/common/smart/Form/MainInputs/AutoCompleteInput';
import StringInput from 'components/common/smart/Form/MainInputs/StringInput';
import NumberInput from 'components/common/smart/Form/MainInputs/NumberInput';
import TextAreaInput from 'components/common/smart/Form/MainInputs/TextAreaInput';
import SelectInput from 'components/common/smart/Form/MainInputs/SelectInput';
import DatePickerInput from 'components/common/smart/Form/MainInputs/DatePickerInput';
import RangePickerInput from 'components/common/smart/Form/MainInputs/RangePickerInput';
import CheckboxInput from 'components/common/smart/Form/MainInputs/CheckboxInput';
import { useAppState } from 'context/AppContext';

export interface IGeneralSearchProps {
    form: any;
    columns: Array<FilterFieldType>;
    allSubOptions?: any;
    setAllSubOptions?: any;
    handleSubmit?: any;
    selectCase?: string[];
    setSelectCase?: any;
    selectJoker?: string[];
    setSelectJoker?: any;
}

const ListFilters: FC<IGeneralSearchProps> = ({
    form,
    columns,
    allSubOptions,
    setAllSubOptions,
    handleSubmit,
    selectCase,
    setSelectCase,
    selectJoker,
    setSelectJoker
}: IGeneralSearchProps) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    let numberOfSubOptions = 0;
    columns.forEach((column) => {
        if (
            column.type === FormDataType.AutoComplete ||
            column.type === FormDataType.Dropdown ||
            column.type === FormDataType.Boolean
        ) {
            numberOfSubOptions += 1;
        }
    });

    if (numberOfSubOptions === allSubOptions?.length && isLoading) {
        setIsLoading(false);
    }

    moment.locale(router.locale);

    //enter key for form validation
    const handleKeyPress = (event: any) => {
        if (event.key === 'Enter') {
            handleSubmit();
        }
    };

    return (
        <>
            {isLoading && <ContentSpin />}
            <Form
                hidden={isLoading}
                form={form}
                layout="vertical"
                name="control-hooks"
                onKeyUp={handleKeyPress}
            >
                {columns?.map((item: FilterFieldType, index: number) => {
                    if (item.type === FormDataType.Number) {
                        return <NumberInput item={item} key={item.name + index} />;
                    } else if (item.type == FormDataType.String) {
                        return (
                            <StringInput
                                item={item}
                                key={item.name + index}
                                filtersParameters={
                                    selectCase && selectJoker
                                        ? {
                                              selectCase: selectCase,
                                              setSelectCase: setSelectCase,
                                              selectJoker: selectJoker,
                                              setSelectJoker: setSelectJoker
                                          }
                                        : undefined
                                }
                            />
                        );
                    } else if (item.type == FormDataType.TextArea) {
                        return <TextAreaInput item={item} key={item.name + index} />;
                    } else if (
                        item.type == FormDataType.Dropdown ||
                        item.type == FormDataType.Boolean
                    ) {
                        return (
                            <SelectInput
                                item={item}
                                key={item.name + index}
                                setAllSubOptions={setAllSubOptions}
                                mode="multiple"
                            />
                        );
                    } else if (item.type == FormDataType.Calendar) {
                        return <DatePickerInput item={item} key={item.name + index} />;
                    } else if (item.type == FormDataType.CalendarRange) {
                        return <RangePickerInput item={item} key={item.name + index} />;
                    } else if (item.type == FormDataType.AutoComplete) {
                        return (
                            <AutoComplete
                                item={item}
                                key={item.name}
                                setAllSubOptions={setAllSubOptions}
                            />
                        );
                    } else if (item.type == FormDataType.CheckBox) {
                        return <CheckboxInput item={item} key={item.name + index} />;
                    }
                })}
            </Form>
        </>
    );
};

ListFilters.displayName = 'ListFilters';

export { ListFilters };
