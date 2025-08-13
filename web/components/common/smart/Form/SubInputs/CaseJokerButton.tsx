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
import { Button } from 'antd';
import { FC } from 'react';

export interface IDraggerInputProps {
    item: {
        name: string;
        displayName?: string;
        initialValue?: string;
        maxLength?: number;
    };
    selectCase: string[];
    setSelectCase: React.Dispatch<React.SetStateAction<string[]>>;
    selectJoker: string[];
    setSelectJoker: React.Dispatch<React.SetStateAction<string[]>>;
}

const CaseJokerButton: FC<IDraggerInputProps> = ({
    item,
    selectCase,
    setSelectCase,
    selectJoker,
    setSelectJoker
}) => {
    return (
        <>
            <Button
                type={selectCase.includes(item.name) ? 'default' : 'primary'}
                onClick={() =>
                    setSelectCase((prev) =>
                        prev.includes(item.name)
                            ? prev.filter((e) => e !== item.name)
                            : [...prev, item.name]
                    )
                }
            >
                Aa
            </Button>
            <Button
                type={selectJoker.find((e: string) => e === item.name) ? 'primary' : 'default'}
                onClick={() =>
                    setSelectJoker((prev) =>
                        prev.includes(item.name)
                            ? prev.filter((e) => e !== item.name)
                            : [...prev, item.name]
                    )
                }
            >
                %
            </Button>
        </>
    );
};

CaseJokerButton.displayName = 'CaseJokerButton';

export default CaseJokerButton;
