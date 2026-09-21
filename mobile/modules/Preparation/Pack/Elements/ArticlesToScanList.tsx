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

import { BorderOutlined, CheckSquareFilled } from '@ant-design/icons';
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

const ArticleRow = styled.div<{ $scanned: boolean; $inProgress: boolean }>`
    display: flex;
    align-items: center;
    gap: 5px;
    height: 24px;
    margin: 2px 0;
    padding: 2px 4px;
    border-radius: 4px;
    text-align: left;
    border: 1px solid
        ${({ $scanned, $inProgress }) =>
            $inProgress ? '#f4a261' : $scanned ? '#b7eb8f' : '#d9d9d9'};
    background: ${({ $scanned, $inProgress }) =>
        $inProgress ? '#fffbe6' : $scanned ? '#f6ffed' : '#fafafa'};
`;

export interface IArticlesToScanListProps {
    // handlingUnitContentOutbounds of the box being controlled at the scanned position
    hucos: any[];
    // HUCO of the article currently being controlled (scanned at step 40), if any
    currentHucoId?: string;
    // quantity entered at step 50 but not yet validated by the backend, counted as scanned
    pendingQuantity?: number;
}

// Stacked list of the articles to control, checked off as they are scanned. Meant as an extra
// header slide of RadioHeadersCarousel, but standalone (only depends on its props).
const ArticlesToScanList: FC<IArticlesToScanListProps> = ({
    hucos,
    currentHucoId,
    pendingQuantity
}: IArticlesToScanListProps) => {
    const { t } = useTranslation();

    const items = useMemo(() => {
        const mapped = (hucos ?? []).map((huco: any) => {
            const pending =
                huco.id === currentHucoId && typeof pendingQuantity === 'number'
                    ? pendingQuantity
                    : 0;
            const doneQuantity = huco.pickedQuantity + huco.missingQuantity + pending;
            return {
                id: huco.id,
                // supplier reference, falling back to the article name when absent
                supplierRef: huco.article?.genericArticleComment ?? huco.article?.name,
                description: huco.article?.description,
                doneQuantity,
                quantityToBePicked: huco.quantityToBePicked,
                scanned: doneQuantity >= huco.quantityToBePicked,
                inProgress: huco.id === currentHucoId
            };
        });
        // articles left to scan on top (the one being controlled first), scanned ones at the
        // bottom; box order kept within each group (Array.sort is stable)
        const rank = (item: any) => (item.inProgress ? 0 : item.scanned ? 2 : 1);
        return mapped.sort((a, b) => rank(a) - rank(b));
    }, [hucos, currentHucoId, pendingQuantity]);

    const scannedCount = items.filter((item) => item.scanned).length;

    return (
        <ArticlesPanel>
            <Text strong style={{ fontSize: '11px' }}>
                {t('common:articles-to-scan')} {scannedCount}/{items.length}
            </Text>
            <ArticlesList>
                {items.map((item) => (
                    <ArticleRow key={item.id} $scanned={item.scanned} $inProgress={item.inProgress}>
                        {item.scanned ? (
                            <CheckSquareFilled style={{ color: '#52c41a', fontSize: '14px' }} />
                        ) : (
                            <BorderOutlined style={{ color: '#999999', fontSize: '14px' }} />
                        )}
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
                            {item.doneQuantity}/{item.quantityToBePicked}
                        </Text>
                    </ArticleRow>
                ))}
            </ArticlesList>
        </ArticlesPanel>
    );
};

ArticlesToScanList.displayName = 'ArticlesToScanList';

export { ArticlesToScanList };
