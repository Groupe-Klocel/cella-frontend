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
import { useTranslationWithFallback as useTranslation } from '@helpers';
import { Typography } from 'antd';
import { FC, useMemo } from 'react';
import styled from 'styled-components';

const { Text } = Typography;

const ArticlesPanel = styled.div`
    padding: 2px 5px;
    margin: 1px 5px;
    min-height: 80px;
    text-align: center;
`;

/* 5 rows of 24px (+ 2x2px margins) visible at most, the rest scrolls */
const ArticlesList = styled.div`
    max-height: 140px;
    max-width: 280px;
    min-width: 180px;
    margin: 0 auto;
    overflow-y: auto;
`;

const ArticleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    height: 24px;
    margin: 2px 0;
    padding: 2px 4px;
    border-radius: 4px;
    text-align: left;
    border: 1px solid #d9d9d9;
    background: #fafafa;
`;

export interface IBoxArticlesListProps {
    // handlingUnitContentOutbounds of the box being validated
    hucos: any[];
}

// Stacked list of every article of a box with its expected quantity, for the boxes validated
// without article-by-article control (box reached through its cart position barcode, resumed
// waiting-label box, control rule answering no control): nothing is scanned before the
// packaging/weight step, so the operator has otherwise no view of what the parcel holds. Same
// layout as ArticlesToScanList (control mode) without the scan check boxes. Meant as an extra
// header slide of RadioHeadersCarousel, but standalone (only depends on its props).
const BoxArticlesList: FC<IBoxArticlesListProps> = ({ hucos }: IBoxArticlesListProps) => {
    const { t } = useTranslation();

    const items = useMemo(
        () =>
            (hucos ?? []).map((huco: any) => ({
                id: huco.id,
                // supplier reference, falling back to the article name when absent
                supplierRef: huco.article?.genericArticleComment ?? huco.article?.name,
                description: huco.article?.description,
                quantityToBePicked: huco.quantityToBePicked ?? 0
            })),
        [hucos]
    );

    // total quantity expected in the box
    const expectedQuantity = items.reduce((total, item) => total + item.quantityToBePicked, 0);

    return (
        <ArticlesPanel>
            <Text strong style={{ fontSize: '11px' }}>
                {t('common:articles')} ({items.length}) - {t('common:quantity_abbr')}{' '}
                {expectedQuantity}
            </Text>
            <ArticlesList>
                {items.map((item) => (
                    <ArticleRow key={item.id}>
                        <Text strong style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                            {item.supplierRef}
                        </Text>
                        <Text
                            type="secondary"
                            style={{ fontSize: '10px', flex: 1, minWidth: 0 }}
                            ellipsis={{ tooltip: item.description }}
                        >
                            {item.description}
                        </Text>
                        <Text style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                            {item.quantityToBePicked}
                        </Text>
                    </ArticleRow>
                ))}
            </ArticlesList>
        </ArticlesPanel>
    );
};

BoxArticlesList.displayName = 'BoxArticlesList';

export { BoxArticlesList };
