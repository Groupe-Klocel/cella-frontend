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
import { FC } from 'react';
import { Descriptions, Grid, Typography } from 'antd';
import {
    formatDigits,
    formatUTCLocaleDateTime,
    isStringDateTime,
    formatUTCLocaleDate,
    isStringDate,
    isFloat
} from '@helpers';
import { CheckCircleOutlined, CloseSquareOutlined } from '@ant-design/icons';
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { isString } from 'lodash';
import { useRouter } from 'next/router';

export interface IDetailsListProps {
    details?: any;
    displayedLabels?: any;
    dataModelFieldGroups?: any;
    groupTitle?: any;
}

const DetailsList: FC<IDetailsListProps> = ({
    details,
    displayedLabels,
    groupTitle
}: IDetailsListProps) => {
    const { t } = useTranslation();
    const router = useRouter();
    const { Title } = Typography;
    // `md` is false under 768px (a phone, a narrow window). The grid then shows ONE label/value
    // pair per row: the two-column grid, i.e. four cells, squeezed into 390px made the browser
    // break every value letter by letter. The label width and cell padding for that case are in
    // styles/globals.css (`.details-list`). `screens` is empty on the server and on the very first
    // client render, so a page always starts from the desktop layout and re-renders once.
    const screens = Grid.useBreakpoint();
    const isNarrow = screens.md === false;
    const tmp_detail = { ...details };
    delete tmp_detail['id'];

    return (
        <>
            {groupTitle ? <Title level={5}>{t(`common:${groupTitle}`)}</Title> : <></>}
            <Descriptions
                className="details-list"
                style={
                    groupTitle
                        ? { marginTop: '10px', marginBottom: '20px' }
                        : // the 35px desktop gap is the room of the floating reload button of the
                          // detail screen; it is inline on a narrow screen
                          { marginTop: isNarrow ? '8px' : '35px' }
                }
                column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 2 }}
                size="small"
                bordered
            >
                {Object.keys(tmp_detail).map((key) => (
                    <Descriptions.Item
                        key={key}
                        label={
                            displayedLabels && key in displayedLabels
                                ? t(`d:${displayedLabels[key]}`)
                                : t(`d:${key}`)
                        }
                    >
                        {details[key] === true ? (
                            <CheckCircleOutlined style={{ color: 'green' }} />
                        ) : details[key] === false ? (
                            <CloseSquareOutlined style={{ color: 'red' }} />
                        ) : details[key] === null ? (
                            ' '
                        ) : isFloat(details[key]) ? (
                            formatDigits(details[key])
                        ) : isString(details[key]) && isStringDateTime(details[key]) ? (
                            key == 'value' &&
                            'featureCode_dateType' in details &&
                            !details['featureCode_dateType'] ? (
                                details[key]
                            ) : (
                                formatUTCLocaleDateTime(details[key], router.locale)
                            )
                        ) : isString(details[key]) && isStringDate(details[key]) ? (
                            key == 'value' &&
                            'featureCode_dateType' in details &&
                            !details['featureCode_dateType'] ? (
                                details[key]
                            ) : (
                                formatUTCLocaleDate(details[key], router.locale)
                            )
                        ) : isString(details[key]) && details[key].startsWith('data:image') ? (
                            <img
                                src={details[key]}
                                alt={`${key}_image`}
                                // 5% of a phone-wide cell is a dozen pixels: give the thumbnail
                                // a readable size there
                                style={{ maxWidth: isNarrow ? '50%' : '5%', height: 'auto' }}
                            />
                        ) : isString(details[key]) && details[key].startsWith('data:') ? (
                            ' '
                        ) : isString(details[key]) && /^https?:\/\//.test(details[key]) ? (
                            <a href={details[key]} target="_blank" rel="noopener noreferrer">
                                {details[key]}
                            </a>
                        ) : (
                            details[key]
                        )}
                    </Descriptions.Item>
                ))}
            </Descriptions>
        </>
    );
};

DetailsList.displayName = 'DetailsList';

export { DetailsList };
