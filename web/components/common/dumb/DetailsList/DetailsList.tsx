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
import { Descriptions, Typography, Row, Col } from 'antd';
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
    const tmp_detail = { ...details };
    delete tmp_detail['id'];

    return (
        <>
            {groupTitle ? <Title level={5}>{t(`common:${groupTitle}`)}</Title> : <></>}
            <Descriptions
                style={
                    groupTitle ? { marginTop: '10px', marginBottom: '20px' } : { marginTop: '35px' }
                }
                column={2}
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
                        ) : key === 'logo' ? (
                            <img
                                src={details.logo}
                                alt="logo_image"
                                style={{ maxWidth: '5%', height: 'auto' }}
                            />
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
